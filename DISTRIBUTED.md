# Distributed Rate Limiting with Redis 🔴

When you have multiple servers, you need Redis for rate limiting.

## The Problem

### Without Redis (Single-Instance)
```
Request from user123:
  Server 1: Check rate limit → Count: 50 (allowed)
  Server 2: Check rate limit → Count: 50 (allowed)
  Server 3: Check rate limit → Count: 50 (allowed)
  
But user123 made 150 requests total! ❌
Each server only knows about its own requests.
```

### With Redis (Distributed)
```
Request from user123:
  Server 1: Check REDIS → Count: 50 (allowed)
  Server 2: Check REDIS → Count: 100 (allowed)
  Server 3: Check REDIS → Count: 150 (BLOCKED!)
  
All servers see the same count! ✅
Redis is the single source of truth.
```

## How It Works

### Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Server 1       │     │   Server 2       │     │   Server 3       │
│ Express App      │     │ Express App      │     │ Express App      │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                         │                         │
         │     Check count         │     Check count         │
         └────────────────┬────────┴────────────────┬────────┘
                          │                         │
                          ▼                         ▼
                    ┌─────────────────────────┐
                    │     Redis Cache         │
                    │  user123 → 150 requests │
                    │  user456 → 75  requests │
                    │  user789 → 10  requests │
                    └─────────────────────────┘
```

### Flow Diagram

```
User Request from any Server
         │
         ▼
┌────────────────────────┐
│ Check rate limit       │
│ Query Redis for count  │
└────────────┬───────────┘
             │
             ├─ Count < Limit? ─→ ✅ Allow
             │                     Increment Redis
             │                     Return 200
             │
             └─ Count >= Limit? → ❌ Block
                                   Return 429
```

## Redis Data Structures

### Token Bucket in Redis

```javascript
// Key: user:123:tokens
// Value: { tokens: 97.5, lastRefillTime: 1609459200 }

HSET user:123:tokens tokens 97.5
HSET user:123:tokens lastRefillTime 1609459200

// Get values
HGETALL user:123:tokens
→ { tokens: 97.5, lastRefillTime: 1609459200 }
```

### Sliding Window in Redis

```javascript
// Key: user:123:requests
// Value: Sorted set with timestamps

ZADD user:123:requests 1609459200000 "1"
ZADD user:123:requests 1609459201000 "2"
ZADD user:123:requests 1609459202000 "3"

// Get requests in last 60 seconds
ZRANGE user:123:requests 1609459140000 1609459200000

// Clean up old requests
ZREMRANGEBYSCORE user:123:requests 0 1609459140000
```

### Fixed Window in Redis

```javascript
// Key: window:123  (window ID)
// Value: counter

SET user:123:window:1 42

// Increment
INCR user:123:window:1

// Set expiry (auto-cleanup when window expires)
EXPIRE user:123:window:1 60
```

## Implementation Example

### Node.js with Redis

```javascript
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

class RedisTokenBucketLimiter {
  constructor(capacity, refillRatePerSecond) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.client = client;
  }

  async isAllowed(userId) {
    const now = Date.now();
    const key = `rate:${userId}`;

    // Get current bucket state
    const bucket = await this.client.hgetall(key);

    if (!bucket || !bucket.tokens) {
      // First request - initialize bucket
      const data = {
        tokens: this.capacity - 1,
        lastRefillTime: now
      };
      await this.client.hset(key, data);
      await this.client.expire(key, 3600); // Keep for 1 hour
      return true;
    }

    // Recalculate tokens
    const timePassed = (now - parseInt(bucket.lastRefillTime)) / 1000;
    const tokensToAdd = timePassed * this.refillRatePerSecond;
    const currentTokens = Math.min(
      parseFloat(bucket.tokens) + tokensToAdd,
      this.capacity
    );

    // Check if token available
    if (currentTokens >= 1) {
      const newTokens = currentTokens - 1;
      const data = {
        tokens: newTokens,
        lastRefillTime: now
      };
      await this.client.hset(key, data);
      return true;
    }

    return false;
  }
}

