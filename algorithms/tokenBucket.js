/**
 * TOKEN BUCKET ALGORITHM
 *
 * How it works:
 * - Imagine a bucket that holds tokens (max = limit)
 * - Tokens are ADDED at a REFILL RATE (e.g., 100 tokens/minute)
 * - Each request COSTS 1 TOKEN
 * - If bucket has tokens, request allowed (take 1 token); else blocked
 * - Bucket never exceeds max capacity
 *
 * Visual:
 * Bucket capacity: 100 tokens
 * Refill rate: 100 tokens/minute (= 1.67 tokens/second)
 *
 * Time 0:00 → Bucket full: 100 tokens
 * User makes 1 request → 99 tokens left
 * Time 0:01 → +1.67 tokens ≈ 100.67 → capped at 100
 * Time 0:30 → User makes 50 requests
 *   Bucket: 100 - 50 = 50 tokens left
 *   Remaining time in minute: 30s
 *   Will gain: 1.67 * 30 = 50 tokens
 *   Total after minute: 50 + 50 = 100 ✅ (back to full)
 */

class TokenBucketRateLimiter {
  /**
   * Initialize the rate limiter
   * @param {number} capacity - Maximum tokens in bucket
   * @param {number} refillRatePerSecond - Tokens added per second
   *
   * Example 1 - 100 requests per 60 seconds:
   * new TokenBucketRateLimiter(100, 100/60)
   *   = 100 tokens, refill at 1.67 tokens/second
   *
   * Example 2 - 10 requests per second:
   * new TokenBucketRateLimiter(10, 10)
   *   = 10 tokens, refill at 10 tokens/second
   */
  constructor(capacity, refillRatePerSecond) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;

    // Store: { userId -> { tokens: number, lastRefillTime: number } }
    this.storage = new Map();
  }

  /**
   * Check if a request is allowed for a given user/key
   * @param {string} key - Unique identifier (user ID, IP, API key, etc.)
   * @returns {boolean} - true if allowed, false if rate limited
   */
  isAllowed(key) {
    const now = Date.now();

    // Get or create bucket for this user
    let bucket = this.storage.get(key);

    if (!bucket) {
      // First request from this user - start with full bucket
      bucket = {
        tokens: this.capacity,
        lastRefillTime: now
      };
    } else {
      // Calculate how many tokens to add since last refill
      const timePassed = (now - bucket.lastRefillTime) / 1000; // Convert to seconds
      const tokensToAdd = timePassed * this.refillRatePerSecond;

      // Add tokens but don't exceed capacity
      bucket.tokens = Math.min(bucket.tokens + tokensToAdd, this.capacity);
      bucket.lastRefillTime = now;
    }

    // Check if we have a token for this request
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1; // Take 1 token
      this.storage.set(key, bucket);
      return true; // Allow request
    }

    // No tokens available
    this.storage.set(key, bucket);
    return false; // Block request
  }

  /**
   * Get current token count for a user
   * @param {string} key - Unique identifier
   * @returns {number} - Current token count
   */
  getTokenCount(key) {
    const now = Date.now();
    let bucket = this.storage.get(key);

    if (!bucket) {
      return this.capacity; // New user = full bucket
    }

    // Recalculate current tokens without modifying storage
    const timePassed = (now - bucket.lastRefillTime) / 1000;
    const tokensToAdd = timePassed * this.refillRatePerSecond;
    const currentTokens = Math.min(bucket.tokens + tokensToAdd, this.capacity);

    return currentTokens;
  }

  /**
   * Get time until next token is available (in milliseconds)
   * Useful for telling client when to retry
   * @param {string} key - Unique identifier
   * @returns {number} - Milliseconds until next token available
   */
  getTimeUntilTokenAvailable(key) {
    const currentTokens = this.getTokenCount(key);

    // If tokens available, return 0
    if (currentTokens >= 1) {
      return 0;
    }

    // Calculate time for 1 token to be added
    // 1 token / (refillRatePerSecond) * 1000 milliseconds
    const timePerToken = (1 / this.refillRatePerSecond) * 1000;
    return Math.ceil(timePerToken);
  }

  /**
   * Reset a specific user's bucket
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.storage.delete(key);
  }

  /**
   * Reset all buckets
   */
  resetAll() {
    this.storage.clear();
  }

  /**
   * Get stats for monitoring
   * @returns {object} - Stats about current state
   */
  getStats() {
    const now = Date.now();

    return {
      algorithm: 'Token Bucket',
      capacity: this.capacity,
      refillRatePerSecond: this.refillRatePerSecond,
      refillRatePerMinute: (this.refillRatePerSecond * 60).toFixed(2),
      trackingUsers: this.storage.size,
      details: Array.from(this.storage.entries()).map(([key, bucket]) => {
        const timePassed = (now - bucket.lastRefillTime) / 1000;
        const tokensToAdd = timePassed * this.refillRatePerSecond;
        const currentTokens = Math.min(bucket.tokens + tokensToAdd, this.capacity);

        return {
          key,
          currentTokens: currentTokens.toFixed(2),
          capacity: this.capacity,
          tokensUntilFull: (this.capacity - currentTokens).toFixed(2),
          lastRefillTime: new Date(bucket.lastRefillTime)
        };
      })
    };
  }
}

module.exports = TokenBucketRateLimiter;
