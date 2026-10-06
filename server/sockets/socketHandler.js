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
 * Helper to validate and coerce integer inputs within optional min/max bounds.
 * Returns null if invalid (non-numeric, NaN, Infinity, decimal, out of bounds).
 * Returns undefined if input is undefined or null (not provided).
 */
const parseBoundedInt = (val, min, max) => {
  if (val === undefined || val === null) return undefined;
  const num = Number(val);
  if (!Number.isFinite(num) || !Number.isInteger(num)) return null;
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  return num;
};

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

    // Helper to find existing room by any valid identifier (spaceId, canonicalId, or inviteCode)
    const findRoom = (id) => {
      if (!id) return null;
      const idStr = id.toString();
      if (roomsState.has(idStr)) return roomsState.get(idStr);
      for (const r of roomsState.values()) {
        if (r && (r.watchSpaceId === idStr || r.canonicalId === idStr || r.inviteCode === idStr)) {
          return r;
        }
      }
      return null;
    };

    // Helper to broadcast event to all room aliases
    const emitRoomBroadcast = (event, room, payloadData) => {
      if (!room) return;
      const targetWatchSpaceId = room.canonicalId || room.watchSpaceId;
      const envelope = buildEnvelope(event, targetWatchSpaceId, payloadData);

      io.to(`space:${targetWatchSpaceId}`).emit(event, envelope);
      if (room.inviteCode && room.inviteCode !== targetWatchSpaceId) {
        io.to(`space:${room.inviteCode}`).emit(event, envelope);
      }
      if (room.watchSpaceId && room.watchSpaceId !== targetWatchSpaceId && room.watchSpaceId !== room.inviteCode) {
        io.to(`space:${room.watchSpaceId}`).emit(event, envelope);
      }
    };

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

      try {
        let space = null;
        if (mongoose.connection.readyState === 1) {
          try {
            if (mongoose.Types.ObjectId.isValid(spaceId)) {
              space = await WatchSpace.findById(spaceId)
                .select('status hostUserId settings titleId mediaId participantIds inviteCode')
                .populate('titleId', 'tmdbId title timeline')
                .lean();
            } else {
              space = await WatchSpace.findOne({ inviteCode: spaceId })
                .select('status hostUserId settings titleId mediaId participantIds inviteCode')
                .populate('titleId', 'tmdbId title timeline')
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

        const canonicalId = space ? space._id.toString() : spaceId;
        const inviteCode = space ? space.inviteCode : null;
        const hostUserIdStr = space ? space.hostUserId.toString() : null;
        const currentUserId = (currentUser.id || currentUser._id || socket.id).toString();
        let isHost = hostUserIdStr ? (currentUserId === hostUserIdStr) : false;

        // Initialize or fetch in-memory room state (lookup by spaceId, canonicalId, or inviteCode)
        let room = findRoom(spaceId) || findRoom(canonicalId) || (inviteCode ? findRoom(inviteCode) : null);

        if (!room) {
          const effectiveHost = hostUserIdStr || currentUserId;
          isHost = (currentUserId === effectiveHost);

          const initialMuted = space?.settings?.mutedUserIds
            ? new Set(space.settings.mutedUserIds.map((id) => id.toString()))
            : new Set();

          room = {
            watchSpaceId: canonicalId,
            canonicalId,
            inviteCode,
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
              serverNum: space?.settings?.serverNum || 1,
              season: space?.settings?.season || 1,
              episode: space?.settings?.episode || 1,
            },
            version: 1,
            hostSocketId: isHost ? socket.id : null,
            hostConnected: isHost,
            connections: new Map(),
            members: new Map(),
          };

          roomsState.set(canonicalId, room);
          if (inviteCode) roomsState.set(inviteCode, room);
          if (spaceId !== canonicalId) roomsState.set(spaceId, room);
        } else {
          // Link room aliases so both inviteCode and ObjectId point to the same state
          if (canonicalId) room.canonicalId = canonicalId;
          if (inviteCode) room.inviteCode = inviteCode;
          roomsState.set(canonicalId, room);
          if (inviteCode) roomsState.set(inviteCode, room);
          if (spaceId !== canonicalId) roomsState.set(spaceId, room);

          if (space?.titleId?.timeline && (!room.timeline || room.timeline.length === 0)) {
            room.timeline = space.titleId.timeline;
          }
          if (!room.triggeredTrivia) room.triggeredTrivia = new Set();

          if (currentUserId === room.hostUserId) {
            isHost = true;
            room.hostSocketId = socket.id;
            room.hostConnected = true;
          }
        }

        if (!room.connections) room.connections = new Map();
        if (!room.members) room.members = new Map();

        // Register socket connection presence (connection-aware)
        room.connections.set(socket.id, {
          userId: currentUserId,
          socketId: socket.id,
          displayName: currentUser.displayName,
          isHost,
          joinedAt: Date.now(),
        });

        // Maintain user level presence map
        room.members.set(currentUserId, {
          socketId: socket.id,
          displayName: currentUser.displayName,
          isHost,
        });

        // Join socket channels for all aliases
        socket.join(`space:${canonicalId}`);
        if (inviteCode) socket.join(`space:${inviteCode}`);
        if (spaceId !== canonicalId) socket.join(`space:${spaceId}`);

        console.log(`[WATCH_SOCKET] room join success: ${canonicalId} (alias: ${spaceId}) | User: ${currentUser.displayName} (${socket.id})`);

        const nowMs = Date.now();
        const currentProjectedPos = getAuthoritativePosition(room, nowMs);

        // Emit initial playback state snapshot to newly joined participant
        socket.emit(
          'room.playback.update',
          buildEnvelope('room.playback.update', canonicalId, {
            action: 'sync',
            state: room.playback.state,
            positionSeconds: currentProjectedPos,
            changedAtServerMs: nowMs,
            playbackRate: room.playback.playbackRate || 1.0,
            serverNum: room.playback.serverNum || 1,
            season: room.playback.season || 1,
            episode: room.playback.episode || 1,
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
      if (!watchSpaceId || !payload) return;

      const room = findRoom(watchSpaceId);
      if (!room) return;

      const currentUser = socket.data.user || {
        id: socket.id,
        _id: socket.id,
        role: 'viewer'
      };
      const currentUserId = (currentUser.id || currentUser._id || socket.id).toString();
      const hostUserIdStr = room.hostUserId ? room.hostUserId.toString() : null;

      // Strict Host Authorization: Compare socket user id with room.hostUserId
      if (currentUserId !== hostUserIdStr && currentUser.role !== 'admin') {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Unauthorized: Only the host can update playback state.' }));
        return;
      }

      const { action, positionSeconds, state, isPlaying, playbackRate, serverNum, season, episode } = payload;
      const nowMs = Date.now();

      // State versioning increment
      room.version += 1;

      const newPos = typeof positionSeconds === 'number' ? positionSeconds : getAuthoritativePosition(room, nowMs);
      const newState = state || (isPlaying ? 'playing' : 'paused');
      const newRate = typeof playbackRate === 'number' ? playbackRate : (room.playback.playbackRate || 1.0);

      if (typeof serverNum === 'number') room.playback.serverNum = serverNum;
      if (typeof season === 'number') room.playback.season = season;
      if (typeof episode === 'number') room.playback.episode = episode;

      room.playback = {
        ...room.playback,
        state: newState,
        positionSeconds: Math.max(0, newPos),
        changedAtServerMs: nowMs,
        playbackRate: newRate,
      };
      room.hostConnected = true;
      room.hostSocketId = socket.id;

      emitRoomBroadcast('room.playback.update', room, {
        action: action || 'update',
        state: room.playback.state,
        positionSeconds: room.playback.positionSeconds,
        changedAtServerMs: room.playback.changedAtServerMs,
        playbackRate: room.playback.playbackRate,
        serverNum: room.playback.serverNum || 1,
        season: room.playback.season || 1,
        episode: room.playback.episode || 1,
        version: room.version,
        isHost: true,
        hostConnected: true,
        serverTs: nowMs,
      });

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

    // ── 3b. Server & Season/Episode Change (Host Only) ────────────────────────
    socket.on('room.server.change', async (data) => {
      const { watchSpaceId, payload } = data || {};
      if (!watchSpaceId || !payload) return;

      const room = findRoom(watchSpaceId);
      if (!room) return;

      const currentUser = socket.data.user || {
        id: socket.id,
        _id: socket.id,
        role: 'viewer'
      };
      const currentUserId = (currentUser.id || currentUser._id || socket.id).toString();
      const hostUserIdStr = room.hostUserId ? room.hostUserId.toString() : null;

      // Strict Host Authorization: Compare socket user id with room.hostUserId
      if (currentUserId !== hostUserIdStr && currentUser.role !== 'admin') {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Unauthorized: Only the host can change server or episode.' }));
        return;
      }

      const { serverNum, season, episode, positionSeconds } = payload;

      // Strict input validation
      const validServer = parseBoundedInt(serverNum, 1, 9);
      const validSeason = parseBoundedInt(season, 1, undefined);
      const validEpisode = parseBoundedInt(episode, 1, undefined);

      if (serverNum !== undefined && validServer === null) {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Invalid server selection. Must be an integer between 1 and 9.' }));
        return;
      }
      if (season !== undefined && validSeason === null) {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Invalid season selection. Must be a positive integer >= 1.' }));
        return;
      }
      if (episode !== undefined && validEpisode === null) {
        socket.emit('room.error', buildEnvelope('room.error', watchSpaceId, { message: 'Invalid episode selection. Must be a positive integer >= 1.' }));
        return;
      }

      const nowMs = Date.now();
      room.version += 1;

      if (validServer !== undefined) room.playback.serverNum = validServer;
      if (validSeason !== undefined) room.playback.season = validSeason;
      if (validEpisode !== undefined) room.playback.episode = validEpisode;

      if (typeof positionSeconds === 'number' && Number.isFinite(positionSeconds)) {
        room.playback.positionSeconds = Math.max(0, positionSeconds);
        room.playback.changedAtServerMs = nowMs;
      }

      console.log(`[WATCHSPACE SOCKET SERVER CHANGE] Space: ${watchSpaceId} | ServerNum: ${validServer} | Version: ${room.version} | Host: ${currentUserId}`);

      // Persist active source state to MongoDB WatchSpace document
      if (mongoose.connection.readyState === 1) {
        try {
          const updateObj = {};
          if (validServer !== undefined) updateObj['settings.serverNum'] = validServer;
          if (validSeason !== undefined) updateObj['settings.season'] = validSeason;
          if (validEpisode !== undefined) updateObj['settings.episode'] = validEpisode;

          if (Object.keys(updateObj).length > 0) {
            const targetDbId = room.canonicalId || watchSpaceId;
            if (mongoose.Types.ObjectId.isValid(targetDbId)) {
              await WatchSpace.findByIdAndUpdate(targetDbId, updateObj);
            } else if (room.inviteCode) {
              await WatchSpace.findOneAndUpdate({ inviteCode: room.inviteCode }, updateObj);
            }
          }
        } catch (dbErr) {
          console.warn(`[Socket.IO] Could not persist source state for space ${watchSpaceId}:`, dbErr.message);
        }
      }

      // Authoritative Broadcast to all room participants across all channel aliases
      emitRoomBroadcast('room.playback.update', room, {
        action: 'server_change',
        state: room.playback.state,
        positionSeconds: room.playback.positionSeconds,
        changedAtServerMs: room.playback.changedAtServerMs,
        playbackRate: room.playback.playbackRate || 1.0,
        serverNum: room.playback.serverNum || 1,
        season: room.playback.season || 1,
        episode: room.playback.episode || 1,
        version: room.version,
        isHost: true,
        hostConnected: true,
        serverTs: nowMs,
      });
    });

    // ── 4. Drift Measurement Ping/Pong ──────────────────────────────────────
    socket.on('room.sync.ping', (data) => {
      const { watchSpaceId, payload } = data || {};
      const room = watchSpaceId ? findRoom(watchSpaceId) : null;
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
          changedAtServerMs: nowMs,
          playbackRate,
          serverNum: room ? (room.playback.serverNum || 1) : 1,
          season: room ? (room.playback.season || 1) : 1,
          episode: room ? (room.playback.episode || 1) : 1,
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
        const isAiMsg = Boolean(payload.isAi);
        const senderNameClean = isAiMsg ? (payload.senderName || 'Nova') : currentUser.displayName;
        const textClean = String(payload.text)
          .replace(/[<>]/g, '')
          .slice(0, 1000)
          .trim();
        if (!textClean) return;

        let chatMsg;
        try {
          chatMsg = await ChatMessage.create({
            watchSpaceId,
            senderId: isAiMsg ? (new mongoose.Types.ObjectId()) : currentUser.id,
            senderName: senderNameClean,
            text: textClean,
            isAi: isAiMsg,
            sourceEvents: payload.sourceEvents || [],
          });
        } catch (dbErr) {
          console.warn('[Socket.IO] Chat message DB persist fallback:', dbErr.message);
          chatMsg = {
            _id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            senderId: currentUser.id,
            senderName: senderNameClean,
            text: textClean,
            isAi: isAiMsg,
            sourceEvents: payload.sourceEvents || [],
            createdAt: new Date().toISOString(),
          };
        }

        const envelope = buildEnvelope('room.chat.message', watchSpaceId, {
          _id: chatMsg._id,
          senderId: chatMsg.senderId,
          senderName: chatMsg.senderName,
          text: chatMsg.text,
          isAi: isAiMsg,
          sourceEvents: payload.sourceEvents || chatMsg.sourceEvents || [],
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
