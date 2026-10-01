import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from '../../client/node_modules/socket.io-client/build/esm/index.js';
import { initSocketHandler } from '../sockets/socketHandler.js';

// Helper simulating client-side history merge reducer logic from WatchSpaceContext.jsx
export const mergeChatMessages = (existing, incoming) => {
  const merged = [...existing, ...(incoming || [])];
  const unique = [];
  const seen = new Set();

  for (const msg of merged) {
    if (!msg) continue;
    const id = msg._id;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    unique.push(msg);
  }

  return unique.sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return aTime - bTime;
  });
};

const runMergeTests = async () => {
  console.log('================================================================');
  console.log('🧪 CLIENT-SIDE CHAT HISTORY MERGE VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  // Test A: Existing live message + history arrives without that message -> live message remains
  console.log('── Test A: Live message preserved when history arrives without it ──');
  const liveMsgA = { _id: 'live-1', text: 'Live unpersisted message', createdAt: '2026-10-01T12:00:00.000Z' };
  const historyA = [{ _id: 'hist-1', text: 'Persisted message 1', createdAt: '2026-10-01T11:00:00.000Z' }];
  const resultA = mergeChatMessages([liveMsgA], historyA);
  assert(
    resultA.some((m) => m._id === 'live-1') && resultA.length === 2,
    'Live unpersisted message remains in state alongside history',
    `Got length ${resultA.length}`
  );

  // Test B: Existing live message + history contains same _id -> only one copy remains
  console.log('\n── Test B: Duplicate _id deduplicated ──');
  const liveMsgB = { _id: 'msg-100', text: 'Same message', createdAt: '2026-10-01T12:00:00.000Z' };
  const historyB = [{ _id: 'msg-100', text: 'Same message', createdAt: '2026-10-01T12:00:00.000Z' }];
  const resultB = mergeChatMessages([liveMsgB], historyB);
  assert(
    resultB.length === 1 && resultB[0]._id === 'msg-100',
    'Deduplicates messages with identical _id',
    `Got length ${resultB.length}`
  );

  // Test C: History contains older messages -> they are added
  console.log('\n── Test C: Older history messages added ──');
  const liveMsgC = { _id: 'msg-recent', text: 'Recent live', createdAt: '2026-10-01T12:30:00.000Z' };
  const historyC = [
    { _id: 'msg-old1', text: 'Older 1', createdAt: '2026-10-01T10:00:00.000Z' },
    { _id: 'msg-old2', text: 'Older 2', createdAt: '2026-10-01T11:00:00.000Z' },
  ];
  const resultC = mergeChatMessages([liveMsgC], historyC);
  assert(
    resultC.length === 3 && resultC.some((m) => m._id === 'msg-old1') && resultC.some((m) => m._id === 'msg-old2'),
    'Adds older history messages to existing state'
  );

  // Test D: Messages remain chronological
  console.log('\n── Test D: Chronological ordering preserved ──');
  assert(
    resultC[0]._id === 'msg-old1' && resultC[1]._id === 'msg-old2' && resultC[2]._id === 'msg-recent',
    'Sorts messages in ascending order by createdAt timestamp'
  );

  // Test E: Empty history -> existing messages remain
  console.log('\n── Test E: Empty history keeps existing state ──');
  const resultE = mergeChatMessages([liveMsgA], []);
  assert(
    resultE.length === 1 && resultE[0]._id === 'live-1',
    'Preserves existing state intact when incoming history is empty'
  );

  // Test F: Existing room.chat.message realtime behavior still works with Socket.IO server
  console.log('\n── Test F: Realtime room.chat.message integration ──');
  const app = express();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
  initSocketHandler(ioServer);

  await new Promise((res) => server.listen(5097, res));
  const clientSocket = ioClient('http://localhost:5097', { forceNew: true, transports: ['websocket'] });
  await new Promise((res) => clientSocket.on('connect', res));

  let receivedRealtime = null;
  clientSocket.on('room.chat.message', (env) => {
    receivedRealtime = env.payload;
  });

  clientSocket.emit('space:join', { spaceId: 'test_merge_room' });
  await new Promise((r) => setTimeout(r, 200));

  clientSocket.emit('room.chat.message', {
    watchSpaceId: 'test_merge_room',
    payload: { text: 'Realtime test message' },
  });
  await new Promise((r) => setTimeout(r, 400));

  assert(
    receivedRealtime && receivedRealtime.text === 'Realtime test message',
    'Realtime room.chat.message event broadcast and reception works as expected'
  );

  clientSocket.disconnect();
  server.close();

  console.log('\n================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
};

runMergeTests().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
