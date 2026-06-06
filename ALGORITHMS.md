# Detailed Algorithm Explanations 📚

Complete technical reference for all rate limiting algorithms.

## Table of Contents
1. [Fixed Window Counter](#fixed-window-counter)
2. [Sliding Window Log](#sliding-window-log)
3. [Token Bucket](#token-bucket)
4. [Comparison Table](#comparison-table)

---

## Fixed Window Counter

### What It Is
Divide time into equal-sized buckets and count requests in the current bucket.

### How It Works Step-by-Step

```
1. Determine current window
   Current time: 65 seconds
   Window size: 60 seconds
   Window #: Math.floor(65/60) = 1
   Window start: 1 * 60 = 60 seconds

2. Get counter for this window
   If (user, window) exists: get count
   Else: count = 0

3. Check if request allowed
   If count < limit: 
     count++ 
     return true ✅
   Else:
     return false ❌

4. Window expires
   When we move to next window, counter resets
```

### Visual Timeline

```
Time:        0s          60s          120s         180s
             |-----------|-----------|-----------|
Window 1:    [Count: 0]
             ↓
             Make 3 requests
             [Count: 3]
             ↓
             Make 50 more requests
             [Count: 53]

At 60.1s, we move to Window 2:
Window 2:    [Count: 0]  ← Counter resets!
```

### Code Walkthrough

```javascript
function isAllowed(userId, limit, windowSizeMs):
  now = Date.now()                                    // 65000ms
  windowStart = Math.floor(now / windowSizeMs) * windowSizeMs
                                                     // 60000ms
  
  bucket = storage.get(userId) || new Bucket()
  
  if bucket.windowStart !== windowStart:
    bucket = { windowStart: windowStart, count: 0 }  // New window
  
  if bucket.count < limit:
    bucket.count++                                   // Increment
    return true
  else:
    return false
```

### Pros ✅
- **Simple:** Easy to understand and implement
- **Fast:** O(1) time complexity
- **Low Memory:** Only stores one count per user
- **Predictable:** Limits are hard (never exceeds)

### Cons ❌
- **Boundary Problem:** Can allow double the limit in short time
- **Spiky:** All users get requests at window boundary
- **No Smoothing:** Allows burst traffic

### Boundary Problem Explained

```
Limit: 100 requests per minute
Window: [0-60s], [60-120s], etc.

User makes requests like this:
  [0-60s]    → 100 requests ✅ (allowed, at limit)
  [60-120s]  → 100 requests ✅ (new window, count resets!)
  
Total: 200 requests in 2 seconds!
But each window only has 100, so it looks okay.
This is the BOUNDARY PROBLEM. ❌
```

### When to Use
- Learning/educational purposes
- Simple APIs with low traffic
- When fixed boundaries are acceptable
- Memory-constrained systems

---

## Sliding Window Log

### What It Is
Keep a log of ALL request timestamps and check if requests fall within the window.

### How It Works Step-by-Step

```
1. Get current time
   now = 65000ms

2. Get all request timestamps
   timestamps = [1000, 5000, 10000, 20000, 60000, 65000]

3. Remove old timestamps (outside window)
   window = now - windowSize = 65000 - 60000 = 5000
   keep only: timestamp > 5000
   filtered = [10000, 20000, 60000, 65000]

4. Check count
   If filtered.length < limit:
     filtered.push(now)  // Add current request
     return true ✅
   Else:
     return false ❌
```

### Visual Timeline

```
Current time: 65000ms (65 seconds)
Window: last 60 seconds [5000ms - 65000ms]

Timestamps for user:
1000ms   ❌ (outside window - 64s ago)
5000ms   ❌ (outside window - 60s ago, boundary)
10000ms  ✅ (inside window - 55s ago)
20000ms  ✅ (inside window - 45s ago)
30000ms  ✅ (inside window - 35s ago)
50000ms  ✅ (inside window - 15s ago)
60000ms  ✅ (inside window - 5s ago)
65000ms  ✅ (now)

Count: 6 requests (< 100 limit)
✅ New request allowed, add 65000ms to log
```

### Code Walkthrough

```javascript
function isAllowed(userId, limit, windowSizeMs):
  now = Date.now()
  windowStart = now - windowSizeMs
  
  timestamps = storage.get(userId) || []
  
  // Filter to only valid timestamps
  timestamps = timestamps.filter(t => t > windowStart)
  
  if timestamps.length < limit:
    timestamps.push(now)           // Add new timestamp
    storage.set(userId, timestamps)
    return true
  else:
    return false
```

### Pros ✅
- **Accurate:** No boundary problem
- **Precise:** Exact timestamp tracking
- **Fair:** Treats all requests equally
- **History:** Can see exactly when requests happened

### Cons ❌
- **Memory Heavy:** Stores EVERY timestamp
- **Slow:** Must check all timestamps each request
- **Cleanup:** Need to remove old timestamps periodically
- **Not scalable:** 1 million req/sec = 60 million timestamps in memory!

### Memory Example

```
10 users, 100 requests each per minute:
  10 users × 60 timestamps = 600 timestamps in memory
  Per timestamp: ~20 bytes = ~12 KB

1000 users, 1000 requests each per minute:
  1000 × 1000 × ~20 bytes = ~20 MB

10,000 users, 1000 requests each per minute:
  10,000 × 1000 × ~20 bytes = ~200 MB

This grows linearly with traffic!
```

### When to Use
- When accuracy is critical
- Audit/logging scenarios
- Moderate traffic APIs (<1000 req/sec)
- When you need exact request history

---

## Token Bucket

### What It Is
A bucket that holds "tokens". Refill at a constant rate. Each request costs 1 token.

### How It Works Step-by-Step

```
1. Initialize bucket
   tokens = capacity (e.g., 100)
   lastRefillTime = now
   capacityMax = 100
   refillRate = 1.67 tokens/second

2. When request comes
   now = current time
   timePassed = (now - lastRefillTime) / 1000  // seconds
   tokensToAdd = timePassed × refillRate

3. Add tokens (but don't exceed capacity)
   tokens = min(tokens + tokensToAdd, capacityMax)
   lastRefillTime = now

4. Check if tokens available
   If tokens >= 1:
     tokens -= 1                    // Use 1 token
     return true ✅
   Else:
     return false ❌
```

### Visual Example

```
Capacity: 100 tokens
Refill Rate: 100 tokens/minute = 1.67 tokens/second

Time 0:00:00
┌──────────────────────────────────────┐
│ 🪣 Bucket: 100/100 tokens           │
└──────────────────────────────────────┘
  User makes 3 requests
┌──────────────────────────────────────┐
│ 🪣 Bucket: 97/100 tokens            │
└──────────────────────────────────────┘

Time 0:01:00 (1 second passed)
  +1.67 tokens automatically added
┌──────────────────────────────────────┐
│ 🪣 Bucket: 98.67/100 tokens         │
└──────────────────────────────────────┘

Time 0:30:00 (30 seconds with no requests)
  +1.67 * 30 = 50 tokens added
  But cap at 100
┌──────────────────────────────────────┐
│ 🪣 Bucket: 100/100 tokens (full)    │
└──────────────────────────────────────┘
```

### Burst Handling

```
Refill rate: 1 token/second
Capacity: 10 tokens

User A: Idle for 10 seconds
  Accumulated tokens: 10 (full bucket)
  
Then makes 8 requests in 1 second:
  Uses 8 tokens, 2 remain
  
This BURST is allowed because tokens accumulated.
Next second, refills 1 more token.

Result: Smooth traffic, but allows temporary bursts.
```

### Code Walkthrough

```javascript
function isAllowed(userId, capacity, refillRatePerSecond):
  now = Date.now()
  
  bucket = storage.get(userId)
  if !bucket:
    bucket = { tokens: capacity, lastRefillTime: now }
  
  // Calculate tokens to add
  timePassed = (now - bucket.lastRefillTime) / 1000
  tokensToAdd = timePassed × refillRatePerSecond
  
  // Add tokens but cap at capacity
  bucket.tokens = min(bucket.tokens + tokensToAdd, capacity)
  bucket.lastRefillTime = now
  
  if bucket.tokens >= 1:
    bucket.tokens -= 1
    storage.set(userId, bucket)
    return true
  else:
    storage.set(userId, bucket)
    return false
```

### Pros ✅
- **Smooth:** No boundary problems or spikes
- **Bursts:** Allows temporary high traffic
- **Fair:** Treats all users equally
- **Efficient:** Low memory usage
- **Practical:** Works well in real systems
- **Retry Info:** Can calculate when next token available

### Cons ❌
- **Slightly complex:** More logic than fixed window
- **Floating point:** Need to handle decimal tokens
- **Tuning:** Must choose right capacity and refill rate

### Refill Rate Calculation

```
Want: 100 requests per 60 seconds

Option 1: Refill rate
  100 tokens / 60 seconds = 1.67 tokens/second

Option 2: Using as capacity
  Capacity: 100
  Refill rate: 1.67 tokens/second

How to use:
  const limiter = new TokenBucketRateLimiter(100, 100/60);
```

### When to Use
- Production APIs (most common choice!)
- High-traffic systems
- When bursts are acceptable
- When you need to tell clients when to retry
- Public APIs (GitHub, Twitter, etc. use this)

---

## Comparison Table

| Aspect | Fixed Window | Sliding Window | Token Bucket |
|--------|--------------|----------------|--------------|
| **Accuracy** | ❌ Poor (boundary issue) | ✅ Perfect | ✅ Very Good |
| **Memory** | ✅ Minimal | ❌ High | ✅ Minimal |
| **Speed** | ✅ O(1) | ⚠️ O(n) | ✅ O(1) |
| **Bursts** | ❌ Spiky | ❌ Blocked | ✅ Allowed |
| **Smoothness** | ❌ No | ✅ Yes | ✅ Yes |
| **Complexity** | ✅ Simple | ⚠️ Medium | ⚠️ Medium |
| **Best For** | Learning | Precise limits | Production |
| **Traffic** | Low | Moderate | Any |
| **Scalability** | ✅ Excellent | ❌ Poor | ✅ Excellent |

---

## Real-World Examples

### GitHub API
Uses Token Bucket (per minute limits)
```
Unauthenticated: 60 requests/hour
Authenticated: 5000 requests/hour
```

### Twitter API
Uses Token Bucket
```
Tweet creation: 300 requests/3 hours
User timeline: 300 requests/15 minutes
```

### Google Cloud APIs
Uses Sliding Window (accurate accounting)
```
Compute: 20 requests/second
Storage: 1000 requests/second
```

---

## Choosing an Algorithm

```
START
  ↓
Is accuracy critical?
  ├─ YES → Sliding Window
  └─ NO → Continue
  ↓
Is traffic high (>1000 req/sec)?
  ├─ YES → Token Bucket
  └─ NO → Continue
  ↓
Are bursts acceptable?
  ├─ YES → Token Bucket
  └─ NO → Fixed Window
```

---

## Implementation Checklist

- [ ] Choose algorithm based on use case
- [ ] Decide on limit (requests) and window (seconds)
- [ ] Pick identifier (user ID, IP, API key)
- [ ] Return 429 status code when limited
- [ ] Set X-RateLimit-* headers in response
- [ ] Tell client when to retry (Retry-After)
- [ ] Monitor rate limit violations
- [ ] Test boundary conditions
- [ ] Consider Redis for distributed systems

Happy learning! 🎉
