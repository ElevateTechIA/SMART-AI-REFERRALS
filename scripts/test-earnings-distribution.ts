/**
 * Test script for earnings distribution logic
 * Run with: npx tsx scripts/test-earnings-distribution.ts
 *
 * Tests the core distribution algorithm without hitting Firebase.
 */

// ---- Simulate the distribution logic from convert/route.ts ----

interface Offer {
  pricePerNewCustomer: number
  referrerCommissionAmount: number
  referrerCommissionPercentage?: number | null
  consumerRewardType: 'cash' | 'discount' | 'points' | 'none'
  consumerRewardValue: number
}

interface Visit {
  referrerUserId?: string | null
  consumerUserId: string
  attributionType?: string
}

interface DistributionResult {
  referrerAmount: number
  consumerRewardAmount: number
  platformAmount: number
  pricePerCustomer: number
  referrerEarningCreated: boolean
  consumerEarningCreated: boolean
  chargeCreated: boolean
  error?: string
}

function calculateDistribution(offer: Offer | null, visit: Visit): DistributionResult {
  if (!offer) {
    return {
      referrerAmount: 0,
      consumerRewardAmount: 0,
      platformAmount: 0,
      pricePerCustomer: 0,
      referrerEarningCreated: false,
      consumerEarningCreated: false,
      chargeCreated: false,
      error: 'No offer configured for this business.',
    }
  }

  const pricePerCustomer = offer.pricePerNewCustomer || 100
  let referrerAmount = 0
  let consumerRewardAmount = 0
  let platformAmount = pricePerCustomer
  let referrerEarningCreated = false
  let consumerEarningCreated = false

  // Calculate referrer commission
  if (visit.referrerUserId && visit.attributionType === 'REFERRER') {
    referrerAmount = offer.referrerCommissionAmount || 0
    if (!referrerAmount && offer.referrerCommissionPercentage) {
      referrerAmount = (pricePerCustomer * offer.referrerCommissionPercentage) / 100
    }

    if (referrerAmount > 0) {
      referrerEarningCreated = true
      platformAmount -= referrerAmount
    }
  }

  // Calculate consumer reward (only cash rewards create earnings and reduce platform cut)
  if (offer.consumerRewardType === 'cash' && offer.consumerRewardValue > 0) {
    consumerRewardAmount = offer.consumerRewardValue
    consumerEarningCreated = true
    platformAmount -= consumerRewardAmount
  }

  // Safety: ensure platform amount is never negative
  platformAmount = Math.max(0, platformAmount)

  return {
    referrerAmount,
    consumerRewardAmount,
    platformAmount,
    pricePerCustomer,
    referrerEarningCreated,
    consumerEarningCreated,
    chargeCreated: true,
  }
}

// ---- Simulate offer validation from offers/route.ts ----

function validateOfferConfig(
  pricePerNewCustomer: number,
  referrerCommissionAmount: number,
  consumerRewardValue: number,
  consumerRewardType: string
): { valid: boolean; error?: string } {
  if (pricePerNewCustomer < 1 || pricePerNewCustomer > 10000) {
    return { valid: false, error: 'Price must be between 1 and 10000' }
  }
  if (referrerCommissionAmount < 0 || referrerCommissionAmount > pricePerNewCustomer) {
    return { valid: false, error: 'Commission must be between 0 and price' }
  }
  if (consumerRewardValue < 0 || consumerRewardValue > pricePerNewCustomer) {
    return { valid: false, error: 'Reward must be between 0 and price' }
  }

  // NEW: Sum validation (only for cash rewards)
  const effectiveReward = consumerRewardType === 'cash' ? consumerRewardValue : 0
  if (referrerCommissionAmount + effectiveReward > pricePerNewCustomer) {
    return {
      valid: false,
      error: `Commission ($${referrerCommissionAmount}) + reward ($${effectiveReward}) exceeds price ($${pricePerNewCustomer})`,
    }
  }

  return { valid: true }
}

// ---- Simulate earning status transitions ----

function validateStatusTransition(current: string, target: string): boolean {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['APPROVED', 'CANCELLED'],
    APPROVED: ['PAID', 'CANCELLED'],
  }
  return VALID_TRANSITIONS[current]?.includes(target) ?? false
}

// ---- Test runner ----

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`  ❌ ${name}: ${msg}`)
    failed++
  }
}

function assertEqual<T>(actual: T, expected: T, label = '') {
  if (actual !== expected) {
    throw new Error(`${label ? label + ': ' : ''}expected ${expected}, got ${actual}`)
  }
}

// =============================================
// TEST SUITE
// =============================================

console.log('\n=== Distribution Tests ===\n')

