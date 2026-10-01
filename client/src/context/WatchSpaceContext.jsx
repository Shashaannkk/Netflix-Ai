import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getSpace, updateSpaceStatus, leaveSpace, getSpaceMessages } from '../services/watchSpaceApi';
import { getAccessToken } from '../services/api';
import { useAuth } from './AuthContext';

const getWatchSpaceSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    if (
      envUrl &&
      !envUrl.includes('localhost') &&
      !envUrl.includes('127.0.0.1') &&
      !envUrl.includes('your-vercel-domain') &&
      !envUrl.includes('example.com')
    ) {
      return envUrl;
    }
    return window.location.origin;
  }
  return envUrl || 'http://localhost:5000';
};

const SOCKET_URL = getWatchSpaceSocketUrl();

const WatchSpaceContext = createContext(null);

/**
 * WatchSpaceProvider — Part 6 Chat, Presence & Moderation State Synchronizer
 */
export const WatchSpaceProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // ── Room state ──────────────────────────────────────────────────────────────
  const [currentSpace, setCurrentSpace] = useState(null);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [spaceError, setSpaceError]     = useState(null);

  // Derived flags
  const isHost = currentSpace
    ? currentSpace.hostUserId?._id === user?._id || currentSpace.hostUserId === user?._id
    : false;

  const participants = currentSpace?.participantIds || [];

  // ── Authoritative Playback State ────────────────────────────────────────────
  const [playbackState, setPlaybackState] = useState({
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1.0,
    hostConnected: true,
    lastUpdatedTs: Date.now(),
    action: 'initial',
  });

  const [driftInfo, setDriftInfo] = useState({
    rttMs: 0,
    driftMs: 0,
    status: 'synced',
    clockOffsetMs: 0,
  });

  const clockOffsetMsRef = useRef(0);
  const [currentTrivia, setCurrentTrivia] = useState(null);

  // ── Part 6: Presence, Chat, Reactions & Moderation State ────────────────────
  const [presenceState, setPresenceState] = useState({
    members: [],
    count: 0,
    isLocked: false,
    hostConnected: true,
    hostUserId: null,
  });

  const [chatMessages, setChatMessages]       = useState([]);
  const [typingUsers, setTypingUsers]         = useState({}); // { userId: displayName }
  const [floatingReactions, setFloatingReactions] = useState([]); // [{ id, displayName, emoji }]

  // ── Part 8: Narrative Variation Voting & Localization State ────────────────
  const [activeVote, setActiveVote]             = useState(null); // { variationPointId, promptText, options, durationSec, expiresAt }
  const [voteTally, setVoteTally]               = useState(null); // { optionId: count }
  const [userVotedOption, setUserVotedOption]   = useState(null); // optionId user voted for
  const [appliedVariation, setAppliedVariation] = useState(null); // { winningOptionId, winningOptionText, ... }
  const [selectedLocale, setSelectedLocale]     = useState('en-US');
  const [selectedSubtitle, setSelectedSubtitle] = useState('English (v1.2 Approved)');

  // ── Socket.IO ref & state ───────────────────────────────────────────────────
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketId, setSocketId]               = useState(null);
  const [socketTransport, setSocketTransport] = useState(null);
  const pingTimerRef = useRef(null);

  // ── Initialize socket connection ───────────────────────────────────────────
  useEffect(() => {
    if (authLoading) {
      console.log('[WATCH_SOCKET] Auth hydration in progress, deferring socket connection');
      return;
    }

    const token = getAccessToken();
    console.log('[WATCH_SOCKET] connecting to:', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      auth: { token: token || undefined },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      const transportName = socket.io?.engine?.transport?.name || 'unknown';
      console.log('[WATCH_SOCKET] connected');
      console.log('[WATCH_SOCKET] socket id:', socket.id);
      console.log('[WATCH_SOCKET] transport:', transportName);
      setSocketConnected(true);
      setSocketId(socket.id);
      setSocketTransport(transportName);

      if (currentSpace?._id) {
        console.log('[WATCH_SOCKET] room join requested:', currentSpace._id);
        socket.emit('space:join', { spaceId: currentSpace._id });
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[WATCH_SOCKET] connection error:', err?.message || err);
      setSocketConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WATCH_SOCKET] disconnected:', reason);
      setSocketConnected(false);
      setSocketId(null);
      setSocketTransport(null);
    });

    socket.on('connection:ack', (data) => {
      console.log('[WATCH_SOCKET] Server ACK:', data.message);
    });

    // ── PRD Event: room.playback.update ─────────────────────────────────────
    socket.on('room.playback.update', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;

      const now = Date.now();
      const estimatedServerNow = now + clockOffsetMsRef.current;
      const isPlaying = payload.state === 'playing' || !!payload.isPlaying;
      const elapsedSec = (isPlaying && payload.changedAtServerMs)
        ? Math.max(0, (estimatedServerNow - payload.changedAtServerMs) / 1000)
        : 0;
      const basePos = payload.positionSeconds ?? payload.currentTime ?? 0;
      const projectedPos = isPlaying
        ? Math.max(0, basePos + elapsedSec * (payload.playbackRate || 1.0))
        : Math.max(0, basePos);

      setPlaybackState({
        state: isPlaying ? 'playing' : 'paused',
        positionSeconds: projectedPos,
        currentTime: projectedPos,
        isPlaying,
        playbackRate: payload.playbackRate || 1.0,
        version: payload.version || 1,
        hostConnected: payload.hostConnected !== false,
        changedAtServerMs: payload.changedAtServerMs || now,
        lastUpdatedTs: now,
        action: payload.action || 'update',
      });
    });

    // ── PRD Event: room.host.disconnected ──────────────────────────────────
    socket.on('room.host.disconnected', (envelope) => {
      const { payload } = envelope || {};
      console.warn('[WatchSpaceContext] Host disconnected:', payload?.message);

      setPlaybackState((prev) => ({
        ...prev,
        state: 'paused',
        isPlaying: false,
        positionSeconds: payload?.positionSeconds ?? prev.positionSeconds,
        currentTime: payload?.positionSeconds ?? prev.currentTime,
        hostConnected: false,
        action: 'host_disconnected',
        lastUpdatedTs: Date.now(),
      }));
    });

    // ── PRD Event: room.sync.pong (Drift & Server Clock Offset calculation) ──
    socket.on('room.sync.pong', (envelope) => {
      const { payload } = envelope || {};
      if (!payload || !payload.clientTs) return;

      const now = Date.now();
      const rttMs = Math.max(0, now - payload.clientTs);
      const halfRttMs = rttMs / 2;
      const estimatedClockOffsetMs = (payload.serverTs || now) - (payload.clientTs + halfRttMs);
      clockOffsetMsRef.current = estimatedClockOffsetMs;

      const estimatedServerNow = now + estimatedClockOffsetMs;
      const isPlaying = payload.state === 'playing' || !!payload.isPlaying;
      const elapsedSec = (isPlaying && payload.changedAtServerMs)
        ? Math.max(0, (estimatedServerNow - payload.changedAtServerMs) / 1000)
        : 0;
      const basePos = payload.positionSeconds ?? payload.currentTime ?? 0;
      const projectedPos = isPlaying
        ? Math.max(0, basePos + elapsedSec * (payload.playbackRate || 1.0))
        : Math.max(0, basePos);

      setPlaybackState((prev) => {
        // Version check: Ignore stale server responses
        if (payload.version && prev.version && payload.version < prev.version) {
          return prev;
        }
        return {
          ...prev,
          state: isPlaying ? 'playing' : 'paused',
          positionSeconds: projectedPos,
          currentTime: projectedPos,
          isPlaying,
          playbackRate: payload.playbackRate || 1.0,
          version: payload.version || prev.version,
          hostConnected: payload.hostConnected !== false,
          changedAtServerMs: payload.changedAtServerMs || now,
          lastUpdatedTs: now,
        };
      });

      setDriftInfo((prev) => ({
        ...prev,
        rttMs,
        clockOffsetMs: estimatedClockOffsetMs,
      }));
    });

    // ── PRD Event: room.ai.trivia (Authored Trivia marker trigger) ──────────
    socket.on('room.ai.trivia', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;
      console.log('[WatchSpaceContext] Incoming AI Trivia:', payload);
      setCurrentTrivia(payload);
    });

    // ── PRD Event: room.presence.update ─────────────────────────────────────
    socket.on('room.presence.update', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;
      console.log('[WatchSpaceContext] Presence update:', payload);

      setPresenceState({
        members: payload.members || [],
        count: payload.count || 0,
        isLocked: !!payload.isLocked,
        hostConnected: payload.hostConnected !== false,
        hostUserId: payload.hostUserId,
      });
    });

    // ── PRD Event: room.chat.history & room.chat.message ────────────────────
    socket.on('room.chat.history', (envelope) => {
      const { payload } = envelope || {};
      if (Array.isArray(payload?.messages)) {
        setChatMessages((prev) => {
          const merged = [...prev, ...payload.messages];
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
        });
      }
    });

    socket.on('room.chat.message', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;

      setChatMessages((prev) => {
        // Prevent duplicate messages if already present
        if (prev.some((m) => m._id === payload._id)) return prev;
        return [...prev, payload];
      });
    });

    // ── PRD Event: room.chat.typing ─────────────────────────────────────────
    socket.on('room.chat.typing', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;

      setTypingUsers((prev) => {
        const next = { ...prev };
        if (payload.isTyping) {
          next[payload.userId] = payload.displayName;
        } else {
          delete next[payload.userId];
        }
        return next;
      });
    });

    // ── PRD Event: room.chat.reaction ───────────────────────────────────────
    socket.on('room.chat.reaction', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;

      const reactionId = Date.now() + Math.random();
      setFloatingReactions((prev) => [
        ...prev.slice(-10), // keep max 10 active
        { id: reactionId, displayName: payload.displayName, emoji: payload.emoji },
      ]);

      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionId));
      }, 3000);
    });

    // ── PRD Event: room.kicked ──────────────────────────────────────────────
    socket.on('room.kicked', (envelope) => {
      const { payload } = envelope || {};
      alert(payload?.message || 'You have been removed from the room.');
      setCurrentSpace(null);
      navigate('/dashboard');
    });

    // ── Part 8: PRD Events — Narrative Variation Voting ─────────────────────
    socket.on('room.variation.voteOpen', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;
      console.log('[WatchSpaceContext] Variation Vote Open:', payload);
      setActiveVote(payload);
      setVoteTally(null);
      setUserVotedOption(null);
      setAppliedVariation(null);
    });

    socket.on('room.variation.voteTally', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;
      setVoteTally(payload.tally);
    });

    socket.on('room.variation.applied', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;
      console.log('[WatchSpaceContext] Variation Vote Applied:', payload);
      setAppliedVariation(payload);
      setActiveVote(null);
      setVoteTally(null);
    });

    // ── Part 8: PRD Events — Localization Updates ───────────────────────────
    socket.on('room.localization.update', (envelope) => {
      const { payload } = envelope || {};
      if (!payload) return;
      if (payload.locale) setSelectedLocale(payload.locale);
      if (payload.subtitleTrack) setSelectedSubtitle(payload.subtitleTrack);
    });

    socket.on('room.error', (envelope) => {
      const msg = envelope?.payload?.message;
      if (msg) console.warn('[WatchSpaceContext] Room error:', msg);
    });

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [authLoading, user?._id, navigate]);

  // Join room whenever currentSpace or socket connection status changes
  useEffect(() => {
    if (socketConnected && socketRef.current?.connected && currentSpace?._id) {
      console.log('[WatchSpaceContext] Emitting space:join for:', currentSpace._id);
      socketRef.current.emit('space:join', { spaceId: currentSpace._id });
    }
  }, [currentSpace?._id, socketConnected]);

  // ── Periodic Drift Ping Loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentSpace || !socketConnected) {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      return;
    }

    pingTimerRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('room.sync.ping', {
          event: 'room.sync.ping',
          watchSpaceId: currentSpace._id,
          payload: { clientTs: Date.now() },
          ts: Date.now(),
        });
      }
    }, 3000);

    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [currentSpace, socketConnected]);

  // ── Chat Actions ──────────────────────────────────────────────────────────
  const sendChatMessage = useCallback(
    (text) => {
      if (!socketRef.current?.connected || !currentSpace || !text.trim()) return;

      socketRef.current.emit('room.chat.message', {
        event: 'room.chat.message',
        watchSpaceId: currentSpace._id,
        payload: { text: text.trim() },
        ts: Date.now(),
      });
    },
    [currentSpace]
  );

  const sendTypingIndicator = useCallback(
    (isTyping) => {
      if (!socketRef.current?.connected || !currentSpace) return;

      socketRef.current.emit('room.chat.typing', {
        event: 'room.chat.typing',
        watchSpaceId: currentSpace._id,
        payload: { isTyping: !!isTyping },
        ts: Date.now(),
      });
    },
    [currentSpace]
  );

  const sendEmojiReaction = useCallback(
    (emoji) => {
      if (!socketRef.current?.connected || !currentSpace || !emoji) return;

      socketRef.current.emit('room.chat.reaction', {
        event: 'room.chat.reaction',
        watchSpaceId: currentSpace._id,
        payload: { emoji },
        ts: Date.now(),
      });
    },
    [currentSpace]
  );

  // ── Host Moderation Action ────────────────────────────────────────────────
  const sendModerationAction = useCallback(
    ({ action, targetUserId, isLocked }) => {
      if (!socketRef.current?.connected || !currentSpace) return;

      socketRef.current.emit('room.moderation.update', {
        event: 'room.moderation.update',
        watchSpaceId: currentSpace._id,
        payload: { action, targetUserId, isLocked },
        ts: Date.now(),
      });
    },
    [currentSpace]
  );

  // ── Part 8: Narrative Variation & Voting Actions ─────────────────────────
  const openVariationVote = useCallback(
    ({ variationPointId, promptText, options, durationSec = 15 }) => {
      if (!socketRef.current?.connected || !currentSpace) return;

      socketRef.current.emit('room.variation.voteOpen', {
        event: 'room.variation.voteOpen',
        watchSpaceId: currentSpace._id,
        payload: {
          variationPointId,
          promptText,
          options,
          durationSec,
        },
        ts: Date.now(),
      });
    },
    [currentSpace]
  );

  const submitVote = useCallback(
    (optionId) => {
      if (!socketRef.current?.connected || !currentSpace || !optionId) return;

      setUserVotedOption(optionId);
      socketRef.current.emit('room.variation.voteSubmit', {
        event: 'room.variation.voteSubmit',
        watchSpaceId: currentSpace._id,
        payload: { optionId },
        ts: Date.now(),
      });
    },
    [currentSpace]
  );

  const updateLocalization = useCallback(
    ({ locale, subtitleTrack }) => {
      if (locale) setSelectedLocale(locale);
      if (subtitleTrack) setSelectedSubtitle(subtitleTrack);

      if (socketRef.current?.connected && currentSpace) {
        socketRef.current.emit('room.localization.update', {
          event: 'room.localization.update',
          watchSpaceId: currentSpace._id,
          payload: { locale, subtitleTrack },
          ts: Date.now(),
        });
      }
    },
    [currentSpace]
  );

  // ── Host Playback Update ─────────────────────────────────────────────────
  const sendPlaybackUpdate = useCallback(
    ({ action, positionSeconds, currentTime, state, isPlaying, playbackRate }) => {
      if (!socketRef.current?.connected || !currentSpace) return;

      const pos = typeof positionSeconds === 'number' ? positionSeconds : (typeof currentTime === 'number' ? currentTime : 0);
      const currentState = state || (isPlaying ? 'playing' : 'paused');

      socketRef.current.emit('room.playback.update', {
        event: 'room.playback.update',
        watchSpaceId: currentSpace._id,
        payload: {
          action: action || 'update',
          positionSeconds: pos,
          currentTime: pos,
          state: currentState,
          isPlaying: currentState === 'playing',
          playbackRate: playbackRate || 1.0,
        },
        ts: Date.now(),
      });
    },
    [currentSpace]
  );

  // ── Load space by ID & prefetch chat history ──────────────────────────────
  const loadSpace = useCallback(async (spaceId) => {
    setSpaceLoading(true);
    setSpaceError(null);
    try {
      const res = await getSpace(spaceId);
      const space = res.data.space;
      setCurrentSpace(space);

      try {
        const msgRes = await getSpaceMessages(spaceId);
        if (msgRes.data?.messages) {
          setChatMessages((prev) => {
            const merged = [...prev, ...msgRes.data.messages];
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
          });
        }
      } catch {}

      if (socketRef.current?.connected) {
        socketRef.current.emit('space:join', { spaceId });
      }

      return space;
    } catch (err) {
      console.warn('[WatchSpaceContext] Backend offline or space error, using fallback room state:', err.message);
      setCurrentSpace((prev) => {
        if (prev && (prev._id === spaceId || prev.inviteCode === spaceId)) {
          return prev;
        }
        const fallbackSpace = {
          _id: spaceId || `demo-${Date.now()}`,
          status: 'live',
          hostUserId: user || { _id: 'guest-user-1', displayName: 'Netflix AI Host' },
          participantIds: [],
          settings: prev?.settings || {
            roomName: 'Netflix AI Watch Space',
            isPrivate: false,
            maxParticipants: 10,
            aiVerbosity: 'moderate',
          },
          inviteCode: typeof spaceId === 'string' && spaceId.length <= 8 ? spaceId.toUpperCase() : 'NX-8899',
          inviteLink: `${window.location.origin}/space/${spaceId}`,
          titleId: prev?.titleId || {
            _id: 't-demo',
            title: 'Tears of Steel (Netflix AI Feature)',
            description: 'Stream and watch together in real-time with Netflix AI co-pilot.',
            durationSeconds: 720,
            genres: ['Sci-Fi', 'Action'],
            ageRating: '16+',
            poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
            backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
            videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          },
        };
        return fallbackSpace;
      });
    } finally {
      setSpaceLoading(false);
    }
  }, [user]);

  const setSpace = useCallback((space) => {
    setCurrentSpace(space);
    if (space && socketRef.current?.connected) {
      socketRef.current.emit('space:join', { spaceId: space._id });
    }
  }, []);

  // ── Host Lifecycle Actions ─────────────────────────────────────────────────
  const goLive = useCallback(async () => {
    if (!currentSpace) return;
    try {
      const res = await updateSpaceStatus(currentSpace._id, 'live');
      setCurrentSpace((prev) => ({ ...prev, status: 'live', startedAt: res.data.startedAt }));
    } catch (err) {
      console.error('[WatchSpaceContext] goLive error:', err.message);
      throw err;
    }
  }, [currentSpace]);

  const endRoom = useCallback(async () => {
    if (!currentSpace) return;
    try {
      await updateSpaceStatus(currentSpace._id, 'ended');
      if (socketRef.current?.connected) {
        socketRef.current.emit('space:leave', { spaceId: currentSpace._id });
      }
      setCurrentSpace(null);
      navigate('/dashboard');
    } catch (err) {
      console.error('[WatchSpaceContext] endRoom error:', err.message);
      throw err;
    }
  }, [currentSpace, navigate]);

  const exitRoom = useCallback(async () => {
    if (!currentSpace) return;
    try {
      await leaveSpace(currentSpace._id);
      if (socketRef.current?.connected) {
        socketRef.current.emit('space:leave', { spaceId: currentSpace._id });
      }
      setCurrentSpace(null);
      navigate('/dashboard');
    } catch (err) {
      console.error('[WatchSpaceContext] exitRoom error:', err.message);
      throw err;
    }
  }, [currentSpace, navigate]);

  const clearSpace = useCallback(() => {
    if (currentSpace && socketRef.current?.connected) {
      socketRef.current.emit('space:leave', { spaceId: currentSpace._id });
    }
    setCurrentSpace(null);
    setSpaceError(null);
    setChatMessages([]);
  }, [currentSpace]);

  const value = {
    // Basic State
    currentSpace,
    spaceLoading,
    spaceError,
    isHost,
    participants,
    socketConnected,
    socketId,
    socketTransport,
    socket: socketRef,

    // Playback & Drift State
    playbackState,
    driftInfo,

    // AI Trivia State & Action
    currentTrivia,
    dismissTrivia: () => setCurrentTrivia(null),

    // Part 6 Presence, Chat & Moderation State
    presenceState,
    chatMessages,
    typingUsers,
    floatingReactions,

    // Part 8 Narrative Variation Voting & Localization State
    activeVote,
    voteTally,
    userVotedOption,
    appliedVariation,
    selectedLocale,
    selectedSubtitle,

    // Part 6 Actions
    sendChatMessage,
    sendTypingIndicator,
    sendEmojiReaction,
    sendModerationAction,

    // Part 8 Actions
    openVariationVote,
    submitVote,
    updateLocalization,

    // Playback Actions
    sendPlaybackUpdate,

    // Room Actions
    loadSpace,
    setSpace,
    goLive,
    endRoom,
    exitRoom,
    clearSpace,
  };

  return (
    <WatchSpaceContext.Provider value={value}>
      {children}
    </WatchSpaceContext.Provider>
  );
};

export const useWatchSpace = () => {
  const ctx = useContext(WatchSpaceContext);
  if (!ctx) {
    throw new Error('useWatchSpace must be used inside WatchSpaceProvider');
  }
  return ctx;
};

export default WatchSpaceContext;


