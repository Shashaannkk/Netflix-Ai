import mongoose from 'mongoose';
import { verifySocketToken } from '../middleware/authMiddleware.js';
import WatchSpace from '../models/WatchSpace.js';
import ChatMessage from '../models/ChatMessage.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  Socket.IO Handler — Part 6: Chat, Presence, Reconnection & Moderation
 *
 *  FEATURES:
 *  1. Live Presence (Join, Leave, Headcount, Reconnect state)
 *  2. Chat Engine with MongoDB Persistence (Ordered delivery & history)
 *  3. Typing Indicators & Emoji Reactions
 *  4. Host Moderation (Mute/Unmute, Kick, Room Lock, Host Transfer)
 *  5. Server-Side Permission Enforcement
 * ──────────────────────────────────────────────────────────────────────────────
 */

// In-memory room store (watchSpaceId -> roomState)
const roomsState = new Map();

/**
 * Standardized PRD event envelope helper.
 */
const buildEnvelope = (event, watchSpaceId, payload) => ({
  event,
  watchSpaceId,
  payload: payload || {},
  ts: Date.now(),
});

/**
 * Calculates projected authoritative playback position.
 */
const getAuthoritativePosition = (room, currentServerTimeMs = Date.now()) => {
  if (!room || !room.playback) return 0;
  const { state, positionSeconds, changedAtServerMs } = room.playback;
  if (state === 'playing') {
    const elapsedSec = (currentServerTimeMs - changedAtServerMs) / 1000;
    return Math.max(0, positionSeconds + elapsedSec * (room.playback.playbackRate || 1.0));
  }
  return Math.max(0, positionSeconds);
};

/**
 * Updates host connection status based on active connections in room.connections.
 * Emits room.host.disconnected if no active connections for room.hostUserId remain.
 */
const updateHostConnectionStatus = (room, spaceId, io) => {
  if (!room) return;
  let hostStillConnected = false;
  let activeHostSocketId = null;

  if (room.connections) {
    for (const [sId, conn] of room.connections.entries()) {
      if (conn.userId === room.hostUserId) {
        hostStillConnected = true;
        if (!activeHostSocketId || sId === room.hostSocketId) {
          activeHostSocketId = sId;
        }
      }
    }
  }

  if (hostStillConnected) {
    room.hostConnected = true;
    if (activeHostSocketId) {
      room.hostSocketId = activeHostSocketId;
    }
  } else {
    if (room.hostConnected) {
      room.hostConnected = false;
      const nowMs = Date.now();
      const frozenPos = getAuthoritativePosition(room, nowMs);
      room.playback = {
        state: 'paused',
        positionSeconds: frozenPos,
        changedAtServerMs: nowMs,
        playbackRate: room.playback?.playbackRate || 1.0,
      };
      room.version += 1;
      const roomKey = `space:${spaceId}`;
      io.to(roomKey).emit(
        'room.host.disconnected',
        buildEnvelope('room.host.disconnected', spaceId, {
          message: 'Host has disconnected. Playback paused.',
          positionSeconds: frozenPos,
          version: room.version,
        })
      );
    }
  }
};

/**
 * Builds active member list payload for room presence broadcasting.
 * Based on ACTIVE SOCKET CONNECTIONS in room.connections.
 */
const buildPresencePayload = (room) => {
  const membersList = [];
  if (room && room.connections) {
    for (const [sId, conn] of room.connections.entries()) {
      membersList.push({
        userId: conn.userId,
        socketId: conn.socketId,
        displayName: conn.displayName,
        isHost: conn.userId === room.hostUserId,
        isMuted: room.mutedUserIds ? room.mutedUserIds.has(conn.userId) : false,
      });
    }
  }
  return {
    members: membersList,
    count: membersList.length,
    isLocked: !!room?.isLocked,
    hostConnected: !!room?.hostConnected,
    hostUserId: room?.hostUserId || null,
  };
};
/**
 * Checks timeline events against current position and emits room.ai.trivia
 */
