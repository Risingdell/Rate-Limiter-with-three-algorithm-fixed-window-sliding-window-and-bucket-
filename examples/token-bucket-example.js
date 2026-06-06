/**
 * EXAMPLE 3: TOKEN BUCKET RATE LIMITER
 *
 * This example shows:
 * - Creating a token bucket rate limiter
 * - How tokens accumulate over time
 * - Burst handling (using accumulated tokens)
 * - Getting time until next token available
 *
 * Run: node examples/token-bucket-example.js
 */

const TokenBucketRateLimiter = require('../algorithms/tokenBucket');

console.log('🔧 TOKEN BUCKET RATE LIMITER EXAMPLE\n');
console.log('Setup: 10 token capacity, refill at 2 tokens/second\n');

// Create a rate limiter
// Capacity: 10 tokens
// Refill rate: 2 tokens per second
const limiter = new TokenBucketRateLimiter(10, 2);

const userId = 'user:789';

console.log('--- Initial burst: Making 5 requests immediately ---\n');

// Make 5 requests immediately (using tokens from bucket)
for (let i = 1; i <= 5; i++) {
  const allowed = limiter.isAllowed(userId);
  const tokens = limiter.getTokenCount(userId).toFixed(2);
  console.log(`Request ${i}: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (Tokens left: ${tokens})`);
}

// Try 6th request immediately
console.log('\nRequest 6 (immediate): ' + (limiter.isAllowed(userId) ? '✅ ALLOWED' : '❌ BLOCKED'));

console.log('\n--- Stats ---\n');
console.log(JSON.stringify(limiter.getStats(), null, 2));

console.log('\n--- Waiting 2 seconds (bucket refills) ---\n');

setTimeout(() => {
  const tokens = limiter.getTokenCount(userId).toFixed(2);
  console.log(`After 2 seconds: ${tokens} tokens (refilled at 2 tokens/sec)\n`);

  console.log('Making 3 more requests:');
  for (let i = 1; i <= 3; i++) {
    const allowed = limiter.isAllowed(userId);
    const remainingTokens = limiter.getTokenCount(userId).toFixed(2);
    console.log(`Request: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (Tokens left: ${remainingTokens})`);
  }

  console.log('\n--- What about when bucket is empty? ---\n');

  // Use up all tokens
  while (limiter.isAllowed(userId)) {
    // Keep making requests
  }

  const timeUntilNext = limiter.getTimeUntilTokenAvailable(userId);
  console.log(`Bucket empty! 🪣`);
  console.log(`Next token available in: ${timeUntilNext}ms\n`);

  console.log('--- Advantage of Token Bucket ---\n');
  console.log('✅ Smooth rate limiting (unlike fixed window spikes)');
  console.log('✅ Allows bursts (accumulated tokens)');
  console.log('✅ Can tell client when to retry\n');

}, 2000);
