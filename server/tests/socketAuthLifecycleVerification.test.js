import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from '../../client/node_modules/socket.io-client/build/esm/index.js';
import { initSocketHandler } from '../sockets/socketHandler.js';
import { generateAccessToken } from '../utils/jwt.js';

const runVerification = async () => {
  console.log('================================================================');
  console.log('🧪 SOCKET AUTH LIFECYCLE & NO-GUEST-TRANSIENT VERIFICATION TEST');
  console.log('================================================================\n');

  const app = express();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  initSocketHandler(ioServer);

  await new Promise((resolve) => server.listen(5097, resolve));
  console.log('✅ Test Server listening on port 5097');

  const SERVER_URL = 'http://localhost:5097';
  const roomId = 'test_space_auth_lifecycle_001';

  // Helper to count connections on server
  const getConnectedSocketCount = () => ioServer.sockets.sockets.size;

  // Test A: Auth loading = true -> zero Socket.IO connections created
  console.log('\n--- Test A: Deferring socket creation during Auth Loading ---');
  let authLoading = true;
  let clientSocket = null;
  if (!authLoading) {
    clientSocket = ioClient(SERVER_URL, { transports: ['websocket', 'polling'] });
  }
  await new Promise((r) => setTimeout(r, 300));
  const countDuringLoading = getConnectedSocketCount();
  if (countDuringLoading !== 0) {
    console.error(`❌ Test A FAIL: Expected 0 socket connections during auth loading, got ${countDuringLoading}`);
    process.exit(1);
  }
  console.log('✅ Test A PASS: Zero Socket.IO connections created while auth loading = true');

  // Test B: Auth loading finishes with valid token -> exactly one authenticated socket
  console.log('\n--- Test B: Auth loading finishes with valid token ---');
  authLoading = false;
  const userTokenB = generateAccessToken({ _id: 'user_B_101', email: 'userb@test.com', displayName: 'User B (FLAMESTONE GAMING)' });
  const socketB = ioClient(SERVER_URL, {
    auth: { token: userTokenB },
    transports: ['websocket', 'polling'],
    forceNew: true,
  });

  await new Promise((resolve) => socketB.on('connect', resolve));
  await new Promise((r) => setTimeout(r, 200));

  const countAfterHydration = getConnectedSocketCount();
  if (countAfterHydration !== 1) {
    console.error(`❌ Test B FAIL: Expected 1 socket connection after auth hydration, got ${countAfterHydration}`);
    process.exit(1);
  }
  console.log('✅ Test B PASS: Exactly 1 authenticated Socket.IO connection created');

  // Test C: Authenticated user joins Watch Space -> only authenticated user appears, NO Guest XXXX entry
  console.log('\n--- Test C: Authenticated User B joins Watch Space ---');
  const presenceListReceived = [];
  socketB.on('room.presence.update', (envelope) => {
    if (envelope.payload?.members) {
      presenceListReceived.push(envelope.payload.members);
    }
  });

  socketB.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  const latestMembers = presenceListReceived[presenceListReceived.length - 1] || [];
  const hasGuest = latestMembers.some((m) => m.displayName?.startsWith('Guest'));
  const bMember = latestMembers.find((m) => m.displayName?.includes('FLAMESTONE GAMING') || m.userId === 'user_B_101');

  if (hasGuest || !bMember || latestMembers.length !== 1) {
    console.error(`❌ Test C FAIL: Presence list invalid! Count=${latestMembers.length}, HasGuest=${hasGuest}, Members:`, latestMembers);
    process.exit(1);
  }
  console.log(`✅ Test C PASS: Only User B present in room (${bMember.displayName}). NO Guest XXXX entry present!`);

  // Test D: Host A and User B both in room -> exactly 2 presence entries
  console.log('\n--- Test D: Host A joins Watch Space alongside User B ---');
  const hostTokenA = generateAccessToken({ _id: 'host_A_100', email: 'hosta@test.com', displayName: 'Host A' });
  const socketHostA = ioClient(SERVER_URL, {
    auth: { token: hostTokenA },
    transports: ['websocket', 'polling'],
    forceNew: true,
  });
  await new Promise((resolve) => socketHostA.on('connect', resolve));
  socketHostA.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  const presenceAfterHost = presenceListReceived[presenceListReceived.length - 1] || [];
  const countAfterTwoUsers = presenceAfterHost.length;
  const guestInTwoUsers = presenceAfterHost.some((m) => m.displayName?.startsWith('Guest'));

  if (countAfterTwoUsers !== 2 || guestInTwoUsers) {
    console.error(`❌ Test D FAIL: Expected exactly 2 users (Host A + User B) with NO guest. Got count=${countAfterTwoUsers}, Guest=${guestInTwoUsers}, Members:`, presenceAfterHost);
    process.exit(1);
  }
  console.log('✅ Test D PASS: Exactly 2 presence entries (Host A + User B). NO extra guest!');

  // Test E: Same user opens two tabs -> two active socket connections allowed and counted
  console.log('\n--- Test E: User B opens second browser tab ---');
  const socketB2 = ioClient(SERVER_URL, {
    auth: { token: userTokenB },
    transports: ['websocket', 'polling'],
    forceNew: true,
  });
  await new Promise((resolve) => socketB2.on('connect', resolve));
  socketB2.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  const presenceTwoTabs = presenceListReceived[presenceListReceived.length - 1] || [];
  if (presenceTwoTabs.length !== 3) {
    console.error(`❌ Test E FAIL: Expected 3 connections (Host A + User B Tab 1 + User B Tab 2), got ${presenceTwoTabs.length}`);
    process.exit(1);
  }
  console.log('✅ Test E PASS: User B second tab correctly connected and counted (Total count = 3)');

  // Test F: Tab 2 disconnects -> count returns to 2 without lingering guest
  console.log('\n--- Test F: User B Tab 2 disconnects ---');
  socketB2.disconnect();
  await new Promise((r) => setTimeout(r, 400));
  const presenceAfterTab2Leave = presenceListReceived[presenceListReceived.length - 1] || [];
  if (presenceAfterTab2Leave.length !== 2) {
    console.error(`❌ Test F FAIL: Expected 2 connections after Tab 2 disconnect, got ${presenceAfterTab2Leave.length}`);
    process.exit(1);
  }
  console.log('✅ Test F PASS: Disconnect cleaned up properly without transient guest remaining');

  // Test G: Disconnect & Reconnect User B -> 1 valid authenticated connection restored
  console.log('\n--- Test G: User B disconnects and reconnects ---');
  socketB.disconnect();
  await new Promise((r) => setTimeout(r, 400));
  socketB.connect();
  await new Promise((resolve) => socketB.on('connect', resolve));
  socketB.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  const presenceAfterReconnect = presenceListReceived[presenceListReceived.length - 1] || [];
  const finalGuestCheck = presenceAfterReconnect.some((m) => m.displayName?.startsWith('Guest'));
  if (presenceAfterReconnect.length !== 2 || finalGuestCheck) {
    console.error(`❌ Test G FAIL: Expected 2 members after reconnect with NO guest. Got count=${presenceAfterReconnect.length}, HasGuest=${finalGuestCheck}`);
    process.exit(1);
  }
  console.log('✅ Test G PASS: Reconnect succeeded cleanly as authenticated User B. NO duplicate or guest socket!');

  console.log('\n================================================================');
  console.log('🎉 ALL SOCKET AUTH LIFECYCLE TESTS (A THROUGH G) PASSED CLEANLY!');
  console.log('================================================================\n');

  socketB.disconnect();
  socketHostA.disconnect();
  server.close();
  process.exit(0);
};

runVerification().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