module.exports = RedisTokenBucketLimiter;
```

## Lua Scripting for Atomicity

Without Lua, you need multiple Redis calls which can race:

```javascript
// WRONG - Race condition!
const count = await client.get(key);        // Get
if (count < limit) {
  await client.incr(key);                    // Increment
  // What if another request incremented between get and incr?
}
```

### Correct Approach - Lua Script

```javascript
const lua = `
  local limit = tonumber(ARGV[1])
  local current = tonumber(redis.call('get', KEYS[1]) or 0)
  
  if current < limit then
    redis.call('incr', KEYS[1])
    redis.call('expire', KEYS[1], ARGV[2])
    return 1  -- allowed
  else
    return 0  -- blocked
  end
`;

const result = await client.eval(
  lua,
  1,                    // number of keys
  'rate:user123',       // key
  100,                  // limit
  60                    // ttl
);

return result === 1;
```

## Deployment Considerations

### 1. Redis Availability
```javascript
// Handle Redis connection loss
const limiter = new RateLimiter();

try {
  if (await limiter.isAllowed(userId)) {
    // Allow
  } else {
    return 429; // Rate limited
  }
} catch (error) {
  // Redis is down!
  // Option A: Allow all requests (risky)
  // Option B: Use fallback in-memory limiter (safer)
  // Option C: Return error (safe but impacts users)
}
```

### 2. Multiple Redis Instances (Sentinel)
```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  Redis 1    │───────│  Redis 2    │───────│  Redis 3    │
│ (Master)    │        │ (Replica)   │        │ (Replica)   │
└─────────────┘        └─────────────┘        └─────────────┘
     ▲
     │
 Sentinel monitors and handles failover
```

### 3. Redis Cluster (Sharding)
For very large scale (millions of users):
```
┌──────────────────────────────────────────────┐
│  Redis Cluster                                │
├──────────────┬──────────────┬──────────────┐
│  Shard 1     │  Shard 2     │  Shard 3     │
│  user:1-333  │  user:334-66 │  user:667-1k │
└──────────────┴──────────────┴──────────────┘
```

## Performance

### Single-Instance
```
Requests/sec: ~50,000
Latency: <1ms
Memory: ~100MB
```

### Redis-Based
```
Requests/sec: ~100,000+
Latency: 1-5ms (network)
Memory: Shared across servers
```

## Common Pitfalls

### 1. Clock Skew
Different servers have different times:
```javascript
// BAD - Different servers see different times
const windowStart = Math.floor(Date.now() / 10000) * 10000;

// GOOD - Use server time from Redis
const serverTime = await redis.time();
```

### 2. Race Conditions
```javascript
// BAD - Multiple calls to Redis
const count = await redis.get(key);
if (count < 100) {
  await redis.incr(key);  // RACE CONDITION!
}

// GOOD - Use Lua script (atomic)
const lua = `
  if tonumber(redis.call('get', KEYS[1]) or 0) < 100 then
    redis.call('incr', KEYS[1])
    return 1
  else
    return 0
  end
`;
```

### 3. Key Expiration
```javascript
// BAD - Keys never expire, Redis fills up
await redis.set('rate:user:123', 42);

// GOOD - Set expiration
await redis.set('rate:user:123', 42, 'EX', 3600);
// or
await redis.expire('rate:user:123', 3600);
```

## When to Use Distributed Rate Limiting

✅ **Use Redis when:**
- Multiple servers/instances
- High traffic (>10K req/sec)
- Need exact, shared limits
- Running in Kubernetes/cloud with multiple pods

❌ **Don't need Redis if:**
- Single server
- Low traffic
- Approximate limits okay
- Edge computing (servers are isolated)

## Monitoring

```javascript
// Track rate limit violations
const violations = await redis.incr('violations:count');
const limited = await redis.incr(`limited:user:${userId}`);

// Set up alerts
if (violations > 1000 / 60) {
  // Alert: >1000 violations per minute
  sendAlert('Rate limit violations spiking!');
}
```

---

## Next Steps

- 📖 Study Lua scripting for atomic operations
- 🔴 Install and run Redis locally
- 🔌 Connect to Redis from Node.js
- 🧪 Implement distributed token bucket
- 📊 Monitor and optimize performance
- 🚀 Deploy to production

---

This is **Phase 2** of your learning journey! Master the basics first, then move to Redis-based distributed rate limiting.