console.log('Scenario 1: Standard conversion with referrer + cash consumer reward')
test('distributes correctly with $100 price, $30 referrer, $20 consumer', () => {
  const result = calculateDistribution(
    {
      pricePerNewCustomer: 100,
      referrerCommissionAmount: 30,
      consumerRewardType: 'cash',
      consumerRewardValue: 20,
    },
    { referrerUserId: 'ref1', consumerUserId: 'con1', attributionType: 'REFERRER' }
  )
  assertEqual(result.referrerAmount, 30, 'referrer')
  assertEqual(result.consumerRewardAmount, 20, 'consumer')
  assertEqual(result.platformAmount, 50, 'platform')
  assertEqual(result.pricePerCustomer, 100, 'price')
  assertEqual(result.referrerEarningCreated, true, 'referrer earning')
  assertEqual(result.consumerEarningCreated, true, 'consumer earning')
  assertEqual(result.chargeCreated, true, 'charge')
  // Verify: referrer + consumer + platform = price
  assertEqual(result.referrerAmount + result.consumerRewardAmount + result.platformAmount, 100, 'total balance')
})

console.log('\nScenario 2: Conversion with discount reward (NOT cash)')
test('discount reward does NOT create consumer earning or reduce platform', () => {
  const result = calculateDistribution(
    {
      pricePerNewCustomer: 100,
      referrerCommissionAmount: 30,
      consumerRewardType: 'discount',
      consumerRewardValue: 20,
    },
    { referrerUserId: 'ref1', consumerUserId: 'con1', attributionType: 'REFERRER' }
  )
  assertEqual(result.referrerAmount, 30, 'referrer')
  assertEqual(result.consumerRewardAmount, 0, 'consumer should be 0')
  assertEqual(result.platformAmount, 70, 'platform gets full minus referrer')
  assertEqual(result.consumerEarningCreated, false, 'no consumer earning')
  // Verify: referrer + platform = price (no consumer cash deduction)
  assertEqual(result.referrerAmount + result.platformAmount, 100, 'total balance')
})

console.log('\nScenario 3: Conversion with points reward (NOT cash)')
test('points reward does NOT create consumer earning or reduce platform', () => {
  const result = calculateDistribution(
    {
      pricePerNewCustomer: 50,
      referrerCommissionAmount: 10,
      consumerRewardType: 'points',
      consumerRewardValue: 15,
    },
    { referrerUserId: 'ref1', consumerUserId: 'con1', attributionType: 'REFERRER' }
  )
  assertEqual(result.consumerRewardAmount, 0, 'consumer')
  assertEqual(result.platformAmount, 40, 'platform')
  assertEqual(result.consumerEarningCreated, false, 'no consumer earning')
})

console.log('\nScenario 4: No referrer (organic visit)')
test('no referrer means no referrer earning, platform gets more', () => {
  const result = calculateDistribution(
    {
      pricePerNewCustomer: 100,
      referrerCommissionAmount: 30,
      consumerRewardType: 'cash',
      consumerRewardValue: 20,
    },
    { consumerUserId: 'con1' } // no referrerUserId
  )
  assertEqual(result.referrerAmount, 0, 'referrer')
  assertEqual(result.consumerRewardAmount, 20, 'consumer')
  assertEqual(result.platformAmount, 80, 'platform')
  assertEqual(result.referrerEarningCreated, false, 'no referrer earning')
  assertEqual(result.consumerEarningCreated, true, 'consumer earning')
})

console.log('\nScenario 5: Referrer with percentage-based commission')
test('percentage commission calculates correctly', () => {
  const result = calculateDistribution(
    {
      pricePerNewCustomer: 200,
      referrerCommissionAmount: 0,
      referrerCommissionPercentage: 25,
      consumerRewardType: 'cash',
      consumerRewardValue: 30,
    },
    { referrerUserId: 'ref1', consumerUserId: 'con1', attributionType: 'REFERRER' }
  )
  assertEqual(result.referrerAmount, 50, 'referrer 25% of $200')
  assertEqual(result.consumerRewardAmount, 30, 'consumer')
  assertEqual(result.platformAmount, 120, 'platform')
  assertEqual(result.referrerAmount + result.consumerRewardAmount + result.platformAmount, 200, 'total balance')
})

console.log('\nScenario 6: No offer found')
test('returns error when no offer exists', () => {
  const result = calculateDistribution(null, {
    referrerUserId: 'ref1',
    consumerUserId: 'con1',
    attributionType: 'REFERRER',
  })
  assertEqual(result.chargeCreated, false, 'no charge')
  assertEqual(result.referrerEarningCreated, false, 'no referrer earning')
  assertEqual(result.consumerEarningCreated, false, 'no consumer earning')
  assertEqual(!!result.error, true, 'has error')
})

console.log('\nScenario 7: No consumer reward (type = none)')
test('no consumer reward when type is none', () => {
  const result = calculateDistribution(
    {
      pricePerNewCustomer: 100,
      referrerCommissionAmount: 40,
      consumerRewardType: 'none',
      consumerRewardValue: 0,
    },
    { referrerUserId: 'ref1', consumerUserId: 'con1', attributionType: 'REFERRER' }
  )
  assertEqual(result.referrerAmount, 40, 'referrer')
  assertEqual(result.consumerRewardAmount, 0, 'consumer')
  assertEqual(result.platformAmount, 60, 'platform')
  assertEqual(result.consumerEarningCreated, false, 'no consumer earning')
})

