/**
 * COMPREHENSIVE TESTS FOR ALL RATE LIMITERS
 *
 * Run: npm test
 */

const FixedWindowRateLimiter = require('../algorithms/fixedWindow');
const SlidingWindowRateLimiter = require('../algorithms/slidingWindow');
const TokenBucketRateLimiter = require('../algorithms/tokenBucket');

// Simple test helper
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ Test ${testCount}: ${name}`);
  } catch (error) {
    failCount++;
    console.log(`❌ Test ${testCount}: ${name}`);
    console.log(`   Error: ${error.message}\n`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('\n📋 RUNNING TESTS FOR RATE LIMITERS\n');

// ==================== FIXED WINDOW TESTS ====================

console.log('--- FIXED WINDOW TESTS ---\n');

test('Fixed Window: First request is allowed', () => {
  const limiter = new FixedWindowRateLimiter(5, 10000);
  assert(limiter.isAllowed('user1') === true);
});

test('Fixed Window: Allows requests up to limit', () => {
  const limiter = new FixedWindowRateLimiter(5, 10000);
  for (let i = 0; i < 5; i++) {
    assert(limiter.isAllowed('user1') === true);
  }
});

test('Fixed Window: Blocks requests beyond limit', () => {
  const limiter = new FixedWindowRateLimiter(5, 10000);
  for (let i = 0; i < 5; i++) {
    limiter.isAllowed('user1');
  }
  assert(limiter.isAllowed('user1') === false);
});

test('Fixed Window: Different users have independent limits', () => {
  const limiter = new FixedWindowRateLimiter(2, 10000);
  assert(limiter.isAllowed('user1') === true);
  assert(limiter.isAllowed('user1') === true);
  assert(limiter.isAllowed('user1') === false);
  assert(limiter.isAllowed('user2') === true);
  assert(limiter.isAllowed('user2') === true);
  assert(limiter.isAllowed('user2') === false);
});

test('Fixed Window: getCount returns correct count', () => {
  const limiter = new FixedWindowRateLimiter(5, 10000);
  limiter.isAllowed('user1');
  limiter.isAllowed('user1');
  assert(limiter.getCount('user1') === 2);
});

test('Fixed Window: reset clears specific user', () => {
  const limiter = new FixedWindowRateLimiter(2, 10000);
  limiter.isAllowed('user1');
  limiter.isAllowed('user1');
  limiter.reset('user1');
  assert(limiter.isAllowed('user1') === true);
});

test('Fixed Window: resetAll clears all users', () => {
  const limiter = new FixedWindowRateLimiter(2, 10000);
  limiter.isAllowed('user1');
  limiter.isAllowed('user2');
  limiter.resetAll();
  assert(limiter.isAllowed('user1') === true);
  assert(limiter.isAllowed('user2') === true);
});

// ==================== SLIDING WINDOW TESTS ====================

console.log('\n--- SLIDING WINDOW TESTS ---\n');

test('Sliding Window: First request is allowed', () => {
  const limiter = new SlidingWindowRateLimiter(5, 10000);
  assert(limiter.isAllowed('user1') === true);
});

test('Sliding Window: Allows requests up to limit', () => {
  const limiter = new SlidingWindowRateLimiter(5, 10000);
  for (let i = 0; i < 5; i++) {
    assert(limiter.isAllowed('user1') === true);
  }
});

test('Sliding Window: Blocks requests beyond limit', () => {
  const limiter = new SlidingWindowRateLimiter(5, 10000);
  for (let i = 0; i < 5; i++) {
    limiter.isAllowed('user1');
  }
  assert(limiter.isAllowed('user1') === false);
});

test('Sliding Window: Different users have independent limits', () => {
  const limiter = new SlidingWindowRateLimiter(2, 10000);
  assert(limiter.isAllowed('user1') === true);
  assert(limiter.isAllowed('user1') === true);
  assert(limiter.isAllowed('user1') === false);
  assert(limiter.isAllowed('user2') === true);
  assert(limiter.isAllowed('user2') === true);
  assert(limiter.isAllowed('user2') === false);
});

test('Sliding Window: getCount returns correct count', () => {
  const limiter = new SlidingWindowRateLimiter(5, 10000);
  limiter.isAllowed('user1');
  limiter.isAllowed('user1');
  assert(limiter.getCount('user1') === 2);
});

test('Sliding Window: getHistory shows request timestamps', () => {
  const limiter = new SlidingWindowRateLimiter(5, 10000);
  limiter.isAllowed('user1');
  limiter.isAllowed('user1');
  const history = limiter.getHistory('user1');
  assert(history.length === 2);
  assert(history[0].timestamp !== undefined);
});

test('Sliding Window: reset clears user history', () => {
  const limiter = new SlidingWindowRateLimiter(2, 10000);
  limiter.isAllowed('user1');
  limiter.isAllowed('user1');
  limiter.reset('user1');
  assert(limiter.getCount('user1') === 0);
});

// ==================== TOKEN BUCKET TESTS ====================

console.log('\n--- TOKEN BUCKET TESTS ---\n');

test('Token Bucket: First request is allowed', () => {
  const limiter = new TokenBucketRateLimiter(5, 0.5);
  assert(limiter.isAllowed('user1') === true);
});

test('Token Bucket: Allows requests up to capacity', () => {
  const limiter = new TokenBucketRateLimiter(5, 0.5);
  for (let i = 0; i < 5; i++) {
    assert(limiter.isAllowed('user1') === true);
  }
});

test('Token Bucket: Blocks when no tokens available', () => {
  const limiter = new TokenBucketRateLimiter(2, 0.5);
  limiter.isAllowed('user1');
  limiter.isAllowed('user1');
  assert(limiter.isAllowed('user1') === false);
});

test('Token Bucket: getTokenCount returns current tokens', () => {
  const limiter = new TokenBucketRateLimiter(5, 0.5);
  const tokens = limiter.getTokenCount('user1');
  assert(tokens === 5);
});

test('Token Bucket: Tokens refill over time', (done) => {
  const limiter = new TokenBucketRateLimiter(1, 1); // 1 token per second
  limiter.isAllowed('user1'); // Use the token
  assert(limiter.getTokenCount('user1') < 0.1);

  // Wait 1.5 seconds for refill
  setTimeout(() => {
    const tokens = limiter.getTokenCount('user1');
    assert(tokens > 0.9); // Should have ~1 token
  }, 1500);
});

test('Token Bucket: Capacity is never exceeded', () => {
  const limiter = new TokenBucketRateLimiter(5, 0.5);
  const tokens = limiter.getTokenCount('user1');
  assert(tokens <= 5);
});

test('Token Bucket: Different users have independent buckets', () => {
  const limiter = new TokenBucketRateLimiter(2, 0.5);
  limiter.isAllowed('user1');
  limiter.isAllowed('user1');
  assert(limiter.isAllowed('user2') === true);
  assert(limiter.isAllowed('user2') === true);
});

test('Token Bucket: getTimeUntilTokenAvailable returns 0 when tokens available', () => {
  const limiter = new TokenBucketRateLimiter(5, 1);
  const time = limiter.getTimeUntilTokenAvailable('user1');
  assert(time === 0);
});

test('Token Bucket: reset clears user bucket', () => {
  const limiter = new TokenBucketRateLimiter(5, 1);
  limiter.isAllowed('user1');
  limiter.reset('user1');
  assert(limiter.getTokenCount('user1') === 5);
});

// ==================== PRINT RESULTS ====================

console.log('\n' + '='.repeat(50));
console.log(`\n📊 TEST RESULTS\n`);
console.log(`Total: ${testCount}`);
console.log(`Passed: ${passCount} ✅`);
console.log(`Failed: ${failCount} ❌`);

if (failCount === 0) {
  console.log(`\n🎉 ALL TESTS PASSED!\n`);
} else {
  console.log(`\n⚠️  SOME TESTS FAILED\n`);
  process.exit(1);
}
