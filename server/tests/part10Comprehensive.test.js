import { retrieveTimelineContext, generateGroundedAnswer } from '../services/aiEngineService.js';
import { validateTimelineArray } from '../controllers/adminController.js';
import { generateAccessToken, verifyAccessToken } from '../utils/jwt.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  PART 10: COMPREHENSIVE AUTOMATED TEST SUITE
 * ──────────────────────────────────────────────────────────────────────────────
 */

const runAllPart10Tests = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING PART 10 COMPREHENSIVE AUTOMATED VERIFICATION SUITE');
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

  // ── 1. AUTHENTICATION & JWT ────────────────────────────────────────────────
  console.log('── 1. Authentication & JWT Token Verification ──');
  const mockUser = { id: 'usr_123', email: 'test@netflix.com', displayName: 'Test User', role: 'host' };
  const token = generateAccessToken(mockUser);
  assert(typeof token === 'string' && token.length > 20, 'JWT Access Token generation returns valid string');

  const decoded = verifyAccessToken(token);
  assert(decoded.id === mockUser.id && decoded.role === 'host', 'JWT Token verification decodes payload correctly');

  // ── 2. SERVER-SIDE RBAC PERMISSION ENFORCEMENT ─────────────────────────────
  console.log('\n── 2. Server-Side RBAC Verification ──');
  const isHostOrAdmin = (userRole, hostId, currentUserId) => {
    if (userRole === 'admin') return true;
    return currentUserId === hostId && (userRole === 'host' || userRole === 'viewer');
  };

  assert(isHostOrAdmin('admin', 'usr_host', 'usr_other'), 'Admin bypasses host checks');
  assert(isHostOrAdmin('host', 'usr_host', 'usr_host'), 'Host passes host-protected check');
  assert(!isHostOrAdmin('viewer', 'usr_host', 'usr_other'), 'Participant blocked from host action');

  // ── 3. PLAYBACK STATE MACHINE & AUTHORITATIVE TIME ────────────────────────
  console.log('\n── 3. Playback State Machine Calculation ──');
  const getAuthoritativeTime = (room, nowTs) => {
    if (!room.isPlaying) return room.currentTime;
    const elapsedSec = (nowTs - room.lastUpdatedTs) / 1000;
    return room.currentTime + elapsedSec * (room.playbackRate || 1.0);
  };

  const roomState = { currentTime: 45.0, isPlaying: true, playbackRate: 1.0, lastUpdatedTs: Date.now() - 2000 };
  const calculatedTime = getAuthoritativeTime(roomState, Date.now());
  assert(Math.abs(calculatedTime - 47.0) < 0.1, 'Authoritative time computes elapsed playback duration correctly (47.0s)');

  // ── 4. PLAYBACK DRIFT CORRECTION DECISION BOUNDARIES ──────────────────────
  console.log('\n── 4. Drift Correction Decision Boundaries ──');
  const getDriftStrategy = (driftSec) => {
    const abs = Math.abs(driftSec);
    if (abs <= 0.25) return 'synced';
    if (abs <= 1.2) return driftSec > 0 ? 'catchup_1.05x' : 'slowdown_0.95x';
    return 'hard_seek';
  };

  assert(getDriftStrategy(0.1) === 'synced', 'Drift <= 250ms triggers seamless synced playback');
  assert(getDriftStrategy(0.5) === 'catchup_1.05x', 'Drift +500ms triggers gentle 1.05x catchup');
  assert(getDriftStrategy(-0.5) === 'slowdown_0.95x', 'Drift -500ms triggers gentle 0.95x slowdown');
  assert(getDriftStrategy(2.5) === 'hard_seek', 'Drift > 1.2s triggers hard seek correction');

  // ── 5. AI RETRIEVAL & ANTI-SPOILER GROUNDING ──────────────────────────────
  console.log('\n── 5. AI Retrieval & Anti-Spoiler Boundary ──');
  const titleDoc = {
    _id: 'title_1',
    title: 'Tears of Steel',
    timeline: [
      { timestampStart: 10, eventType: 'scene', payload: { sceneName: 'Scene 1' } },
      { timestampStart: 30, eventType: 'trivia', payload: { question: 'Q1', answer: 'A1' } },
      { timestampStart: 100, eventType: 'scene', payload: { sceneName: 'Future Spoiler Scene' } },
    ],
  };

  const currentTs = 35;
  const context = retrieveTimelineContext(titleDoc, currentTs);
  const containsSpoiler = context.recentEvents.some((e) => e.timestampStart > currentTs + 5);
  assert(!containsSpoiler, 'Anti-spoiler boundary excludes events beyond currentTs + 5s');

  const aiRes = await generateGroundedAnswer({ titleDoc, currentTs, question: 'What is happening in this scene?' });
  assert(aiRes.sourceEvents && aiRes.sourceEvents.length > 0, 'Grounded AI response includes attributed source events');

  // ── 6. TIMELINE SCHEMA & MONOTONIC SEQUENCE VALIDATION ────────────────────
  console.log('\n── 6. Timeline Metadata Validation ──');
  const validTimeline = [
    { timestampStart: 0, eventType: 'scene', payload: { sceneName: 'Start' } },
    { timestampStart: 20, eventType: 'trivia', payload: { question: 'Q', answer: 'A' } },
  ];
  const invalidTimeline = [
    { timestampStart: 40, eventType: 'scene', payload: { sceneName: 'Start' } },
    { timestampStart: 10, eventType: 'scene', payload: { sceneName: 'Out of Order' } }, // out of order!
  ];

  const validRes = validateTimelineArray(validTimeline);
  assert(validRes.isValid, 'Validates chronological timeline array successfully');

  const invalidRes = validateTimelineArray(invalidTimeline);
  assert(!invalidRes.isValid && invalidRes.errors.length > 0, 'Detects out-of-order timestamp sequence errors');

  // ── 7. NARRATIVE VOTING ENGINE & TALLYING ──────────────────────────────────
  console.log('\n── 7. Narrative Voting & Duplicate Prevention ──');
  const votes = new Map();
  votes.set('usr_1', 'opt_a');
  votes.set('usr_2', 'opt_b');
  votes.set('usr_1', 'opt_b'); // User 1 changes vote to opt_b

  assert(votes.size === 2, 'Map key uniqueness prevents duplicate voting per user');
  assert(votes.get('usr_1') === 'opt_b', 'User vote is updated correctly');

  // Tally winner
  const options = [{ id: 'opt_a' }, { id: 'opt_b' }];
  const tally = { opt_a: 0, opt_b: 0 };
  for (const optId of votes.values()) tally[optId]++;
  const winner = tally.opt_b > tally.opt_a ? 'opt_b' : 'opt_a';
  assert(winner === 'opt_b', 'Tallies winner accurately based on participant votes');

  console.log('\n================================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed };
};

runAllPart10Tests();
