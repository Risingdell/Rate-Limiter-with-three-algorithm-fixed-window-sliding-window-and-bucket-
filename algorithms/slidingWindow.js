/**
 * SLIDING WINDOW LOG ALGORITHM
 *
 * How it works:
 * - Keep a LOG (array) of all request TIMESTAMPS for each user
 * - When new request comes, check timestamps from last X seconds
 * - Count requests in that window
 * - If count < limit, add new timestamp and allow; else block
 * - Remove old timestamps outside the window (cleanup)
 *
 * Visual:
 * Current time: 12:00:45
 * Window: last 60 seconds [11:59:45 to 12:00:45]
 *
 * Timestamps for user:123:
 * 11:59:30 ✅ (within window)
 * 11:59:40 ✅ (within window)
 * 12:00:10 ✅ (within window)
 * 12:00:35 ✅ (within window)
 * 12:00:20 ✅ (within window)
 *
 * New request at 12:00:45:
 * Count = 5 requests (< 100 limit)
 * ✅ ALLOWED - Add timestamp 12:00:45
 */

class SlidingWindowRateLimiter {
  /**
   * Initialize the rate limiter
   * @param {number} limit - Max requests allowed per window
   * @param {number} windowSizeMs - Window size in milliseconds
   *
   * Example:
   * new SlidingWindowRateLimiter(100, 60000)
   *   = 100 requests per 60 seconds (sliding)
   */
  constructor(limit, windowSizeMs) {
    this.limit = limit;
    this.windowSizeMs = windowSizeMs;

    // Store: { userId -> [timestamp1, timestamp2, timestamp3, ...] }
    // We keep ALL timestamps for the user in the window
    this.storage = new Map();
  }

  /**
   * Check if a request is allowed for a given user/key
   * @param {string} key - Unique identifier (user ID, IP, API key, etc.)
   * @returns {boolean} - true if allowed, false if rate limited
   */
  isAllowed(key) {
    const now = Date.now();

    // Get timestamps array for this user
    let timestamps = this.storage.get(key) || [];

    // Remove all timestamps older than the window
    // Window = last 60 seconds = [now - 60000, now]
    const windowStart = now - this.windowSizeMs;
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Check if we're within limit
    if (timestamps.length < this.limit) {
      // We have room for this request, add the timestamp
      timestamps.push(now);
      this.storage.set(key, timestamps);
      return true; // Allow request
    }

    // Clean up old timestamps for next check
    this.storage.set(key, timestamps);
    return false; // Block request - limit exceeded
  }

  /**
   * Get current request count for debugging/monitoring
   * @param {string} key - Unique identifier
   * @returns {number} - Current request count in window
   */
  getCount(key) {
    const now = Date.now();
    const timestamps = this.storage.get(key) || [];

    // Filter to only timestamps in current window
    const windowStart = now - this.windowSizeMs;
    const validTimestamps = timestamps.filter(t => t > windowStart);

    return validTimestamps.length;
  }

  /**
   * Get request history for a user (for monitoring/debugging)
   * @param {string} key - Unique identifier
   * @returns {array} - Array of timestamps
   */
  getHistory(key) {
    const now = Date.now();
    const timestamps = this.storage.get(key) || [];

    // Filter to only timestamps in current window
    const windowStart = now - this.windowSizeMs;
    const validTimestamps = timestamps.filter(t => t > windowStart);

    // Convert to readable format
    return validTimestamps.map(timestamp => ({
      timestamp: timestamp,
      date: new Date(timestamp),
      secondsAgo: Math.round((now - timestamp) / 1000)
    }));
  }

  /**
   * Reset a specific user's history
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.storage.delete(key);
  }

  /**
   * Reset all histories
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
    const windowStart = now - this.windowSizeMs;

    return {
      algorithm: 'Sliding Window Log',
      limit: this.limit,
      windowSizeMs: this.windowSizeMs,
      trackingUsers: this.storage.size,
      totalTimestampsStored: Array.from(this.storage.values())
        .reduce((sum, timestamps) => sum + timestamps.length, 0),
      details: Array.from(this.storage.entries()).map(([key, timestamps]) => {
        const validTimestamps = timestamps.filter(t => t > windowStart);
        return {
          key,
          count: validTimestamps.length,
          remaining: Math.max(0, this.limit - validTimestamps.length),
          oldestRequest: timestamps.length > 0 ? new Date(timestamps[0]) : null,
          newestRequest: timestamps.length > 0
            ? new Date(timestamps[timestamps.length - 1])
            : null
        };
      })
    };
  }
}

module.exports = SlidingWindowRateLimiter;