console.log('\n=== Offer Validation Tests ===\n')

console.log('Validation: Sum exceeds price')
test('rejects when referrer + cash consumer > price', () => {
  const result = validateOfferConfig(100, 80, 80, 'cash')
  assertEqual(result.valid, false, 'should be invalid')
})

test('accepts when referrer + cash consumer = price', () => {
  const result = validateOfferConfig(100, 50, 50, 'cash')
  assertEqual(result.valid, true, 'should be valid')
})

test('accepts when referrer + cash consumer < price', () => {
  const result = validateOfferConfig(100, 30, 20, 'cash')
  assertEqual(result.valid, true, 'should be valid')
})

test('allows referrer + discount consumer > price (discount is not cash)', () => {
  const result = validateOfferConfig(100, 80, 80, 'discount')
  assertEqual(result.valid, true, 'should be valid since discount does not deduct from platform')
})

test('allows referrer + points consumer > price (points is not cash)', () => {
  const result = validateOfferConfig(100, 90, 90, 'points')
  assertEqual(result.valid, true, 'should be valid since points does not deduct from platform')
})

test('rejects price below minimum', () => {
  const result = validateOfferConfig(0, 0, 0, 'none')
  assertEqual(result.valid, false, 'should be invalid')
})

test('rejects commission > price', () => {
  const result = validateOfferConfig(100, 150, 0, 'none')
  assertEqual(result.valid, false, 'should be invalid')
})

console.log('\n=== Earning Status Transition Tests ===\n')

test('PENDING -> APPROVED is valid', () => {
  assertEqual(validateStatusTransition('PENDING', 'APPROVED'), true)
})

test('PENDING -> PAID is invalid (must go through APPROVED)', () => {
  assertEqual(validateStatusTransition('PENDING', 'PAID'), false)
})

test('PENDING -> CANCELLED is valid', () => {
  assertEqual(validateStatusTransition('PENDING', 'CANCELLED'), true)
})

test('APPROVED -> PAID is valid', () => {
  assertEqual(validateStatusTransition('APPROVED', 'PAID'), true)
})

test('APPROVED -> CANCELLED is valid', () => {
  assertEqual(validateStatusTransition('APPROVED', 'CANCELLED'), true)
})

test('PAID -> anything is invalid (final state)', () => {
  assertEqual(validateStatusTransition('PAID', 'PENDING'), false)
  assertEqual(validateStatusTransition('PAID', 'CANCELLED'), false)
})

test('CANCELLED -> anything is invalid (final state)', () => {
  assertEqual(validateStatusTransition('CANCELLED', 'PENDING'), false)
  assertEqual(validateStatusTransition('CANCELLED', 'APPROVED'), false)
})

console.log('\n=== Balance Integrity Tests ===\n')

test('in ALL scenarios: referrer + consumer + platform = pricePerCustomer', () => {
  const scenarios = [
    { price: 100, comm: 30, rewardType: 'cash' as const, rewardVal: 20, hasReferrer: true },
    { price: 100, comm: 30, rewardType: 'cash' as const, rewardVal: 20, hasReferrer: false },
    { price: 200, comm: 0, rewardType: 'cash' as const, rewardVal: 50, hasReferrer: true },
    { price: 50, comm: 25, rewardType: 'none' as const, rewardVal: 0, hasReferrer: true },
    { price: 100, comm: 100, rewardType: 'none' as const, rewardVal: 0, hasReferrer: true },
    { price: 1, comm: 0, rewardType: 'none' as const, rewardVal: 0, hasReferrer: false },
    { price: 100, comm: 0, rewardType: 'discount' as const, rewardVal: 50, hasReferrer: true },
    { price: 100, comm: 40, rewardType: 'points' as const, rewardVal: 30, hasReferrer: true },
  ]

  for (const s of scenarios) {
    const result = calculateDistribution(
      {
        pricePerNewCustomer: s.price,
        referrerCommissionAmount: s.comm,
        consumerRewardType: s.rewardType,
        consumerRewardValue: s.rewardVal,
      },
      {
        referrerUserId: s.hasReferrer ? 'ref1' : undefined,
        consumerUserId: 'con1',
        attributionType: 'REFERRER',
      }
    )
    const total = result.referrerAmount + result.consumerRewardAmount + result.platformAmount
    if (total !== s.price) {
      throw new Error(
        `Imbalance for scenario price=${s.price}, comm=${s.comm}, ` +
        `reward=${s.rewardType}/${s.rewardVal}, referrer=${s.hasReferrer}: ` +
        `${result.referrerAmount} + ${result.consumerRewardAmount} + ${result.platformAmount} = ${total} (expected ${s.price})`
      )
    }
  }
})

// ---- Summary ----
console.log('\n' + '='.repeat(50))
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`)
console.log('='.repeat(50) + '\n')

if (failed > 0) {
  process.exit(1)
}
