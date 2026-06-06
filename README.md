# Rate Limiter Learning Guide 🚀

A complete beginner-friendly guide to understanding and building rate limiters in Node.js. Learn by doing!

## 📚 Table of Contents
1. [What is Rate Limiting?](#what-is-rate-limiting)
2. [Why Do We Need Rate Limiters?](#why-do-we-need-rate-limiters)
3. [Core Concepts](#core-concepts)
4. [Algorithms Explained](#algorithms-explained)
5. [Implementation](#implementation)
6. [Examples](#examples)
7. [Real-World Use Cases](#real-world-use-cases)

---

## What is Rate Limiting?

**Simple Definition:** Rate limiting is like a bouncer at a club. The bouncer controls how many people enter per minute to avoid overcrowding.

**In Programming:** Rate limiting controls how many requests a user/client can make to an API within a specific time period.

### Real-World Example
- Imagine a Twitter API that allows **100 tweets per hour** per user
- User A makes 50 tweets ✅ (allowed)
- User A tries to make 51st tweet ✅ (allowed, 100 total)
- User A tries to make 101st tweet ❌ (blocked - rate limit exceeded)
- Wait 1 hour, counter resets ✅ (can tweet again)

---

## Why Do We Need Rate Limiters?

### 1. **Prevent Abuse**
- Stop hackers from trying 10,000 password combinations per second
- Prevent spam bots from flooding your API

### 2. **Fair Resource Usage**
- One user shouldn't consume all server resources
- Ensures everyone gets fair access

### 3. **Protect Backend Services**
- Your database can only handle 1,000 requests/second
- Rate limiter queues/rejects requests above that
- Prevents server crashes from sudden traffic spikes

### 4. **Save Money**
- You pay per database query/API call
- Rate limiter prevents expensive resource waste

### Visual Example:
```
WITHOUT Rate Limiter:
User A: 1000 requests → Database crashes ❌

WITH Rate Limiter:
User A: 100 requests ✅ → Database: 100 queries ✅
User A: 101st request ❌ → "Rate limit exceeded" message
```

---

## Core Concepts

### 1. **Time Window**
A period of time during which requests are counted.

```
Fixed Window (1 minute):
[0-60s] [60-120s] [180-240s]
  ↓
Each window is independent
```

### 2. **Request Limit**
Maximum requests allowed in a time window.

```
Example: 100 requests per 60 seconds
= 100 req/min
```

### 3. **Key/Identifier**
Who are we rate limiting? (user ID, IP address, API key, etc.)

```
Example:
- "user:123" → User ID 123
- "ip:192.168.1.1" → Someone from this IP
- "api_key:abc123" → API key abc123
```

### 4. **Counter**
How many requests have been made in the current window?

```
"user:123" → 45 requests (out of 100 limit)
"user:456" → 98 requests (out of 100 limit)
```

---

## Algorithms Explained

### Algorithm 1: Fixed Window Counter ⏱️

**How It Works:**
1. Divide time into fixed buckets (e.g., every 60 seconds)
2. Count requests in current bucket
3. If count < limit, allow; else block
4. When bucket expires, reset counter

**Visual:**
```
Time: 0s ────────→ 60s ────────→ 120s ────────→ 180s
Window 1: [42/100]  Window 2: [87/100]  Window 3: [5/100]
          ✅Allow                ✅Allow           ✅Allow

At 61s: Window 1 expires, counter resets to 0
```

**Pseudo Code:**
```
function isAllowed(userId, limit):
  currentBucket = getCurrentTimeBucket()  // e.g., 12:00-12:01
  
  // Check how many requests this user made in this bucket
  count = getRequestCount(userId, currentBucket)
  
  if count < limit:
    incrementRequestCount(userId, currentBucket)
    return true  // Allow request
  else:
    return false  // Block request - rate limit exceeded
```

**Pros:**
- ✅ Very simple to understand
- ✅ Fast performance
- ✅ Low memory usage

**Cons:**
- ❌ **Edge case problem:** What if user makes 100 requests at 11:59:50 and 100 more at 12:00:10?
  - They made 200 requests in 20 seconds total (should be limited to 100/min)
  - But both windows only had 100 requests each, so it seems fine
  - This is the **"boundary problem"**

**When to use:**
- Simple APIs
- Less strict rate limiting needed
- Learning/educational purposes

---

### Algorithm 2: Sliding Window Log 📜

**How It Works:**
1. Keep a **log** of all request timestamps for each user
2. When new request comes, check timestamps from last X seconds
3. Count requests in that window
4. If count < limit, add new timestamp and allow; else block
5. Remove old timestamps outside the window

**Visual:**
```
Current time: 12:00:45
Window: last 60 seconds [12:00:45 - 60s = 11:59:45 to 12:00:45]

Timestamps for user:123:
11:59:30 ✅ (within window)
11:59:40 ✅ (within window)
12:00:10 ✅ (within window)
12:00:35 ✅ (within window)
12:00:20 ✅ (within window)

New request at 12:00:45:
Count = 5 requests (< 100 limit)
✅ ALLOWED - Add timestamp 12:00:45
```

**Pseudo Code:**
```
function isAllowed(userId, limit):
  now = getCurrentTime()
  windowStart = now - 60 seconds
  
  // Get all request timestamps for this user
  timestamps = getTimestamps(userId)
  
  // Remove old timestamps outside window
  timestamps = filter(timestamps where timestamp > windowStart)
  
  if timestamps.length < limit:
    timestamps.push(now)  // Add current request
    saveTimestamps(userId, timestamps)
    return true  // Allow
  else:
    return false  // Block - rate limit exceeded
```

**Pros:**
- ✅ No boundary problem (accurate)
- ✅ Can see exactly when requests were made

**Cons:**
- ❌ Uses more memory (store every timestamp)
- ❌ Slower (must check all timestamps each request)
- ❌ Not good for very high traffic (millions of requests/sec)

**When to use:**
- When accuracy is important
- Moderate traffic APIs
- When you need to know request patterns

---

### Algorithm 3: Token Bucket 🪣

**How It Works:**
1. Imagine a bucket that holds tokens (max = limit)
2. Tokens are added at a **refill rate** (e.g., 100 tokens/minute)
3. Each request costs **1 token**
4. If bucket has tokens, request allowed (take 1 token); else blocked
5. Bucket never exceeds max capacity

**Visual:**
```
Bucket capacity: 100 tokens
Refill rate: 100 tokens/minute (= 1.67 tokens/second)

Time 0:00 → Bucket full: 100 tokens
User makes 1 request → 99 tokens left

Time 0:01 → +1.67 tokens ≈ 100.67 → capped at 100

Time 0:30 → User makes 50 requests
  Bucket: 100 - 50 = 50 tokens left
  Remaining time in minute: 30s
  Will gain: 1.67 * 30 = 50 tokens
  Total after minute: 50 + 50 = 100 ✅ (back to full)
```

**Why It's Called "Token Bucket":**
- Like a bucket that holds tokens (numbers)
- You take tokens out when making requests
- Water (tokens) slowly fills bucket over time

**Pseudo Code:**
```
function isAllowed(userId, limit, refillRate):
  now = getCurrentTime()
  bucket = getBucket(userId)
  
  // Calculate how many tokens to add since last refill
  timePassed = now - bucket.lastRefillTime
  tokensToAdd = timePassed * refillRate
  
  // Add tokens but don't exceed capacity
  bucket.tokens = min(bucket.tokens + tokensToAdd, limit)
  bucket.lastRefillTime = now
  
  if bucket.tokens >= 1:
    bucket.tokens -= 1  // Take 1 token for this request
    saveBucket(userId, bucket)
    return true  // Allow
  else:
    return false  // Block - no tokens left
```

**Pros:**
- ✅ Allows bursts (can use accumulated tokens)
- ✅ Smooth traffic rate
- ✅ Efficient memory usage
- ✅ Good for real-world APIs

**Cons:**
- ❌ Slightly more complex logic
- ❌ Need to track last refill time

**When to use:**
- Production APIs
- When bursts are acceptable
- Most real-world scenarios

---

## Implementation

### Project Structure
```
rate-limiter/
├── README.md (this file)
├── package.json
├── algorithms/
│   ├── fixedWindow.js
│   ├── slidingWindow.js
│   └── tokenBucket.js
├── examples/
│   ├── basic-example.js
│   └── express-middleware.js
├── tests/
│   └── test.js
└── utils/
    └── helpers.js
```

### Quick Start
```bash
# Install dependencies
npm install

# Run examples
node examples/basic-example.js

# Run tests
npm test
```

---

## Examples

### Example 1: Fixed Window Rate Limiter
```javascript
// Create a rate limiter: 100 requests per 60 seconds
const limiter = new FixedWindowRateLimiter(100, 60000);

// Check if user 123 can make a request
if (limiter.isAllowed('user:123')) {
  console.log('✅ Request allowed');
} else {
  console.log('❌ Rate limit exceeded');
}
```

### Example 2: Using with Express (Web Framework)
```javascript
const express = require('express');
const app = express();
const rateLimiter = new FixedWindowRateLimiter(10, 60000); // 10 req/min

// Middleware to check rate limit
app.use((req, res, next) => {
  const userId = req.user.id || req.ip;
  
  if (rateLimiter.isAllowed(userId)) {
    next(); // Allow request to proceed
  } else {
    res.status(429).json({ error: 'Rate limit exceeded' }); // 429 = Too Many Requests
  }
});

app.get('/api/data', (req, res) => {
  res.json({ data: 'some data' });
});
```

### Example 3: Comparing All 3 Algorithms
```javascript
const fixed = new FixedWindowRateLimiter(100, 60000);
const sliding = new SlidingWindowRateLimiter(100, 60000);
const token = new TokenBucketLimiter(100, 60000);

// All three limit to 100 requests per minute
// But they behave differently...
```

---

## Real-World Use Cases

### 1. API Rate Limiting
```
GitHub API: 60 requests/hour (unauthenticated)
             5000 requests/hour (authenticated)
```

### 2. Login Protection
```
Allow: 5 failed login attempts per 15 minutes
Block: Temporary account lockout after threshold
```

### 3. DDoS Protection
```
Block IPs making 1000+ requests/second
Automatic blacklist for 1 hour
```

### 4. Fair Quota System
```
Free tier: 1000 API calls/day
Pro tier: 100,000 API calls/day
```

---

## When to Move to Distributed (Redis)

When you have **multiple servers**, you need Redis because:

### Problem Without Redis:
```
Server 1: User A makes 50 requests
Server 2: User A makes 50 requests
Server 3: User A makes 50 requests

Each server thinks User A made 50 requests ✅
But User A actually made 150 requests total ❌
```

### Solution With Redis:
```
Server 1: Check Redis → User A: 50 requests
Server 2: Check Redis → User A: 100 requests
Server 3: Check Redis → User A: 150 requests

All servers share one source of truth ✅
```

We'll implement Redis-based rate limiting in Phase 2!

---

## Key Takeaways

✅ **Rate limiting = controlling request frequency**

✅ **3 main algorithms, each with trade-offs:**
- Fixed Window: Simple but inaccurate
- Sliding Window: Accurate but memory-heavy
- Token Bucket: Flexible and efficient

✅ **Use in-memory for single server**

✅ **Use Redis for multiple servers**

✅ **Always return 429 status code when rate limited**

---

Next: Let's implement all three algorithms! 🎉
