/**
 * COMPARE ALL 3 ALGORITHMS
 *
 * This example shows the differences between all three algorithms
 * under the same conditions.
 *
 * Run: node examples/compare-all.js
 */

const FixedWindowRateLimiter = require('../algorithms/fixedWindow');
const SlidingWindowRateLimiter = require('../algorithms/slidingWindow');
const TokenBucketRateLimiter = require('../algorithms/tokenBucket');

console.log('📊 COMPARING ALL 3 RATE LIMITING ALGORITHMS\n');
console.log('Scenario: 10 requests per 10 seconds\n');

// Create all 3 limiters with same limit: 10 req per 10 sec
const fixed = new FixedWindowRateLimiter(10, 10000);
const sliding = new SlidingWindowRateLimiter(10, 10000);
const token = new TokenBucketRateLimiter(10, 1); // 1 token/sec = 10 tokens/10 sec

const userId = 'user:compare';

console.log('--- Test 1: Making 15 requests in rapid succession ---\n');

for (let i = 1; i <= 15; i++) {
  const f = fixed.isAllowed(userId);
  const s = sliding.isAllowed(userId);
  const t = token.isAllowed(userId);

  console.log(`Request ${i.toString().padStart(2)}: Fixed: ${f ? '✅' : '❌'} | Sliding: ${s ? '✅' : '❌'} | Token: ${t ? '✅' : '❌'}`);
}

console.log('\n--- Summary after burst ---\n');
console.log('Fixed Window:');
console.log(`  Allowed: ${fixed.getStats().details.map(d => d.count)[0] || 0}/10`);
console.log('Sliding Window:');
console.log(`  Allowed: ${sliding.getCount(userId)}/10`);
console.log('Token Bucket:');
console.log(`  Tokens left: ${token.getTokenCount(userId).toFixed(2)}/10`);

console.log('\n--- TEST 2: Wait 5 seconds, make 5 more requests ---\n');

setTimeout(() => {
  console.log('After 5 seconds:\n');

  for (let i = 1; i <= 5; i++) {
    const f = fixed.isAllowed(userId);
    const s = sliding.isAllowed(userId);
    const t = token.isAllowed(userId);

    console.log(`Request ${i}: Fixed: ${f ? '✅' : '❌'} | Sliding: ${s ? '✅' : '❌'} | Token: ${t ? '✅' : '❌'}`);
  }

  console.log('\n--- Summary ---\n');

  console.log('ALGORITHM COMPARISON:\n');

  console.log('🟦 FIXED WINDOW');
  console.log('   Pros: Simple, fast, low memory');
  console.log('   Cons: Boundary problem (allows burst at window edge)');
  console.log('   Use: Simple cases, learning');
  console.log('   Status: ' + (fixed.getStats().details.map(d => d.count)[0] || 0) + ' requests allowed\n');

  console.log('🟪 SLIDING WINDOW');
  console.log('   Pros: Accurate, no boundary problem');
  console.log('   Cons: Uses more memory (stores all timestamps)');
  console.log('   Use: When accuracy matters');
  console.log('   Status: ' + sliding.getCount(userId) + ' requests allowed\n');

  console.log('🟨 TOKEN BUCKET');
  console.log('   Pros: Smooth, allows bursts, efficient');
  console.log('   Cons: Slightly more complex');
  console.log('   Use: Production APIs (most popular)');
  console.log('   Status: ' + token.getTokenCount(userId).toFixed(2) + ' tokens available\n');

}, 5000);
