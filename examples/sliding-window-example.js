/**
 * EXAMPLE 2: SLIDING WINDOW RATE LIMITER
 *
 * This example shows:
 * - Creating a sliding window rate limiter
 * - How it handles the boundary problem better than fixed window
 * - Viewing request history
 *
 * Run: node examples/sliding-window-example.js
 */

const SlidingWindowRateLimiter = require('../algorithms/slidingWindow');

console.log('🔧 SLIDING WINDOW RATE LIMITER EXAMPLE\n');
console.log('Setup: 5 requests per 5000ms (5 seconds, sliding)\n');

// Create a rate limiter: 5 requests per 5 seconds
const limiter = new SlidingWindowRateLimiter(5, 5000);

const userId = 'user:456';

console.log('--- Making 5 requests ---\n');

// Make 5 requests
for (let i = 1; i <= 5; i++) {
  const allowed = limiter.isAllowed(userId);
  const count = limiter.getCount(userId);
  console.log(`Request ${i}: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${count}/${limiter.limit})`);
}

// Try 6th request
console.log('\nRequest 6: ' + (limiter.isAllowed(userId) ? '✅ ALLOWED' : '❌ BLOCKED') + ` (${limiter.getCount(userId)}/${limiter.limit})`);

console.log('\n--- Request History ---\n');
const history = limiter.getHistory(userId);
history.forEach((request, idx) => {
  console.log(`  Request ${idx + 1}: ${request.date.toISOString()} (${request.secondsAgo}s ago)`);
});

console.log('\n--- Stats ---\n');
console.log(JSON.stringify(limiter.getStats(), null, 2));

console.log('\n--- Waiting for requests to age out of window ---\n');

// Wait 6 seconds for old requests to fall out of window
setTimeout(() => {
  console.log('✨ Oldest requests now outside the 5-second window!\n');

  const count = limiter.getCount(userId);
  console.log(`Current request count: ${count}/${limiter.limit}`);

  console.log('\nTrying new request (should be allowed now):');
  const allowed = limiter.isAllowed(userId);
  console.log(`Request: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${limiter.getCount(userId)}/${limiter.limit})`);

  console.log('\n--- Updated History ---\n');
  const newHistory = limiter.getHistory(userId);
  newHistory.forEach((request, idx) => {
    console.log(`  Request ${idx + 1}: ${request.date.toISOString()} (${request.secondsAgo}s ago)`);
  });

}, 6000);
