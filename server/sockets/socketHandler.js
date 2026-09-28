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
 * Builds active member list payload for room presence broadcasting.
 */
const buildPresencePayload = (room) => {
  const membersList = [];
  for (const [userId, member] of room.members.entries()) {
    membersList.push({
      userId,
      displayName: member.displayName,
      isHost: userId === room.hostUserId,
      isMuted: room.mutedUserIds.has(userId),
    });
  }
  return {
    members: membersList,
    count: membersList.length,
    isLocked: !!room.isLocked,
    hostConnected: !!room.hostConnected,
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
      socket.data.user = null;
      return next();
    }

    try {
      const decoded = verifySocketToken(token);
      socket.data.user = decoded; // { id, email, displayName, role }
      next();
    } catch (err) {
      socket.data.user = null;
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
    console.log(
      `[Socket.IO] Client connected: ${socket.id}` +
      (user ? ` | User: ${user.displayName} (${user.role})` : ' | Guest')
    );

    socket.emit('connection:ack', {
      success: true,
      message: 'Connected to Netflix AI Watch Spaces engine',
      socketId: socket.id,
      authenticated: !!user,
      timestamp: new Date().toISOString(),
    });

    // ── 2. Room Join & Presence Initialization ──────────────────────────────
    socket.on('space:join', async ({ spaceId } = {}) => {
      if (!user) {
        socket.emit('room.error', buildEnvelope('room.error', spaceId, { message: 'Authentication required.' }));
        return;
      }

      if (!spaceId) {
        socket.emit('room.error', buildEnvelope('room.error', null, { message: 'spaceId is required.' }));
        return;
      }

      const roomKey = `space:${spaceId}`;

      try {
        const space = await WatchSpace.findById(spaceId)
          .select('status hostUserId settings titleId mediaId participantIds')
          .populate('titleId', 'title timeline')
          .lean();

        if (!space) {
          socket.emit('room.error', buildEnvelope('room.error', spaceId, { message: 'Watch Space not found.' }));
          return;
        }

        if (space.status === 'ended') {
          socket.emit('room.error', buildEnvelope('room.error', spaceId, { message: 'This Watch Space has ended.' }));
          return;
        }

        const hostUserIdStr = space.hostUserId.toString();
        const isHost = user.id === hostUserIdStr;

        // Check if room is locked for non-members
        const isExistingMember = isHost || (space.participantIds || []).some((p) => p.toString() === user.id);
        if (space.settings?.isLocked && !isExistingMember) {
          socket.emit('room.error', buildEnvelope('room.error', spaceId, { message: 'This Watch Space is locked by the host.' }));
          return;
        }

        // Initialize or fetch in-memory room state
        let room = roomsState.get(spaceId);
        if (!room) {
          const initialMuted = new Set((space.settings?.mutedUserIds || []).map((id) => id.toString()));
          room = {
            watchSpaceId: spaceId,
            mediaId: space.mediaId ? space.mediaId.toString() : null,
            hostUserId: hostUserIdStr,
            isLocked: !!space.settings?.isLocked,
            mutedUserIds: initialMuted,
            timeline: space.titleId?.timeline || [],
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
            members: new Map(),
          };
          roomsState.set(spaceId, room);
        } else {
          if (!room.timeline || room.timeline.length === 0) {
            room.timeline = space.titleId?.timeline || [];
            if (!room.triggeredTrivia) room.triggeredTrivia = new Set();
          }
          if (isHost) {
            room.hostSocketId = socket.id;
            room.hostConnected = true;
          }
        }

        // Register member presence
        room.members.set(user.id, {
          socketId: socket.id,
          displayName: user.displayName,
          isHost,
        });

        socket.join(roomKey);
        console.log(`[Socket.IO] ${user.displayName} joined room: ${roomKey}`);

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

        // Send recent chat message history from MongoDB
        const recentMessages = await ChatMessage.find({ watchSpaceId: spaceId })
          .sort({ createdAt: 1 })
          .limit(50)
          .lean();

        socket.emit('room.chat.history', buildEnvelope('room.chat.history', spaceId, { messages: recentMessages }));

      } catch (err) {
        console.error(`[Socket.IO] space:join error for ${spaceId}:`, err.message);
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
      if (!user || !watchSpaceId || !payload?.text) return;

      const room = roomsState.get(watchSpaceId);
      if (room && room.mutedUserIds.has(user.id)) {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'You have been muted by the host.' }));
        return;
      }

      try {
        const textClean = String(payload.text)
          .replace(/[<>]/g, '')
          .slice(0, 500)
          .trim();
        if (!textClean) return;

        // Persist message to MongoDB for history & ordered retrieval
        const chatMsg = await ChatMessage.create({
          watchSpaceId,
          senderId: user.id,
          senderName: user.displayName,
          text: textClean,
        });

        const envelope = buildEnvelope('room.chat.message', watchSpaceId, {
          _id: chatMsg._id,
          senderId: user.id,
          senderName: user.displayName,
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
          await WatchSpace.findByIdAndUpdate(watchSpaceId, { 'settings.isLocked': room.isLocked });
          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', watchSpaceId, buildPresencePayload(room)));
        } else if (action === 'kick' && targetUserId) {
          const targetMember = room.members.get(targetUserId);
          if (targetMember?.socketId) {
            const targetSocket = io.sockets.sockets.get(targetMember.socketId);
            if (targetSocket) {
              targetSocket.emit('room.kicked', buildEnvelope('room.kicked', watchSpaceId, { message: 'You have been removed from the Watch Space by the host.' }));
              targetSocket.leave(roomKey);
            }
          }
          room.members.delete(targetUserId);
          await WatchSpace.findByIdAndUpdate(watchSpaceId, { $pull: { participantIds: targetUserId } });
          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', watchSpaceId, buildPresencePayload(room)));
        } else if (action === 'transfer_host' && targetUserId) {
          room.hostUserId = targetUserId;
          await WatchSpace.findByIdAndUpdate(watchSpaceId, { hostUserId: targetUserId });
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
      if (room && user) {
        room.members.delete(user.id);
        if (user.id === room.hostUserId || socket.id === room.hostSocketId) {
          const nowMs = Date.now();
          const frozenPos = getAuthoritativePosition(room, nowMs);
          room.hostConnected = false;
          room.playback = {
            state: 'paused',
            positionSeconds: frozenPos,
            changedAtServerMs: nowMs,
            playbackRate: room.playback?.playbackRate || 1.0,
          };
          room.version += 1;
          io.to(roomKey).emit('room.host.disconnected', buildEnvelope('room.host.disconnected', spaceId, {
            message: 'Host has disconnected. Playback paused.',
            positionSeconds: frozenPos,
            version: room.version,
          }));
        }
        io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', spaceId, buildPresencePayload(room)));
      }
    });

    socket.on('disconnect', () => {
      if (!user) return;
      for (const [spaceId, room] of roomsState.entries()) {
        if (room.members.has(user.id)) {
          room.members.delete(user.id);
          const roomKey = `space:${spaceId}`;

          if (user.id === room.hostUserId || socket.id === room.hostSocketId) {
            const nowMs = Date.now();
            const frozenPos = getAuthoritativePosition(room, nowMs);
            room.hostConnected = false;
            room.playback = {
              state: 'paused',
              positionSeconds: frozenPos,
              changedAtServerMs: nowMs,
              playbackRate: room.playback?.playbackRate || 1.0,
            };
            room.version += 1;
            io.to(roomKey).emit('room.host.disconnected', buildEnvelope('room.host.disconnected', spaceId, {
              message: 'Host has disconnected. Playback paused.',
              positionSeconds: frozenPos,
              version: room.version,
            }));
          }

          io.to(roomKey).emit('room.presence.update', buildEnvelope('room.presence.update', spaceId, buildPresencePayload(room)));
        }
      }
    });
  });
};


