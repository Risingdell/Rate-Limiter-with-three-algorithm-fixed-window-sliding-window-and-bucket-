# Quick Start Guide 🚀

## Installation

```bash
# Install dependencies
npm install
```

## Run Examples

### Example 1: Fixed Window (Simple)
```bash
node examples/fixed-window-example.js
```
**What you'll learn:**
- How fixed window counting works
- When requests get blocked
- The "boundary problem"

### Example 2: Sliding Window (Accurate)
```bash
node examples/sliding-window-example.js
```
**What you'll learn:**
- How sliding window fixes the boundary problem
- Request history tracking
- More memory usage

### Example 3: Token Bucket (Production)
```bash
node examples/token-bucket-example.js
```
**What you'll learn:**
- How tokens accumulate over time
- Burst handling
- How to tell clients when to retry

### Example 4: Compare All 3
```bash
node examples/compare-all.js
```
**What you'll learn:**
- Pros and cons of each algorithm
- When to use which one
- Side-by-side comparison

### Example 5: Express.js Integration
```bash
node examples/express-middleware.js
```
Then open: `http://localhost:3000/api/data`

**What you'll learn:**
- Using rate limiter in a real web framework
- Proper HTTP status codes
- Response headers (X-RateLimit-*)
- Retry information

## Run Tests

```bash
npm test
```

Tests verify all 3 algorithms work correctly.

## Basic Usage

### Fixed Window
```javascript
const FixedWindowRateLimiter = require('./algorithms/fixedWindow');

const limiter = new FixedWindowRateLimiter(
  100,    // 100 requests allowed
  60000   // per 60 seconds
);

if (limiter.isAllowed('user:123')) {
  // Process request
  console.log('✅ Request allowed');
} else {
  // Reject request
  console.log('❌ Rate limit exceeded');
}
```

### Sliding Window
```javascript
const SlidingWindowRateLimiter = require('./algorithms/slidingWindow');

const limiter = new SlidingWindowRateLimiter(
  100,    // 100 requests allowed
  60000   // per 60 seconds (sliding)
);

if (limiter.isAllowed('user:123')) {
  console.log('✅ Request allowed');
} else {
  console.log('❌ Rate limit exceeded');
}
```

### Token Bucket
```javascript
const TokenBucketRateLimiter = require('./algorithms/tokenBucket');

const limiter = new TokenBucketRateLimiter(
  100,        // 100 tokens capacity
  100 / 60    // refill at 100 tokens per 60 seconds
);

if (limiter.isAllowed('user:123')) {
  console.log('✅ Request allowed');
} else {
  // Get time until token available
  const waitMs = limiter.getTimeUntilTokenAvailable('user:123');
  console.log(`❌ Rate limit exceeded. Retry in ${waitMs}ms`);
}
```

## Common Patterns

### 1. API Endpoint Protection
```javascript
app.get('/api/data', (req, res) => {
  if (!limiter.isAllowed(req.user.id)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  // Process request
});
```

### 2. Multiple Limits (Per User + Global)
```javascript
const userLimiter = new TokenBucketRateLimiter(100, 100/60);  // per user
const globalLimiter = new TokenBucketRateLimiter(10000, 10000/60); // global

if (!userLimiter.isAllowed(userId) || !globalLimiter.isAllowed('global')) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### 3. Tiered Rate Limits
```javascript
const limits = {
  'free': new TokenBucketRateLimiter(100, 100/3600),      // 100/hour
  'pro': new TokenBucketRateLimiter(10000, 10000/3600),   // 10K/hour
  'enterprise': new TokenBucketRateLimiter(100000, 100000/3600) // 100K/hour
};

const userTier = getUserTier(userId);
const limiter = limits[userTier];
```

### 4. Response Headers
```javascript
const remaining = Math.floor(limiter.getTokenCount(userId));
res.set({
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': remaining.toString(),
  'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
});
```

## Key Concepts

### Rate Limit Limit
Maximum requests in time window

### Window/Bucket
Time period for counting requests

### Key/Identifier
Who we're rate limiting (user ID, IP, API key)

### Status Code
Always return **429 Too Many Requests** when rate limited

### Retry-After Header
Tell client when to retry

## Learning Path

1. **Start here:** Read the README.md (detailed explanations)
2. **Run examples:** Fixed → Sliding → Token → Compare
3. **Study code:** Look at algorithm implementations
4. **Run tests:** npm test (verify understanding)
5. **Build:** Create your own endpoints using rate limiters
6. **Next:** Learn about Redis-based distributed rate limiting

## FAQ

**Q: Which algorithm should I use?**
A: Token Bucket for most cases (smooth, allows bursts, efficient)

**Q: Why do I need rate limiting?**
A: Prevent abuse, protect resources, ensure fair access

**Q: What if I have multiple servers?**
A: You need Redis-based distributed rate limiting (Phase 2)

**Q: How do I rate limit by IP vs User ID?**
A: Pass different keys: `req.ip` or `req.user.id`

**Q: Can I have different limits for different endpoints?**
A: Yes! Create different limiters for each endpoint

## Next Steps

- 🏗️ Build a real API with rate limiting
- 🗄️ Learn about Redis-based distributed rate limiting
- 📊 Implement monitoring/metrics
- 🔐 Learn about DDoS protection
- 🎓 Study other algorithms (leaky bucket, etc.)

Happy learning! 🎉