const checkAndEmitTrivia = (spaceId, room, currentPos, io) => {
  if (!room || !room.timeline || !room.playback || room.playback.state !== 'playing') return;
  const triviaEvents = room.timeline.filter((e) => e.eventType === 'trivia');
  for (const t of triviaEvents) {
    if (Math.abs(currentPos - t.timestampStart) <= 2.0 && !room.triggeredTrivia.has(t.timestampStart)) {
      room.triggeredTrivia.add(t.timestampStart);
      const triviaPayload = {
        timestampSec: t.timestampStart,
        question: t.payload?.question || 'Trivia question',
        hint: t.payload?.hint || null,
        answer: t.payload?.answer || null,
      };
      io.to(`space:${spaceId}`).emit(
        'room.ai.trivia',
        buildEnvelope('room.ai.trivia', spaceId, triviaPayload)
      );
      break;
    }
  }
};

export const initSocketHandler = (io) => {
  // ── 1. Auth middleware ─────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization;

    if (!token) {
      const guestId = new mongoose.Types.ObjectId().toString();
      socket.data.user = {
        id: guestId,
        _id: guestId,
        displayName: `Guest ${guestId.slice(-4)}`,
        role: 'viewer',
        isGuest: true
      };
      return next();
    }

    try {
      const decoded = verifySocketToken(token);
      socket.data.user = decoded; // { id, email, displayName, role }
      next();
    } catch (err) {
      const guestId = new mongoose.Types.ObjectId().toString();
      socket.data.user = {
        id: guestId,
        _id: guestId,
        displayName: `Guest ${guestId.slice(-4)}`,
        role: 'viewer',
        isGuest: true
      };
      next();
    }
  });

  // ── Background Ticker: Check active playing rooms for authored trivia markers (~1s accuracy) ──
  setInterval(() => {
    const nowMs = Date.now();
    for (const [spaceId, room] of roomsState.entries()) {
      if (room.playback && room.playback.state === 'playing') {
        const curPos = getAuthoritativePosition(room, nowMs);
        checkAndEmitTrivia(spaceId, room, curPos, io);
      }
    }
  }, 1000);

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const userId = user?.id || user?._id || socket.id;
    console.log(`[WATCH_SOCKET] client connected`);
    console.log(`[WATCH_SOCKET] socket id: ${socket.id}`);
    console.log(`[WATCH_SOCKET] authenticated user: ${userId} (${user?.displayName || 'Guest'})`);

    socket.emit('connection:ack', {
      success: true,
      message: 'Connected to Netflix AI Watch Spaces engine',
      socketId: socket.id,
      authenticated: !!user && !user.isGuest,
      timestamp: new Date().toISOString(),
    });

    // ── 2. Room Join & Presence Initialization ──────────────────────────────
    socket.on('space:join', async ({ spaceId } = {}) => {
      const currentUser = socket.data.user || {
        id: socket.id,
        _id: socket.id,
        displayName: 'Guest User',
        role: 'viewer'
      };

      if (!spaceId) {
        socket.emit('room.error', buildEnvelope('room.error', null, { message: 'spaceId is required.' }));
        return;
      }

      console.log(`[WATCH_SOCKET] room join requested: ${spaceId}`);
      const roomKey = `space:${spaceId}`;

      try {
        let space = null;
        if (mongoose.connection.readyState === 1) {
          try {
            if (mongoose.Types.ObjectId.isValid(spaceId)) {
              space = await WatchSpace.findById(spaceId)
                .select('status hostUserId settings titleId mediaId participantIds inviteCode')
                .populate('titleId', 'title timeline')
                .lean();
            } else {
              space = await WatchSpace.findOne({ inviteCode: spaceId })
                .select('status hostUserId settings titleId mediaId participantIds inviteCode')
                .populate('titleId', 'title timeline')
                .lean();
            }
          } catch (dbErr) {
            console.warn(`[WATCH_SOCKET] DB fetch fallback for ${spaceId}:`, dbErr.message);
          }
        }

        if (space && space.status === 'ended') {
          socket.emit('room.error', buildEnvelope('room.error', spaceId, { message: 'This Watch Space has ended.' }));
          return;
        }

        const hostUserIdStr = space ? space.hostUserId.toString() : null;
        let isHost = hostUserIdStr ? (currentUser.id === hostUserIdStr) : false;

        // Initialize or fetch in-memory room state
        let room = roomsState.get(spaceId);
        if (!room) {
          // If no existing room and space exists in DB, use space host. Otherwise first user joining becomes host.
          const effectiveHost = hostUserIdStr || currentUser.id;
          isHost = (currentUser.id === effectiveHost);

          const initialMuted = space?.settings?.mutedUserIds
            ? new Set(space.settings.mutedUserIds.map((id) => id.toString()))
            : new Set();

          room = {
            watchSpaceId: spaceId,
            mediaId: space?.mediaId ? space.mediaId.toString() : null,
            hostUserId: effectiveHost,
            isLocked: !!space?.settings?.isLocked,
            mutedUserIds: initialMuted,
            timeline: space?.titleId?.timeline || [],
            triggeredTrivia: new Set(),
            playback: {
              state: 'paused',
              positionSeconds: 0,
              changedAtServerMs: Date.now(),
              playbackRate: 1.0,
            },
            version: 1,
            hostSocketId: isHost ? socket.id : null,
            hostConnected: isHost,
            connections: new Map(),
            members: new Map(),
          };
          roomsState.set(spaceId, room);
        } else {
          if (space?.titleId?.timeline && (!room.timeline || room.timeline.length === 0)) {
            room.timeline = space.titleId.timeline;
          }
          if (!room.triggeredTrivia) room.triggeredTrivia = new Set();

          if (currentUser.id === room.hostUserId) {
            isHost = true;
            room.hostSocketId = socket.id;
            room.hostConnected = true;
          }
        }

        if (!room.connections) room.connections = new Map();
        if (!room.members) room.members = new Map();

        // Register socket connection presence (connection-aware)
        room.connections.set(socket.id, {
          userId: currentUser.id,
          socketId: socket.id,
          displayName: currentUser.displayName,
          isHost,
          joinedAt: Date.now(),
        });

        // Maintain user level presence map
        room.members.set(currentUser.id, {
          socketId: socket.id,
          displayName: currentUser.displayName,
          isHost,
        });

        socket.join(roomKey);
        console.log(`[WATCH_SOCKET] room join success: ${spaceId} | User: ${currentUser.displayName} (${socket.id})`);

        const nowMs = Date.now();
        const currentProjectedPos = getAuthoritativePosition(room, nowMs);

        // Emit initial playback state snapshot to newly joined participant
        socket.emit(
          'room.playback.update',
          buildEnvelope('room.playback.update', spaceId, {
            action: 'sync',
            state: room.playback.state,
            positionSeconds: currentProjectedPos,
            changedAtServerMs: room.playback.changedAtServerMs,
            playbackRate: room.playback.playbackRate || 1.0,
            version: room.version,
            isHost,
            hostConnected: room.hostConnected,
            serverTs: nowMs,
          })
        );

        // Broadcast presence update to room
        io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', spaceId, buildPresencePayload(room)));

        // Send recent chat message history from MongoDB if valid space ID
        let recentMessages = [];
        if (mongoose.Types.ObjectId.isValid(spaceId)) {
          try {
            recentMessages = await ChatMessage.find({ watchSpaceId: spaceId })
              .sort({ createdAt: 1 })
              .limit(50)
              .lean();
          } catch (mErr) {
            console.warn(`[WATCH_SOCKET] Could not fetch chat history for ${spaceId}:`, mErr.message);
          }
        }

        socket.emit('room.chat.history', buildEnvelope('room.chat.history', spaceId, { messages: recentMessages }));

      } catch (err) {
        console.error(`[WATCH_SOCKET] space:join error for ${spaceId}:`, err.stack || err.message);
        socket.emit('room.error', buildEnvelope('room.error', spaceId, { message: 'Failed to join Watch Space.' }));
      }
    });

    // ── 3. Playback Synchronization Updates (Host Only) ──────────────────────
    socket.on('room.playback.update', (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!user || !watchSpaceId || !payload) return;

      const room = roomsState.get(watchSpaceId);
      if (!room) return;

      // Strict Host Authorization: Compare socket.user.id with room.hostUserId
      if (user.id !== room.hostUserId && user.role !== 'admin') {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Unauthorized: Only the host can update playback state.' }));
        return;
      }

      const { action, positionSeconds, state, isPlaying, playbackRate } = payload;
      const nowMs = Date.now();

      // State versioning increment
      room.version += 1;

      const newPos = typeof positionSeconds === 'number' ? positionSeconds : getAuthoritativePosition(room, nowMs);
      const newState = state || (isPlaying ? 'playing' : 'paused');
      const newRate = typeof playbackRate === 'number' ? playbackRate : (room.playback.playbackRate || 1.0);

      room.playback = {
        state: newState,
        positionSeconds: Math.max(0, newPos),
        changedAtServerMs: nowMs,
        playbackRate: newRate,
      };
      room.hostConnected = true;
      room.hostSocketId = socket.id;

      const envelope = buildEnvelope('room.playback.update', watchSpaceId, {
        action: action || 'update',
        state: room.playback.state,
        positionSeconds: room.playback.positionSeconds,
        changedAtServerMs: room.playback.changedAtServerMs,
        playbackRate: room.playback.playbackRate,
        version: room.version,
        isHost: true,
        hostConnected: true,
        serverTs: nowMs,
      });

      io.to(`space:${watchSpaceId}`).emit('room.playback.update', envelope);

      // Check for authored timeline trivia around current timestamp
      if (typeof positionSeconds === 'number' && room.triggeredTrivia) {
        if (positionSeconds < (room.playback?.positionSeconds || 0)) {
          for (const ts of Array.from(room.triggeredTrivia)) {
            if (ts > positionSeconds) room.triggeredTrivia.delete(ts);
          }
        }
      }
      checkAndEmitTrivia(watchSpaceId, room, room.playback.positionSeconds, io);
    });

    // ── 4. Drift Measurement Ping/Pong ──────────────────────────────────────
    socket.on('room.sync.ping', (data) => {
      const { watchSpaceId, payload } = data || {};
      const room = watchSpaceId ? roomsState.get(watchSpaceId) : null;
      const nowMs = Date.now();

      const currentProjectedPos = room ? getAuthoritativePosition(room, nowMs) : 0;
      const state = room ? room.playback.state : 'paused';
      const playbackRate = room ? (room.playback.playbackRate || 1.0) : 1.0;
      const hostConnected = room ? room.hostConnected : false;

      socket.emit(
        'room.sync.pong',
        buildEnvelope('room.sync.pong', watchSpaceId, {
          clientTs: payload?.clientTs || nowMs,
          serverTs: nowMs,
          positionSeconds: currentProjectedPos,
          state,
          changedAtServerMs: room ? room.playback.changedAtServerMs : nowMs,
          playbackRate,
          version: room ? room.version : 1,
          hostConnected,
        })
      );
    });

    // ── 5. Chat Messaging (Persisted to MongoDB) ────────────────────────────
    socket.on('room.chat.message', async (data) => {
      const { watchSpaceId, payload } = data || {};
      const currentUser = socket.data.user || user || {
        id: socket.id,
        _id: socket.id,
        displayName: 'Guest User',
        role: 'viewer'
      };

      if (!watchSpaceId || !payload?.text) return;

      const room = roomsState.get(watchSpaceId);
      if (room && room.mutedUserIds && room.mutedUserIds.has(currentUser.id)) {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'You have been muted by the host.' }));
        return;
      }

      try {
        const textClean = String(payload.text)
          .replace(/[<>]/g, '')
          .slice(0, 500)
          .trim();
        if (!textClean) return;

        let chatMsg;
        try {
          chatMsg = await ChatMessage.create({
            watchSpaceId,
            senderId: currentUser.id,
            senderName: currentUser.displayName,
            text: textClean,
          });
        } catch (dbErr) {
          console.warn('[Socket.IO] Chat message DB persist fallback:', dbErr.message);
          chatMsg = {
            _id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            senderId: currentUser.id,
            senderName: currentUser.displayName,
            text: textClean,
            createdAt: new Date().toISOString(),
          };
        }

        const envelope = buildEnvelope('room.chat.message', watchSpaceId, {
          _id: chatMsg._id,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          text: chatMsg.text,
          createdAt: chatMsg.createdAt,
          isSystem: false,
        });

        // Broadcast to all room members
        io.to(`space:${watchSpaceId}`).emit('room.chat.message', envelope);
      } catch (err) {
        console.error('[Socket.IO] room.chat.message error:', err.message);
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Failed to deliver message.' }));
      }
    });

    // ── 6. Typing Indicators ────────────────────────────────────────────────
    socket.on('room.chat.typing', (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!user || !watchSpaceId) return;

      socket.to(`space:${watchSpaceId}`).emit(
        'room.chat.typing',
        buildEnvelope('room.chat.typing', watchSpaceId, {
          userId: user.id,
          displayName: user.displayName,
          isTyping: !!payload?.isTyping,
        })
      );
    });

    // ── 7. Emoji Reactions ──────────────────────────────────────────────────
    socket.on('room.chat.reaction', (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!user || !watchSpaceId || !payload?.emoji) return;

      const emojiClean = String(payload.emoji).slice(0, 10);

      io.to(`space:${watchSpaceId}`).emit(
        'room.chat.reaction',
        buildEnvelope('room.chat.reaction', watchSpaceId, {
          userId: user.id,
          displayName: user.displayName,
          emoji: emojiClean,
        })
      );
    });

    // ── 8. Host Moderation Commands ─────────────────────────────────────────
    socket.on('room.moderation.update', async (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!user || !watchSpaceId || !payload?.action) return;

      const room = roomsState.get(watchSpaceId);
      if (!room) return;

      // Permission Check: Host or Admin only
      if (user.id !== room.hostUserId && user.role !== 'admin') {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Unauthorized: Host privileges required.' }));
        return;
      }

      const { action, targetUserId, isLocked } = payload;
      const roomKey = `space:${watchSpaceId}`;

      try {
        if (action === 'mute' && targetUserId) {
          room.mutedUserIds.add(targetUserId);
          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', watchSpaceId, buildPresencePayload(room)));
        } else if (action === 'unmute' && targetUserId) {
          room.mutedUserIds.delete(targetUserId);
          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', watchSpaceId, buildPresencePayload(room)));
        } else if (action === 'lock') {
          room.isLocked = !!isLocked;
          if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(watchSpaceId)) {
            try { await WatchSpace.findByIdAndUpdate(watchSpaceId, { 'settings.isLocked': room.isLocked }); } catch {}
          }
          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', watchSpaceId, buildPresencePayload(room)));
        } else if (action === 'kick' && targetUserId) {
          if (room.connections) {
            for (const [sId, conn] of Array.from(room.connections.entries())) {
              if (conn.userId === targetUserId) {
                const targetSocket = io.sockets.sockets.get(sId);
                if (targetSocket) {
                  targetSocket.emit('room.kicked', buildEnvelope('room.kicked', watchSpaceId, { message: 'You have been removed from the Watch Space by the host.' }));
                  targetSocket.leave(roomKey);
                }
                room.connections.delete(sId);
              }
            }
          }
          if (room.members) {
            room.members.delete(targetUserId);
          }
          if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(watchSpaceId)) {
            try { await WatchSpace.findByIdAndUpdate(watchSpaceId, { $pull: { participantIds: targetUserId } }); } catch {}
          }
          updateHostConnectionStatus(room, watchSpaceId, io);
          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', watchSpaceId, buildPresencePayload(room)));
        } else if (action === 'transfer_host' && targetUserId) {
          room.hostUserId = targetUserId;
          if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(watchSpaceId)) {
            try { await WatchSpace.findByIdAndUpdate(watchSpaceId, { hostUserId: targetUserId }); } catch {}
          }
          updateHostConnectionStatus(room, watchSpaceId, io);
          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', watchSpaceId, buildPresencePayload(room)));
        }
      } catch (err) {
        console.error(`[Socket.IO] Moderation error (${action}):`, err.message);
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Failed to execute moderation action.' }));
      }
    });

    // ── 9. Part 8: Narrative Variation Voting Events ────────────────────────
    socket.on('room.variation.voteOpen', (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!user || !watchSpaceId || !payload?.variationPointId) return;

      const room = roomsState.get(watchSpaceId);
      if (!room) return;

      // Host Authorization Enforcement
      if (user.id !== room.hostUserId && user.role !== 'admin') {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Unauthorized: Only the host can open variation voting.' }));
        return;
      }

      const durationSec = payload.durationSec || 15;
      const expiresAt = Date.now() + durationSec * 1000;

      // Initialize active vote state
      room.activeVote = {
        variationPointId: payload.variationPointId,
        promptText: payload.promptText || 'Choose the story direction:',
        options: payload.options || [
          { id: 'opt_a', text: 'Option A (Canonical)' },
          { id: 'opt_b', text: 'Option B (Alternate Branch)' },
        ],
        votes: new Map(), // userId -> optionId
        expiresAt,
      };

      const roomKey = `space:${watchSpaceId}`;

      // Broadcast vote open to all room participants
      io.to(roomKey).emit(
        'room.variation.voteOpen',
        buildEnvelope('room.variation.voteOpen', watchSpaceId, {
          variationPointId: room.activeVote.variationPointId,
          promptText: room.activeVote.promptText,
          options: room.activeVote.options,
          durationSec,
          expiresAt,
        })
      );

      // Auto-close vote when countdown timer expires
      if (room.voteTimer) clearTimeout(room.voteTimer);
      room.voteTimer = setTimeout(() => {
        if (!room.activeVote) return;

        // Tally votes
        const tally = {};
        for (const optionId of room.activeVote.options.map((o) => o.id)) {
          tally[optionId] = 0;
        }
        for (const votedOptionId of room.activeVote.votes.values()) {
          if (tally[votedOptionId] !== undefined) tally[votedOptionId]++;
        }

        // Determine winning option
        let winnerId = room.activeVote.options[0].id;
        let maxVotes = -1;
        for (const [optId, count] of Object.entries(tally)) {
          if (count > maxVotes) {
            maxVotes = count;
            winnerId = optId;
          }
        }

        const winningOptionObj = room.activeVote.options.find((o) => o.id === winnerId) || room.activeVote.options[0];

        console.log(`[Socket.IO] Vote Closed | Room: ${watchSpaceId} | Winner: ${winningOptionObj.text} (${maxVotes} votes)`);

        const resultEnvelope = buildEnvelope('room.variation.applied', watchSpaceId, {
          variationPointId: room.activeVote.variationPointId,
          promptText: room.activeVote.promptText,
          winningOptionId: winningOptionObj.id,
          winningOptionText: winningOptionObj.text,
          totalVotes: room.activeVote.votes.size,
          appliedAt: new Date().toISOString(),
        });

        room.activeVote = null;
        io.to(roomKey).emit('room.variation.applied', resultEnvelope);
      }, durationSec * 1000);
    });

    // Submit Participant Vote
    socket.on('room.variation.voteSubmit', (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!user || !watchSpaceId || !payload?.optionId) return;

      const room = roomsState.get(watchSpaceId);
      if (!room || !room.activeVote) {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'No active variation vote in progress.' }));
        return;
      }

      if (Date.now() > room.activeVote.expiresAt) {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Voting window has expired.' }));
        return;
      }

      // Prevent duplicate voting (overwrites user's single vote)
      room.activeVote.votes.set(user.id, payload.optionId);

      // Tally current live votes
      const tally = {};
      for (const optionId of room.activeVote.options.map((o) => o.id)) {
        tally[optionId] = 0;
      }
      for (const votedOptionId of room.activeVote.votes.values()) {
        if (tally[votedOptionId] !== undefined) tally[votedOptionId]++;
      }

      io.to(`space:${watchSpaceId}`).emit(
        'room.variation.voteTally',
        buildEnvelope('room.variation.voteTally', watchSpaceId, {
          variationPointId: room.activeVote.variationPointId,
          tally,
          totalVotes: room.activeVote.votes.size,
        })
      );
    });

    // ── 10. Localization Variant Updates ─────────────────────────────────────
    socket.on('room.localization.update', (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!user || !watchSpaceId || !payload?.locale) return;

      const room = roomsState.get(watchSpaceId);
      if (!room) return;

      socket.to(`space:${watchSpaceId}`).emit(
        'room.localization.update',
        buildEnvelope('room.localization.update', watchSpaceId, {
          userId: user.id,
          displayName: user.displayName,
          locale: payload.locale,
          subtitleTrack: payload.subtitleTrack || 'English',
        })
      );
    });

    // ── 9. Disconnect Handling ──────────────────────────────────────────────
    socket.on('space:leave', ({ spaceId } = {}) => {
      if (!spaceId) return;
      const roomKey = `space:${spaceId}`;
      socket.leave(roomKey);

      const room = roomsState.get(spaceId);
      if (room) {
        if (room.connections && room.connections.has(socket.id)) {
          room.connections.delete(socket.id);
        }
        const currentUserId = user?.id || user?._id || socket.id;
        let userHasOtherConnections = false;
        if (room.connections && currentUserId) {
          for (const conn of room.connections.values()) {
            if (conn.userId === currentUserId) {
              userHasOtherConnections = true;
              break;
            }
          }
        }
        if (!userHasOtherConnections && room.members && currentUserId) {
          room.members.delete(currentUserId);
        }

        updateHostConnectionStatus(room, spaceId, io);
        io.to(roomKey).emit(
          'room.presence.update',
          buildEnvelope('room.presence.update', spaceId, buildPresencePayload(room))
        );
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WATCH_SOCKET] client disconnected: ${socket.id} | reason: ${reason}`);
      const currentUserId = user?.id || user?._id || socket.id;
      for (const [spaceId, room] of roomsState.entries()) {
        if (room.connections && room.connections.has(socket.id)) {
          room.connections.delete(socket.id);

          let userHasOtherConnections = false;
          for (const conn of room.connections.values()) {
            if (conn.userId === currentUserId) {
              userHasOtherConnections = true;
              break;
            }
          }
          if (!userHasOtherConnections && room.members && currentUserId) {
            room.members.delete(currentUserId);
          }

          updateHostConnectionStatus(room, spaceId, io);
          const roomKey = `space:${spaceId}`;
          io.to(roomKey).emit(
            'room.presence.update',
            buildEnvelope('room.presence.update', spaceId, buildPresencePayload(room))
          );
        }
      }
    });
  });
};

export const getActiveViewerCount = (spaceId) => {
  if (!spaceId) return 0;
  const room = roomsState.get(String(spaceId));
  if (!room || !room.connections) return 0;
  return room.connections.size;
};
