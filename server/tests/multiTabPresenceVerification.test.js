import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from '../../client/node_modules/socket.io-client/build/esm/index.js';
import { initSocketHandler } from '../sockets/socketHandler.js';
import { generateAccessToken } from '../utils/jwt.js';

const runVerification = async () => {
  console.log('================================================================');
  console.log('🧪 MULTI-TAB ACTIVE SOCKET CONNECTION PRESENCE VERIFICATION TEST');
  console.log('================================================================\n');

  const app = express();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  initSocketHandler(ioServer);

  await new Promise((resolve) => server.listen(5098, resolve));
  console.log('✅ Server listening on port 5098');

  const SERVER_URL = 'http://localhost:5098';
  const roomId = 'test_space_multitab_001';

  // Helper to create connected socket with user token
  const createSocket = async (token) => {
    const s = ioClient(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });
    await new Promise((resolve) => s.on('connect', resolve));
    return s;
  };

  // Generate test user tokens
  const hostToken = generateAccessToken({ _id: 'user_host_1', email: 'host@test.com', displayName: 'Host Alice' });
  const userAToken = generateAccessToken({ _id: 'user_A_2', email: 'usera@test.com', displayName: 'User Bob' });
  const userBToken = generateAccessToken({ _id: 'user_B_3', email: 'userb@test.com', displayName: 'User Charlie' });

  let hostPresenceCount = 0;

  // Step 0: Host joins room
  console.log('\n--- Host Joining Room ---');
  const hostSocket = await createSocket(hostToken);
  hostSocket.on('room.presence.update', (envelope) => {
    hostPresenceCount = envelope.payload?.count || 0;
  });
  hostSocket.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  // Test A: Browser 1 logged in as User A joins -> count should be 2
  console.log('\n--- Test A: Browser 1 (User A - Tab 1) Joins ---');
  const browser1 = await createSocket(userAToken);
  browser1.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));
  console.log(`Presence count after Browser 1 joins: ${hostPresenceCount}`);
  if (hostPresenceCount !== 2) {
    console.error(`❌ Test A FAIL: Expected 2 (Host + User A Tab 1), got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ Test A PASS: Count is 2 (Host + User A Tab 1)');

  // Test B: Browser 2 logged in as DIFFERENT user (User B) joins -> count = 3
  console.log('\n--- Test B: Browser 2 (User B) Joins ---');
  const browser2 = await createSocket(userBToken);
  browser2.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));
  console.log(`Presence count after Browser 2 joins: ${hostPresenceCount}`);
  if (hostPresenceCount !== 3) {
    console.error(`❌ Test B FAIL: Expected 3 (Host + User A + User B), got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ Test B PASS: Count is 3');

  // Test C: Browser 3 logs in as SAME user as Browser 1 (User A - Tab 2) and joins -> count = 4
  console.log('\n--- Test C: Browser 3 (User A - Tab 2) Joins ---');
  const browser3 = await createSocket(userAToken);
  browser3.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));
  console.log(`Presence count after Browser 3 joins: ${hostPresenceCount}`);
  if (hostPresenceCount !== 4) {
    console.error(`❌ Test C FAIL: Expected 4 (Host + User A Tab 1 + User B + User A Tab 2), got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ Test C PASS: Same user in second browser tab counted as active connection (Count = 4)');

  // Test D: Browser 1 (User A Tab 1) leaves -> count = 3
  console.log('\n--- Test D: Browser 1 (User A Tab 1) Leaves ---');
  browser1.emit('space:leave', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));
  console.log(`Presence count after Browser 1 leaves: ${hostPresenceCount}`);
  if (hostPresenceCount !== 3) {
    console.error(`❌ Test D FAIL: Expected 3 after Tab 1 leaves, got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ Test D PASS: Only Browser 1 removed, count is 3');

  // Test E: Browser 3 (User A Tab 2) leaves -> count = 2
  console.log('\n--- Test E: Browser 3 (User A Tab 2) Leaves ---');
  browser3.emit('space:leave', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));
  console.log(`Presence count after Browser 3 leaves: ${hostPresenceCount}`);
  if (hostPresenceCount !== 2) {
    console.error(`❌ Test E FAIL: Expected 2 after Tab 2 leaves, got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ Test E PASS: User A Tab 2 leaves, count is 2 (Host + User B)');

  // Test F: Unexpected disconnect (Browser 2)
  console.log('\n--- Test F: Browser 2 (User B) Disconnects Unexpectedly ---');
  browser2.disconnect();
  await new Promise((r) => setTimeout(r, 400));
  console.log(`Presence count after Browser 2 disconnect: ${hostPresenceCount}`);
  if (hostPresenceCount !== 1) {
    console.error(`❌ Test F FAIL: Expected 1 after User B disconnect, got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ Test F PASS: Disconnect updated presence automatically (Count = 1)');

  // Test G: Host kicks User A when User A has two active sockets
  console.log('\n--- Test G: Host Kicks User A With 2 Active Browser Tabs ---');
  const browserA1 = await createSocket(userAToken);
  const browserA2 = await createSocket(userAToken);

  let browserA1Kicked = false;
  let browserA2Kicked = false;
  browserA1.on('room.kicked', () => { browserA1Kicked = true; });
  browserA2.on('room.kicked', () => { browserA2Kicked = true; });

  browserA1.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 200));
  browserA2.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  console.log(`Count with User A connected via 2 tabs: ${hostPresenceCount}`);
  if (hostPresenceCount !== 3) {
    console.error(`❌ Test G setup FAIL: Expected 3, got ${hostPresenceCount}`);
    process.exit(1);
  }

  // Host kicks User A by user.id
  hostSocket.emit('room.moderation.update', {
    watchSpaceId: roomId,
    payload: { action: 'kick', targetUserId: 'user_A_2' }
  });
  await new Promise((r) => setTimeout(r, 500));

  console.log(`Count after host kicks User A: ${hostPresenceCount}`);
  if (hostPresenceCount !== 1 || !browserA1Kicked || !browserA2Kicked) {
    console.error(`❌ Test G FAIL: Expected count = 1 and both tabs kicked. Got count=${hostPresenceCount}, Tab1 Kicked=${browserA1Kicked}, Tab2 Kicked=${browserA2Kicked}`);
    process.exit(1);
  }
  console.log('✅ Test G PASS: Kicking user ID removed all active socket connections belonging to that user');

  console.log('\n================================================================');
  console.log('🎉 ALL PRESENCE CONNECTION TESTS (A THROUGH G) PASSED CLEANLY!');
  console.log('================================================================\n');

  hostSocket.disconnect();
  browser1.disconnect();
  browser2.disconnect();
  browser3.disconnect();
  browserA1.disconnect();
  browserA2.disconnect();
  server.close();
  process.exit(0);
};

runVerification().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
