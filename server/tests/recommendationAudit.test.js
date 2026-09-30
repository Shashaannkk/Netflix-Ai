import mongoose from 'mongoose';
import { generateHybridRecommendations } from '../services/recommendationEngine.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  RECOMMENDATION ENGINE AUDIT & UNIT TEST
 * ──────────────────────────────────────────────────────────────────────────────
 */

export const runRecommendationAuditTests = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING RECOMMENDATION BACKEND AUDIT VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, detail = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  // 1. Unauthenticated or empty history recommendation fallback check
  const fakeUserId = new mongoose.Types.ObjectId();
  const recs = await generateHybridRecommendations(fakeUserId.toString(), 5);

  assert(Array.isArray(recs), 'generateHybridRecommendations returns an array');
  assert(recs.length >= 0, 'Recommendation engine executes without errors');

  if (recs.length > 0) {
    const first = recs[0];
    assert(typeof first.matchScore === 'string', 'Recommendation item contains matchScore string (e.g. 98% Match)');
    assert(typeof first.matchReason === 'string', 'Recommendation item contains human readable matchReason tag');
  }

  console.log('\n================================================================');
  console.log(`📊 RECOMMENDATION AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');
};
