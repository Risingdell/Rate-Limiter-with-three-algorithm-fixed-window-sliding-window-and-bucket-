/**
 * EXAMPLE 1: FIXED WINDOW RATE LIMITER
 *
 * This example shows:
 * - Creating a fixed window rate limiter
 * - Making requests and seeing when they get blocked
 * - Understanding the boundary problem
 *
 * Run: node examples/fixed-window-example.js
 */

const FixedWindowRateLimiter = require('../algorithms/fixedWindow');

console.log('🔧 FIXED WINDOW RATE LIMITER EXAMPLE\n');
console.log('Setup: 5 requests per 5000ms (5 seconds)\n');

// Create a rate limiter: 5 requests per 5 seconds
const limiter = new FixedWindowRateLimiter(5, 5000);

// Simulate a user making requests
const userId = 'user:123';

console.log('--- Requests within same window ---\n');

// Make 5 requests (should all be allowed)
for (let i = 1; i <= 5; i++) {
  const allowed = limiter.isAllowed(userId);
  const count = limiter.getCount(userId);
  console.log(`Request ${i}: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${count}/${limiter.limit})`);
}

// Try 6th request (should be blocked)
console.log('\nRequest 6: ' + (limiter.isAllowed(userId) ? '✅ ALLOWED' : '❌ BLOCKED') + ` (${limiter.getCount(userId)}/${limiter.limit})`);

console.log('\n--- Stats ---\n');
console.log(JSON.stringify(limiter.getStats(), null, 2));

console.log('\n--- Waiting 6 seconds for window to reset... ---\n');

// Wait 6 seconds for the window to reset
setTimeout(() => {
  console.log('✨ Window reset! Trying request again...\n');

  const allowed = limiter.isAllowed(userId);
  console.log(`Request in new window: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${limiter.getCount(userId)}/${limiter.limit})`);

  console.log('\n--- Demonstrating THE BOUNDARY PROBLEM ---\n');

  limiter.resetAll();

  console.log('Scenario: User has 5 requests limit per 5 seconds');
  console.log('User makes 5 requests at t=4.9s (allowed)');
  console.log('User makes 5 requests at t=5.1s (new window - also allowed)');
  console.log('Total: 10 requests in 0.2 seconds! ❌ (Should be limited to 5/5s)\n');
  console.log('This is the BOUNDARY PROBLEM of Fixed Window algorithm.\n');

}, 6000);
