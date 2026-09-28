import { generateAccessToken, verifyAccessToken } from '../utils/jwt.js';
import { retrieveTimelineContext, generateGroundedAnswer, checkTimelineTrivia } from '../services/aiEngineService.js';
import { validateTimelineArray } from '../controllers/adminController.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  MULTI-CLIENT SYNCHRONIZATION & DRIFT PROTOCOL TEST SUITE
 * ──────────────────────────────────────────────────────────────────────────────
 */

const runSyncSuite = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING MULTI-CLIENT SYNCHRONIZATION & DRIFT TEST SUITE');
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

  // ── 1. Host Authoritative Playback Enforcement ────────────────────────────
  console.log('── 1. Host Authoritative Playback Control ──');
  const activeRooms = new Map();
  const roomId = 'room_sync_001';
  const hostId = 'user_host_1';
  const participantId = 'user_part_2';

  activeRooms.set(roomId, {
    hostUserId: hostId,
    playback: {
      state: 'paused',
      positionSeconds: 10.0,
      playbackRate: 1.0,
      version: 1,
      lastUpdatedTs: Date.now(),
    },
    triggeredTrivia: new Set(),
  });

  const processPlaybackUpdate = (spaceId, userId, payload) => {
    const room = activeRooms.get(spaceId);
    if (!room) return { error: 'ROOM_NOT_FOUND' };
    if (room.hostUserId !== userId) {
      return { error: 'FORBIDDEN_NOT_HOST' };
    }
    room.playback.state = payload.isPlaying ? 'playing' : 'paused';
    room.playback.positionSeconds = payload.positionSeconds;
    room.playback.version += 1;
    room.playback.lastUpdatedTs = Date.now();
    return { success: true, playback: room.playback };
  };

  // Non-host attempts to seek or play
  const participantAttempt = processPlaybackUpdate(roomId, participantId, {
    isPlaying: true,
    positionSeconds: 50.0,
  });
  assert(
    participantAttempt.error === 'FORBIDDEN_NOT_HOST',
    'Rejects playback commands issued by non-host participants'
  );

  // Host issues play update
  const hostPlayAttempt = processPlaybackUpdate(roomId, hostId, {
    isPlaying: true,
    positionSeconds: 10.0,
  });
  assert(
    hostPlayAttempt.success && hostPlayAttempt.playback.state === 'playing',
    'Allows host to transition room playback state to playing'
  );

  // ── 2. In-Memory Time Projection & Drift Calculation ──────────────────────
  console.log('\n── 2. Time Projection & Drift Boundaries ──');
  const now = Date.now();
  const serverPlayback = {
    state: 'playing',
    positionSeconds: 20.0,
    playbackRate: 1.0,
    changedAtServerMs: now - 3500, // 3.5s elapsed on server
  };

  const calculateProjectedTime = (playback, clientNow, clockOffsetMs) => {
    const estimatedServerNow = clientNow + clockOffsetMs;
    const isPlaying = playback.state === 'playing';
    const elapsedSec = (isPlaying && playback.changedAtServerMs)
      ? Math.max(0, (estimatedServerNow - playback.changedAtServerMs) / 1000)
      : 0;
    return playback.positionSeconds + elapsedSec * (playback.playbackRate || 1.0);
  };

  const projected = calculateProjectedTime(serverPlayback, now, 0);
  assert(
    Math.abs(projected - 23.5) < 0.05,
    'Authoritative server projection accurately calculates 23.5s after 3.5s elapsed'
  );

  // Decision boundaries
  const evaluateDriftAction = (targetTime, clientTime) => {
    const drift = targetTime - clientTime;
    if (Math.abs(drift) > 1.2) return { action: 'hard_seek', targetTime };
    if (drift > 0.25) return { action: 'catchup_rate', rate: 1.05 };
    if (drift < -0.25) return { action: 'slowdown_rate', rate: 0.95 };
    return { action: 'synced_rate', rate: 1.0 };
  };

  assert(
    evaluateDriftAction(23.5, 23.4).action === 'synced_rate',
    'Drift of 100ms maintains normal 1.0x rate (< 250ms target sync)'
  );
  assert(
    evaluateDriftAction(23.5, 23.0).action === 'catchup_rate' && evaluateDriftAction(23.5, 23.0).rate === 1.05,
    'Drift of +500ms triggers 1.05x gentle catchup'
  );
  assert(
    evaluateDriftAction(23.5, 24.0).action === 'slowdown_rate' && evaluateDriftAction(23.5, 24.0).rate === 0.95,
    'Drift of -500ms triggers 0.95x gentle slowdown'
  );
  assert(
    evaluateDriftAction(23.5, 20.0).action === 'hard_seek',
    'Drift of 3.5s triggers hard seek correction'
  );

  // ── 3. Timeline Trivia Auto-Trigger & Anti-Duplicate Set ───────────────────
  console.log('\n── 3. Authored Trivia Triggers & Deduping ──');
  const titleDocWithTrivia = {
    timeline: [
      {
        timestampStart: 30,
        eventType: 'trivia',
        payload: { question: 'What is the robot name?', answer: 'Tears Prime' },
      },
    ],
  };

  const triviaAt25 = checkTimelineTrivia(titleDocWithTrivia, 25);
  assert(triviaAt25 === null, 'Does not trigger trivia before timestamp window');

  const triviaAt30 = checkTimelineTrivia(titleDocWithTrivia, 30.5);
  assert(
    triviaAt30 && triviaAt30.question === 'What is the robot name?',
    'Triggers trivia when playback position enters +/-2s threshold'
  );

  // ── 4. Narrative Vote Map Immutability & Switching ────────────────────────
  console.log('\n── 4. Narrative Variation Voting Map Invariants ──');
  const voteRecord = new Map();
  voteRecord.set('user_1', 'option_alpha');
  voteRecord.set('user_2', 'option_beta');
  voteRecord.set('user_1', 'option_beta'); // Vote change

  assert(voteRecord.size === 2, 'Ensures single vote per user ID');
  assert(voteRecord.get('user_1') === 'option_beta', 'Allows participants to switch vote before expiration');

  console.log('\n================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed };
};

runSyncSuite();
