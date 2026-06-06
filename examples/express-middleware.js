/**
 * EXAMPLE: RATE LIMITING IN EXPRESS.JS
 *
 * This example shows:
 * - How to use rate limiter as middleware in Express
 * - How to handle rate limit responses
 * - How to return proper HTTP status codes
 *
 * Run: npm install express (if not already installed)
 * Then: node examples/express-middleware.js
 * Then: Open http://localhost:3000/api/data
 */

const express = require('express');
const TokenBucketRateLimiter = require('../algorithms/tokenBucket');

const app = express();

// Create a rate limiter: 5 requests per minute per user
const rateLimiter = new TokenBucketRateLimiter(5, 5 / 60); // 5 tokens per 60 seconds

/**
 * Middleware to check rate limit
 * Identifies user by IP address (in real apps, use user ID)
 */
function rateLimitMiddleware(req, res, next) {
  // Get unique identifier for this client
  // In production: use req.user.id or API key
  const clientId = req.ip;

  // Check if request is allowed
  if (rateLimiter.isAllowed(clientId)) {
    // Get remaining tokens for headers
    const tokensLeft = Math.floor(rateLimiter.getTokenCount(clientId));

    // Set rate limit info in response headers (standard practice)
    res.set({
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': tokensLeft.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
    });

    next(); // Proceed to route handler
  } else {
    // Rate limit exceeded
    const timeUntilNext = rateLimiter.getTimeUntilTokenAvailable(clientId);

    res.status(429) // 429 = Too Many Requests
      .set({
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'Retry-After': Math.ceil(timeUntilNext / 1000) // Seconds until retry
      })
      .json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfterSeconds: Math.ceil(timeUntilNext / 1000)
      });
  }
}

// Apply rate limiter to all /api/* routes
app.use('/api', rateLimitMiddleware);

// Example endpoints
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Here is your data!',
    timestamp: new Date().toISOString(),
    data: {
      users: 1000,
      posts: 50000,
      comments: 500000
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Unprotected endpoint (no rate limiting)
app.get('/api/public', (req, res) => {
  res.json({
    message: 'This endpoint has no rate limit'
  });
});

// Admin endpoint to check current rate limit stats
app.get('/admin/rate-limit-stats', (req, res) => {
  res.json(rateLimiter.getStats());
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('\nEndpoints to test:');
  console.log(`  http://localhost:${PORT}/api/data (rate limited: 5 req/min)`);
  console.log(`  http://localhost:${PORT}/api/status (rate limited: 5 req/min)`);
  console.log(`  http://localhost:${PORT}/api/public (no rate limit)`);
  console.log(`  http://localhost:${PORT}/admin/rate-limit-stats (stats)`);
  console.log('\n💡 Try refreshing /api/data multiple times quickly to trigger rate limit!');
  console.log('📊 Check response headers for X-RateLimit-* headers\n');
});
