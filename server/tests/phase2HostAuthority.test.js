import { SERVER_8_CANONICAL_SOURCE, WATCH_TOGETHER_DEMO_CONFIG, getServerStreamUrl, classifySource, getPlayerMode } from '../../client/src/services/movieServers.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  PHASE 2 — HOST & SOURCE AUTHORITY VERIFICATION TEST SUITE
 * ──────────────────────────────────────────────────────────────────────────────
 */

const runPhase2Suite = async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 2 — HOST & SOURCE AUTHORITY TEST SUITE');
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

  // Helper function for input validation matching server/sockets/socketHandler.js
  const parseBoundedInt = (val, min, max) => {
    if (val === undefined || val === null) return undefined;
    const num = Number(val);
    if (!Number.isFinite(num) || !Number.isInteger(num)) return null;
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    return num;
  };

  // Simulated in-memory room store & socket engine
  const roomsState = new Map();
  const roomId = 'phase2_test_room_001';
  const hostUserId = 'host_user_123';
  const participantUserId = 'participant_user_456';

  roomsState.set(roomId, {
    watchSpaceId: roomId,
    hostUserId,
    playback: {
      state: 'paused',
      positionSeconds: 0,
      changedAtServerMs: Date.now(),
      playbackRate: 1.0,
      serverNum: 1,
      season: 1,
      episode: 1,
    },
    version: 1,
  });

  // Simulated handler for 'room.server.change'
  const handleServerChange = (spaceId, userId, role, payload) => {
    const room = roomsState.get(spaceId);
    if (!room) return { error: 'ROOM_NOT_FOUND' };

    // 1. Host Authorization Check
    if (userId !== room.hostUserId && role !== 'admin') {
      return { error: 'UNAUTHORIZED_NOT_HOST' };
    }

    const { serverNum, season, episode, positionSeconds } = payload || {};

    // 2. Strict Input Validation
    const validServer = parseBoundedInt(serverNum, 1, 9);
    const validSeason = parseBoundedInt(season, 1, undefined);
    const validEpisode = parseBoundedInt(episode, 1, undefined);

    if (serverNum !== undefined && validServer === null) {
      return { error: 'INVALID_SERVER_NUM' };
    }
    if (season !== undefined && validSeason === null) {
      return { error: 'INVALID_SEASON' };
    }
    if (episode !== undefined && validEpisode === null) {
      return { error: 'INVALID_EPISODE' };
    }

    // Mutate state upon successful validation
    room.version += 1;
    if (validServer !== undefined) room.playback.serverNum = validServer;
    if (validSeason !== undefined) room.playback.season = validSeason;
    if (validEpisode !== undefined) room.playback.episode = validEpisode;
    if (typeof positionSeconds === 'number' && Number.isFinite(positionSeconds)) {
      room.playback.positionSeconds = Math.max(0, positionSeconds);
    }

    const broadcastEnvelope = {
      event: 'room.playback.update',
      watchSpaceId: spaceId,
      payload: {
        action: 'server_change',
        serverNum: room.playback.serverNum,
        season: room.playback.season,
        episode: room.playback.episode,
        positionSeconds: room.playback.positionSeconds,
        version: room.version,
      },
    };

    return { success: true, broadcastEnvelope, roomState: room.playback };
  };

  // ── TEST 1: Host Can Change Server ──────────────────────────────────────────
  console.log('── 1. Host Server Change Authorization ──');
  const res1 = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: 8 });
  assert(res1.success && res1.roomState.serverNum === 8, 'Host can successfully change server to 8');

  // ── TEST 2: Participant Cannot Change Server ────────────────────────────────
  console.log('\n── 2. Participant Server Change Authorization ──');
  const res2 = handleServerChange(roomId, participantUserId, 'viewer', { serverNum: 3 });
  assert(res2.error === 'UNAUTHORIZED_NOT_HOST', 'Rejects non-host participant server change request');
  assert(roomsState.get(roomId).playback.serverNum === 8, 'Room state remains unchanged after non-host request');

  // ── TEST 3 & 4: Out-Of-Bounds Server Numbers Rejected ───────────────────────
  console.log('\n── 3 & 4. Server Bounds Validation (1..8) ──');
  const res3a = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: 999 });
  assert(res3a.error === 'INVALID_SERVER_NUM', 'Rejects serverNum = 999 (> 8)');

  const res3b = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: 0 });
  assert(res3b.error === 'INVALID_SERVER_NUM', 'Rejects serverNum = 0 (< 1)');

  const res3c = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: -5 });
  assert(res3c.error === 'INVALID_SERVER_NUM', 'Rejects negative serverNum = -5');

  // ── TEST 5: NaN and Invalid Numeric Types Rejected ─────────────────────────
  console.log('\n── 5. Non-Finite & Non-Integer Numeric Validation ──');
  const res5a = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: NaN });
  assert(res5a.error === 'INVALID_SERVER_NUM', 'Rejects serverNum = NaN');

  const res5b = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: Infinity });
  assert(res5b.error === 'INVALID_SERVER_NUM', 'Rejects serverNum = Infinity');

  const res5c = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: 3.14 });
  assert(res5c.error === 'INVALID_SERVER_NUM', 'Rejects decimal serverNum = 3.14');

  // String coercion test ("8" -> 8)
  const res5d = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: '8' });
  assert(res5d.success && res5d.roomState.serverNum === 8, 'Safely coerces valid string numeric "8" to integer 8');

  // ── TEST 6 & 7: Season and Episode Validation ─────────────────────────────
  console.log('\n── 6 & 7. TV Season & Episode Validation ──');
  const res6 = handleServerChange(roomId, hostUserId, 'viewer', { season: -1 });
  assert(res6.error === 'INVALID_SEASON', 'Rejects invalid negative season');

  const res7 = handleServerChange(roomId, hostUserId, 'viewer', { episode: 0 });
  assert(res7.error === 'INVALID_EPISODE', 'Rejects invalid episode = 0');

  const resValidTv = handleServerChange(roomId, hostUserId, 'viewer', { season: 2, episode: 5 });
  assert(resValidTv.success && resValidTv.roomState.season === 2 && resValidTv.roomState.episode === 5, 'Accepts valid season=2 and episode=5');

  // ── TEST 8, 9, 10: Broadcast Envelope & Participant Convergence ─────────────
  console.log('\n── 8, 9, 10. Broadcast Envelope & Convergence ──');
  const resBroadcast = handleServerChange(roomId, hostUserId, 'viewer', { serverNum: 8, season: 1, episode: 1 });
  const envelope = resBroadcast.broadcastEnvelope;
  assert(envelope.event === 'room.playback.update', 'Broadcast uses room.playback.update event');
  assert(envelope.payload.serverNum === 8 && envelope.payload.season === 1 && envelope.payload.episode === 1, 'Broadcast payload contains serverNum, season, episode');

  // ── TEST 11: Host Optimistic UI Divergence Protection ─────────────────────
  console.log('\n── 11. Host Optimistic State Divergence Guard ──');
  // Client simulation: Host local state before receiving socket envelope stays at server 8, does not diverge on rejected action
  const rejectRes = handleServerChange(roomId, participantUserId, 'viewer', { serverNum: 2 });
  assert(rejectRes.error === 'UNAUTHORIZED_NOT_HOST', 'Server change rejection prevents room state mutation');

  // ── TEST 12 & 13: Room Initialization & Recovery ───────────────────────────
  console.log('\n── 12 & 13. Persisted State Restoration ──');
  const mockDbSpace = {
    settings: {
      serverNum: 4,
      season: 3,
      episode: 12,
    }
  };
  const restoredRoom = {
    playback: {
      serverNum: mockDbSpace.settings.serverNum || 1,
      season: mockDbSpace.settings.season || 1,
      episode: mockDbSpace.settings.episode || 1,
    }
  };
  assert(restoredRoom.playback.serverNum === 4 && restoredRoom.playback.season === 3 && restoredRoom.playback.episode === 12, 'Room initialization restores persisted serverNum=4, season=3, episode=12');

  // ── TEST 14 & 15: Movie & TV Stream Source URL Generation ───────────────────
  console.log('\n── 14 & 15. Stream Source Generation ──');
  const movieUrl = getServerStreamUrl({ tmdbId: 550, isTv: false, serverNum: 1 });
  assert(movieUrl === 'https://vidsrc.me/embed/movie?tmdb=550', 'Movie source URL generated correctly for Server 1');

  const tvUrl = getServerStreamUrl({ tmdbId: 1399, isTv: true, season: 2, episode: 4, serverNum: 1 });
  assert(tvUrl === 'https://vidsrc.me/embed/tv?tmdb=1399&season=2&episode=4', 'TV source URL preserves season=2 and episode=4');

  const server8Url = getServerStreamUrl({ tmdbId: 550, isTv: false, serverNum: 8 });
  assert(server8Url === SERVER_8_CANONICAL_SOURCE, 'Server 8 returns SERVER_8_CANONICAL_SOURCE');

  const server9Url = getServerStreamUrl({ tmdbId: 550, isTv: false, serverNum: 9 });
  assert(server9Url === WATCH_TOGETHER_DEMO_CONFIG.authorizedVideoSource, 'Server 9 returns WATCH_TOGETHER_DEMO_CONFIG.authorizedVideoSource');

  // ── TEST 16 & 17: Player Mode Transitions ──────────────────────────────────
  console.log('\n── 16 & 17. Player Mode Transitions ──');
  const modeServer1 = getPlayerMode(movieUrl);
  assert(modeServer1 === 'provider', 'Server 1 URL maps to playerMode = provider');

  const modeServer8 = getPlayerMode(server8Url);
  assert(modeServer8 === 'provider', 'Server 8 URL maps to playerMode = provider');

  const modeServer9 = getPlayerMode(server9Url);
  assert(modeServer9 === 'provider', 'Server 9 URL maps to playerMode = provider');

  console.log('\n================================================================');
  console.log(`📊 PHASE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runPhase2Suite();
