/**
 * FIXED WINDOW COUNTER ALGORITHM
 *
 * How it works:
 * - Divide time into fixed buckets (e.g., every 60 seconds)
 * - Count requests in current bucket
 * - If count < limit, allow; else block
 * - When bucket expires, reset counter
 *
 * Visual:
 * Time: 0s ────────→ 60s ────────→ 120s ────────→ 180s
 * Window 1: [42/100]  Window 2: [87/100]  Window 3: [5/100]
 */

class FixedWindowRateLimiter {
  /**
   * Initialize the rate limiter
   * @param {number} limit - Max requests allowed per window
   * @param {number} windowSizeMs - Window size in milliseconds
   *
   * Example:
   * new FixedWindowRateLimiter(100, 60000)
   *   = 100 requests per 60 seconds
   */
  constructor(limit, windowSizeMs) {
    this.limit = limit;
    this.windowSizeMs = windowSizeMs;

    // Store: { userId -> { windowStart: number, count: number } }
    this.storage = new Map();
  }

  /**
   * Check if a request is allowed for a given user/key
   * @param {string} key - Unique identifier (user ID, IP, API key, etc.)
   * @returns {boolean} - true if allowed, false if rate limited
   */
  isAllowed(key) {
    const now = Date.now();

    // Calculate which window we're in
    // Example: If window is 60s and now is 65s:
    //   windowStart = Math.floor(65 / 60) * 60 = 60
    const windowStart = Math.floor(now / this.windowSizeMs) * this.windowSizeMs;

    // Get current bucket info for this user
    let bucket = this.storage.get(key);

    // If bucket doesn't exist or belongs to old window, create new one
    if (!bucket || bucket.windowStart !== windowStart) {
      bucket = {
        windowStart: windowStart,
        count: 0
      };
      this.storage.set(key, bucket);
    }

    // Check if request is within limit
    if (bucket.count < this.limit) {
      bucket.count++;
      return true; // Allow request
    }

    return false; // Block request - limit exceeded
  }

  /**
   * Get current request count for debugging/monitoring
   * @param {string} key - Unique identifier
   * @returns {number} - Current request count
   */
  getCount(key) {
    const bucket = this.storage.get(key);
    return bucket ? bucket.count : 0;
  }

  /**
   * Reset a specific user's counter
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.storage.delete(key);
  }

  /**
   * Reset all counters
   */
  resetAll() {
    this.storage.clear();
  }

  /**
   * Get stats for monitoring
   * @returns {object} - Stats about current state
   */
  getStats() {
    return {
      algorithm: 'Fixed Window Counter',
      limit: this.limit,
      windowSizeMs: this.windowSizeMs,
      trackingUsers: this.storage.size,
      details: Array.from(this.storage.entries()).map(([key, bucket]) => ({
        key,
        count: bucket.count,
        windowStart: new Date(bucket.windowStart),
        remaining: Math.max(0, this.limit - bucket.count)
      }))
    };
  }
}

module.exports = FixedWindowRateLimiter;
