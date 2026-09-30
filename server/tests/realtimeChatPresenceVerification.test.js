import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from '../../client/node_modules/socket.io-client/build/esm/index.js';
import { initSocketHandler } from '../sockets/socketHandler.js';

const runVerification = async () => {
  console.log('================================================================');
  console.log('🧪 REAL-TIME CHAT & SOCKET CONNECTION VERIFICATION TEST');
  console.log('================================================================\n');

  const app = express();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  initSocketHandler(ioServer);

  await new Promise((resolve) => server.listen(5099, resolve));
  console.log('✅ Server listening on port 5099');

  const SERVER_URL = 'http://localhost:5099';
  const roomId = 'test_space_realtime_001';

  let hostReceivedMessage = null;
  let participantReceivedMessage = null;
  let hostPresenceCount = 0;
  let participantPresenceCount = 0;

  // 1. Connect Host Browser Client
  console.log('\n--- Step 1: Connecting Host Socket ---');
  const hostSocket = ioClient(SERVER_URL, {
    transports: ['websocket', 'polling'],
    forceNew: true,
  });

  await new Promise((resolve) => {
    hostSocket.on('connect', () => {
      console.log(`[HOST_CLIENT] Connected with ID: ${hostSocket.id} | transport: ${hostSocket.io.engine.transport.name}`);
      resolve();
    });
  });

  // Host Join Room
  console.log('\n--- Step 2: Host Joining Room ---');
  hostSocket.on('room.presence.update', (envelope) => {
    hostPresenceCount = envelope.payload?.count || 0;
    console.log(`[HOST_CLIENT] Presence Update: ${hostPresenceCount} member(s)`);
  });

  hostSocket.on('room.chat.message', (envelope) => {
    console.log(`[HOST_CLIENT] Received Chat:`, envelope.payload);
    hostReceivedMessage = envelope.payload;
  });

  hostSocket.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  if (hostPresenceCount !== 1) {
    console.error(`❌ FAIL: Host presence count expected 1, got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ PASS: Host joined room successfully. Viewer count = 1');

  // 2. Connect Participant Browser Client
  console.log('\n--- Step 3: Connecting Participant Socket ---');
  const participantSocket = ioClient(SERVER_URL, {
    transports: ['websocket', 'polling'],
    forceNew: true,
  });

  await new Promise((resolve) => {
    participantSocket.on('connect', () => {
      console.log(`[PARTICIPANT_CLIENT] Connected with ID: ${participantSocket.id} | transport: ${participantSocket.io.engine.transport.name}`);
      resolve();
    });
  });

  participantSocket.on('room.presence.update', (envelope) => {
    participantPresenceCount = envelope.payload?.count || 0;
    console.log(`[PARTICIPANT_CLIENT] Presence Update: ${participantPresenceCount} member(s)`);
  });

  participantSocket.on('room.chat.message', (envelope) => {
    console.log(`[PARTICIPANT_CLIENT] Received Chat:`, envelope.payload);
    participantReceivedMessage = envelope.payload;
  });

  console.log('\n--- Step 4: Participant Joining Room ---');
  participantSocket.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  if (hostPresenceCount !== 2 || participantPresenceCount !== 2) {
    console.error(`❌ FAIL: Expected presence count = 2, got Host=${hostPresenceCount}, Participant=${participantPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ PASS: Both Host and Participant present in room. Viewer count = 2');

  // 3. Host Sends Live Chat Message
  console.log('\n--- Step 5: Host Sending Chat Message ---');
  hostSocket.emit('room.chat.message', {
    watchSpaceId: roomId,
    payload: { text: 'TEST FROM HOST' },
  });

  await new Promise((r) => setTimeout(r, 400));

  if (!participantReceivedMessage || participantReceivedMessage.text !== 'TEST FROM HOST') {
    console.error(`❌ FAIL: Participant did not receive host chat message.`);
    process.exit(1);
  }
  console.log('✅ PASS: Participant received message from Host: "TEST FROM HOST"');

  // 4. Participant Sends Live Chat Message
  console.log('\n--- Step 6: Participant Sending Chat Message ---');
  participantSocket.emit('room.chat.message', {
    watchSpaceId: roomId,
    payload: { text: 'TEST FROM PARTICIPANT' },
  });

  await new Promise((r) => setTimeout(r, 400));

  if (!hostReceivedMessage || hostReceivedMessage.text !== 'TEST FROM PARTICIPANT') {
    console.error(`❌ FAIL: Host did not receive participant chat message.`);
    process.exit(1);
  }
  console.log('✅ PASS: Host received message from Participant: "TEST FROM PARTICIPANT"');

  // 5. Participant Disconnects
  console.log('\n--- Step 7: Testing Disconnect & Presence ---');
  participantSocket.disconnect();
  await new Promise((r) => setTimeout(r, 400));

  if (hostPresenceCount !== 1) {
    console.error(`❌ FAIL: Host presence count after participant disconnect expected 1, got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ PASS: Participant disconnected. Host viewer count returned to 1');

  // 6. Participant Reconnects
  console.log('\n--- Step 8: Testing Reconnect & Re-join ---');
  participantSocket.connect();
  await new Promise((resolve) => participantSocket.on('connect', resolve));
  participantSocket.emit('space:join', { spaceId: roomId });
  await new Promise((r) => setTimeout(r, 400));

  if (hostPresenceCount !== 2) {
    console.error(`❌ FAIL: Host presence count after reconnect expected 2, got ${hostPresenceCount}`);
    process.exit(1);
  }
  console.log('✅ PASS: Participant reconnected and rejoined. Viewer count returned to 2');

  console.log('\n================================================================');
  console.log('🎉 ALL REAL-TIME SOCKET CHAT & PRESENCE TESTS PASSED CLEANLY!');
  console.log('================================================================\n');

  hostSocket.disconnect();
  participantSocket.disconnect();
  server.close();
  process.exit(0);
};

runVerification().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
