import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  MessageSquare,
  Users,
  Copy,
  Check,
  Send,
  Lock,
  Unlock,
  Crown,
  Wifi,
  WifiOff,
  SquareActivity,
  StopCircle,
  Loader,
  AlertCircle,
  ExternalLink,
  Vote,
  Globe,
  CheckCircle2,
  Zap,
  Flame,
  Heart,
  ThumbsUp,
  Clock,
  Radio,
  HelpCircle,
  X,
  Smile,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useWatchSpace } from '../context/WatchSpaceContext';
import { useAuth } from '../context/AuthContext';
import { askAiCoPilotApi } from '../services/watchSpaceApi';
import NetflixVideoPlayer from '../components/NetflixVideoPlayer';
import { MOVIE_SERVERS, getServerStreamUrl } from '../services/movieServers';

// ── Part 8: Pre-Authored & Pre-Approved Localization Subtitle Variants ────────
const PRE_AUTHORED_SUBTITLES = {
  'en-US': [
    { start: 0, end: 15, text: "In a bleak future, humanity's last hope rests in an underground Amsterdam laboratory." },
    { start: 15, end: 40, text: "Using experimental technology, they attempt to turn back time and prevent the robotic takeover." },
    { start: 40, end: 90, text: "Decision point ahead: Choose the fate of the squad before entering enemy territory." },
    { start: 90, end: 600, text: "The clock is ticking... history can only be rewritten once." },
  ],
  'es-ES': [
    { start: 0, end: 15, text: "En un futuro desolado, la última esperanza de la humanidad reside en un laboratorio subterráneo." },
    { start: 15, end: 40, text: "Utilizando tecnología experimental, intentan retroceder el tiempo y evitar la invasión robótica." },
    { start: 40, end: 90, text: "Punto de decisión: Elige el destino del escuadrón antes de entrar al territorio enemigo." },
    { start: 90, end: 600, text: "El tiempo se agota... la historia solo se puede reescribir una vez." },
  ],
  'ja-JP': [
    { start: 0, end: 15, text: "荒廃した未来、人類の最後の希望はアムステルダムの地下研究所に託されている。" },
    { start: 15, end: 40, text: "実験的な技術を使用して、彼らは時間を巻き戻し、ロボットの脅威を防ごうとする。" },
    { start: 40, end: 90, text: "分岐点：敵の領土に入る前に分隊の運命を選択してください。" },
    { start: 90, end: 600, text: "時間は刻々と過ぎていく...歴史は一度しか書き換えられない。" },
  ],
  'director_cut': [
    { start: 0, end: 15, text: "DIRECTOR'S NOTE v1.1: Notice the heavy volumetric fog rendered in Blender cycles." },
    { start: 15, end: 40, text: "DIRECTOR'S NOTE v1.1: Keyframe animation was blended with motion-captured telemetry here." },
    { start: 40, end: 90, text: "DIRECTOR'S NOTE v1.1: We authored two distinct story paths for this climax scene!" },
    { start: 90, end: 600, text: "DIRECTOR'S NOTE v1.1: Final render compositing finished in VFX Studio Amsterdam." },
  ],
};

// ── Part 8: Pre-Authored & Pre-Approved Narrative Variation Points ───────────
const PRE_AUTHORED_VARIATION_POINTS = [
  {
    id: 'vp_crossroads',
    timestampSec: 30,
    title: 'Crossroads Strategy (00:30)',
    promptText: 'Bunny faces a tactical roadblock. Which path should the team pursue?',
    options: [
      { id: 'opt_crossroads_a', text: 'Option A: Take the high-tech highway escape' },
      { id: 'opt_crossroads_b', text: 'Option B: Duck into the neon alley shortcut' },
    ],
  },
  {
    id: 'vp_climax',
    timestampSec: 120,
    title: 'Climactic Showdown (02:00)',
    promptText: 'Final confrontation with the rival faction. What is the tactical command?',
    options: [
      { id: 'opt_climax_a', text: 'Option A: Negotiate a high-stakes truce' },
      { id: 'opt_climax_b', text: 'Option B: Unleash full EMP pulse weapon' },
    ],
  },
];

// ── Utility ─────────────────────────────────────────────────────────────────
const formatTime = (sec) => {
  if (!sec || isNaN(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const AvatarInitial = ({ name, color = '#e50914', size = 32 }) => (
  <div
    className="room-avatar"
    style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
  >
    {name?.[0]?.toUpperCase() || '?'}
  </div>
);

const AVATAR_COLORS = ['#e50914', '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6'];

const WatchSpace = () => {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const {
    currentSpace,
    spaceLoading,
    spaceError,
    isHost,
    participants,
    socketConnected,
    socketId,
    socketTransport,
    loadSpace,
    setSpace,
    goLive,
    endRoom,
    exitRoom,
    playbackState,
    sendPlaybackUpdate,
    driftInfo,
    presenceState,
    chatMessages,
    typingUsers,
    floatingReactions,
    sendChatMessage,
    sendTypingIndicator,
    sendEmojiReaction,
    sendModerationAction,

    // AI Trivia State & Action
    currentTrivia,
    dismissTrivia,

    // Part 8 Narrative Variation Voting & Localization
    activeVote,
    voteTally,
    userVotedOption,
    appliedVariation,
    selectedLocale,
    selectedSubtitle,
    openVariationVote,
    submitVote,
    updateLocalization,
  } = useWatchSpace();

  // ── Video player state ──────────────────────────────────────────────────────
  const videoRef                        = useRef(null);
  const controlsTimer                   = useRef(null);
  const typingTimeoutRef                 = useRef(null);

  const [isPlaying, setIsPlaying]       = useState(false);
  const [isMuted, setIsMuted]           = useState(false);
  const [volume, setVolume]             = useState(1);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [syncStatus, setSyncStatus]     = useState('Syncing…');

  // Multi-server state (Default Server 1 = Vidsrc.pro)
  const [selectedServer, setSelectedServer] = useState(1);

  // ── UI & AI state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState('ai');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copied, setCopied]             = useState('');
  const [aiQuestion, setAiQuestion]     = useState('');
  const [aiHistory, setAiHistory]       = useState([]);
  const [aiLoading, setAiLoading]       = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [isGoingLive, setIsGoingLive]   = useState(false);
  const [isEnding, setIsEnding]         = useState(false);
  const [confirmEnd, setConfirmEnd]     = useState(false);
  const [showTriviaAnswer, setShowTriviaAnswer] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    setShowTriviaAnswer(false);
  }, [currentTrivia]);

  // ── Chat & Fullscreen Overlay Refs & State ────────────────────────────────
  const chatMessagesContainerRef = useRef(null);
  const isInitialChatLoadRef     = useRef(true);
  const prevChatLengthRef        = useRef(0);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [fullscreenFloatingItems, setFullscreenFloatingItems] = useState([]);

  // Detect browser fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Manage temporary floating messages/notifications stack for Fullscreen/Collapsed Mode
  useEffect(() => {
    if (chatMessages.length > prevChatLengthRef.current) {
      const newMsgs = chatMessages.slice(prevChatLengthRef.current);
      prevChatLengthRef.current = chatMessages.length;

      if (isFullscreenMode || !isSidebarOpen) {
        newMsgs.forEach((msg) => {
          const senderIdStr = msg.senderUserId?._id || msg.senderUserId || msg.senderId?._id || msg.senderId;
          const isMe = senderIdStr === user?._id || senderIdStr === user?.id;
          const senderDisplayName = msg.displayName || msg.senderName || (isMe ? 'You' : 'Participant');

          const newItem = {
            id: msg._id || `float-${Date.now()}-${Math.random()}`,
            text: msg.text,
            senderName: senderDisplayName,
            isMe,
            isSystem: !!msg.isSystem,
            timestamp: Date.now(),
          };

          setFullscreenFloatingItems((prev) => [...prev.slice(-2), newItem]);

          const displaySec = msg.isSystem ? 2500 : 3500;
          setTimeout(() => {
            setFullscreenFloatingItems((prev) => prev.filter((item) => item.id !== newItem.id));
          }, displaySec);
        });
      }
    } else {
      prevChatLengthRef.current = chatMessages.length;
    }
  }, [chatMessages, isFullscreenMode, isSidebarOpen, user?._id]);

  // Chat Auto-Scroll (Only scrolls when user is already near bottom)
  useEffect(() => {
    const el = chatMessagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (isNearBottom || isInitialChatLoadRef.current) {
      el.scrollTop = el.scrollHeight;
      isInitialChatLoadRef.current = false;
    }
  }, [chatMessages, activeTab]);

  // ── Part 8: Local voting countdown & active subtitle calculation ────────────
  useEffect(() => {
    if (!activeVote) {
      setRemainingSec(0);
      return;
    }

    const updateCountdown = () => {
      const left = Math.max(0, Math.ceil((activeVote.expiresAt - Date.now()) / 1000));
      setRemainingSec(left);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [activeVote]);

  // Compute active subtitle line for current playback timestamp & selected locale
  const activeSubList = PRE_AUTHORED_SUBTITLES[selectedLocale] || PRE_AUTHORED_SUBTITLES['en-US'];
  const activeSubLine = activeSubList.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // ── Load space on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (
      roomId &&
      (!currentSpace ||
        currentSpace._id !== roomId ||
        typeof currentSpace.titleId === 'string' ||
        !currentSpace.titleId?.title)
    ) {
      loadSpace(roomId).catch(() => {});
    }
  }, [roomId, currentSpace?._id, currentSpace?.titleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAskAi = async (questionToAsk) => {
    const qText = (questionToAsk || aiQuestion).trim();
    if (!qText || !currentSpace?._id || aiLoading) return;

    setAiLoading(true);
    const userMsg = { role: 'user', text: qText, timestampSec: currentTime };
    setAiHistory((prev) => [...prev, userMsg]);
    setAiQuestion('');

    try {
      const res = await askAiCoPilotApi(currentSpace._id, {
        userId: user?._id,
        currentTs: currentTime,
        question: qText,
      });

      const aiData = res.data;
      const aiMsg = {
        role: 'assistant',
        text: aiData.answer,
        sourceEvents: aiData.sourceEvents || [],
        executionTimeMs: aiData.executionTimeMs,
      };
      setAiHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      setAiHistory((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I failed to process your question. Please try again.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Auto-hide controls ──────────────────────────────────────────────────────
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, []);

  // ── Participant Gentle Drift Correction Loop ────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    const checkDrift = () => {
      const video = videoRef.current;
      if (!video) return;

      // CRITICAL CHECK: Media Metadata Readiness Guard
      const isMediaReady =
        video.readyState >= 1 &&
        typeof video.duration === 'number' &&
        !Number.isNaN(video.duration) &&
        video.duration > 0;

      if (!isMediaReady) {
        setSyncStatus('Waiting for Media Metadata…');
        return;
      }

      if (playbackState.hostConnected === false) {
        if (!video.paused) video.pause();
        setIsPlaying(false);
        setSyncStatus('Host Disconnected (Paused)');
        return;
      }

      const elapsed = (Date.now() - (playbackState.changedAtServerMs || playbackState.lastUpdatedTs)) / 1000;
      const targetTime = (playbackState.positionSeconds ?? playbackState.currentTime ?? 0) + (playbackState.isPlaying ? elapsed * (playbackState.playbackRate || 1.0) : 0);
      const drift = targetTime - video.currentTime;

      if (!playbackState.isPlaying) {
        if (!video.paused) video.pause();
        setIsPlaying(false);
        if (Math.abs(drift) > 0.3) {
          video.currentTime = targetTime;
        }
        setSyncStatus('Paused (Synced to Host)');
        return;
      }

      // Participant sync when host is playing
      if (Math.abs(drift) > 1.2) {
        // Hard seek for large drift
        video.currentTime = targetTime;
        video.playbackRate = 1.0;
        if (video.paused) video.play().catch(() => {});
        setIsPlaying(true);
        setSyncStatus(`Hard Seek (Drift ${Math.round(drift * 1000)}ms)`);
      } else if (drift > 0.25) {
        // Gentle catch up (1.05x)
        video.playbackRate = 1.05;
        if (video.paused) video.play().catch(() => {});
        setIsPlaying(true);
        setSyncStatus(`Catching Up 1.05x (+${Math.round(drift * 1000)}ms)`);
      } else if (drift < -0.25) {
        // Gentle slow down (0.95x)
        video.playbackRate = 0.95;
        if (video.paused) video.play().catch(() => {});
        setIsPlaying(true);
        setSyncStatus(`Slowing Down 0.95x (${Math.round(drift * 1000)}ms)`);
      } else {
        // Target sync reached (< 250ms)
        video.playbackRate = 1.0;
        if (video.paused) video.play().catch(() => {});
        setIsPlaying(true);
        setSyncStatus('🟢 In Sync (< 250ms)');
      }
    };

    checkDrift();
    const interval = setInterval(checkDrift, 1000);
    return () => clearInterval(interval);
  }, [playbackState, isHost]);

  // ── Video callbacks & Host Emission ─────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isHost) return; // Non-hosts cannot control playback directly

    const isReady = video.readyState >= 1 && typeof video.duration === 'number' && !Number.isNaN(video.duration) && video.duration > 0;
    if (!isReady) {
      console.warn('[WatchSpace] Cannot toggle play: Media metadata is not ready.');
      return;
    }

    const nextState = !isPlaying;
    if (nextState) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    setIsPlaying(nextState);

    sendPlaybackUpdate({
      action: nextState ? 'play' : 'pause',
      currentTime: video.currentTime,
      isPlaying: nextState,
    });
  };

  const skip = (secs) => {
    const video = videoRef.current;
    if (!video) return;
    if (!isHost) return;

    const isReady = video.readyState >= 1 && typeof video.duration === 'number' && !Number.isNaN(video.duration) && video.duration > 0;
    if (!isReady) {
      console.warn('[WatchSpace] Cannot skip: Media metadata is not ready.');
      return;
    }

    const currentDur = duration || video.duration || 0;
    const newTime = Math.max(0, Math.min(currentDur, video.currentTime + secs));
    video.currentTime = newTime;
    setCurrentTime(newTime);

    sendPlaybackUpdate({
      action: 'seek',
      currentTime: newTime,
      isPlaying,
    });
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleScrubberClick = (e) => {
    const video = videoRef.current;
    if (!video) return;
    if (!isHost) return; // Only host can seek via scrubber

    const isReady = video.readyState >= 1 && typeof video.duration === 'number' && !Number.isNaN(video.duration) && video.duration > 0;
    const currentDur = duration || video.duration || 0;
    if (!isReady || !currentDur) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * currentDur;

    video.currentTime = newTime;
    setCurrentTime(newTime);

    sendPlaybackUpdate({
      action: 'seek',
      currentTime: newTime,
      isPlaying,
    });
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // ── Copy helpers ─────────────────────────────────────────────────────────────
  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  // ── Host controls ─────────────────────────────────────────────────────────────
  const handleGoLive = async () => {
    setIsGoingLive(true);
    try { await goLive(); } catch {} finally { setIsGoingLive(false); }
  };

  const handleEndRoom = async () => {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 4000); return; }
    setIsEnding(true);
    try { await endRoom(); } catch {} finally { setIsEnding(false); }
  };

  // ── All members (host + participants) for display ─────────────────────────────
  const hostUser = currentSpace?.hostUserId;
  const allMembers = [
    ...(hostUser ? [{ ...(typeof hostUser === 'object' ? hostUser : { _id: hostUser }), isHost: true }] : []),
    ...participants.map((p) => (typeof p === 'object' ? p : { _id: p })),
  ];

  // ── Live Socket.IO Presence Source of Truth ─────────────────────────────────
  const liveMembers = presenceState.members.length > 0 ? presenceState.members : allMembers;
  const liveViewerCount = presenceState.members.length > 0
    ? presenceState.members.length
    : (typeof presenceState.count === 'number' && presenceState.count > 0 ? presenceState.count : allMembers.length);

  // ── Status badge ──────────────────────────────────────────────────────────────
  const statusConfig = {
    scheduled: { label: 'Scheduled', cls: 'badge-scheduled' },
    live:      { label: 'LIVE',      cls: 'badge-live' },
    ended:     { label: 'Ended',     cls: 'badge-ended' },
  };
  const statusBadge = statusConfig[currentSpace?.status] || statusConfig.scheduled;

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (spaceLoading && !currentSpace) {
    return (
      <div className="room-full-loader">
        <Loader size={40} className="spin-icon" color="var(--netflix-red)" />
        <span style={{ color: '#fff', marginTop: '1rem', fontWeight: 600 }}>Loading Netflix AI Watch Space…</span>
      </div>
    );
  }

  const effectiveSpace = currentSpace || {
    _id: roomId || `demo-${Date.now()}`,
    status: 'live',
    hostUserId: user || { _id: 'guest-1', displayName: 'Netflix AI Host' },
    participantIds: [],
    settings: { roomName: 'Netflix AI Watch Space', isPrivate: false, maxParticipants: 10, aiVerbosity: 'moderate' },
    inviteCode: roomId || 'NX-9900',
    inviteLink: `${window.location.origin}/space/${roomId || 'NX-9900'}`,
    titleId: {
      _id: 't-demo',
      title: 'Tears of Steel (Netflix AI Feature)',
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
      backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
      videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    }
  };

  const targetTmdbId = effectiveSpace?.titleId?.id || effectiveSpace?.titleId?._id || 550;
  const isTvSeries = effectiveSpace?.titleId?.media_type === 'tv' || effectiveSpace?.titleId?.type === 'tv' || Boolean(effectiveSpace?.titleId?.first_air_date);

  // Compute stream URL using 8-Server Architecture (Server 1 Vidsrc default)
  const videoSrc = getServerStreamUrl({
    tmdbId: targetTmdbId,
    isTv: isTvSeries,
    season: 1,
    episode: 1,
    serverNum: selectedServer,
  });

  const videoPoster = effectiveSpace?.titleId?.backdropUrl ||
    effectiveSpace?.titleId?.poster || null;
  const titleName = effectiveSpace?.titleId?.title || 'Netflix AI Watch Space';
  const roomCode  = effectiveSpace?.inviteCode || roomId || 'NX-0000';

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="cinema-view" onMouseMove={resetControlsTimer}>

      {/* ══ 1. CINEMA VIDEO STAGE ══════════════════════════════════════════════ */}
      <div className="cinema-video-area">

        {/* Top Header Overlay */}
        <div className={`cinema-top-bar ${showControls ? 'visible' : ''}`}>
          <button
            className="cinema-leave-btn"
            onClick={() => isHost ? handleEndRoom() : exitRoom()}
            title="Leave Watch Party"
          >
            <ArrowLeft size={16} color="#e50914" />
            <span>Leave Watch Party</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Live Sync Status Pill */}
            <div className="room-sync-status-pill" title="Real-time Synchronization Engine">
              {isHost ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Crown size={12} color="#f59e0b" /> Host Authoritative
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="live-green-dot" /> {syncStatus}
                </span>
              )}
              {driftInfo.rttMs > 0 && <span style={{ opacity: 0.7, marginLeft: '4px' }}>({driftInfo.rttMs}ms RTT)</span>}
            </div>

            {/* Status badge */}
            <div className={`room-status-badge ${statusBadge.cls}`}>
              {statusBadge.label}
            </div>

            {/* Room code */}
            <div className="cinema-room-badge">
              {roomCode}
            </div>

            {/* Copy invite link */}
            {currentSpace?.inviteLink && (
              <button
                id="room-copy-link-btn"
                className="circle-icon-btn"
                onClick={() => copyText(currentSpace.inviteLink, 'roomlink')}
                title="Copy Invite Link"
              >
                {copied === 'roomlink' ? <Check size={14} color="#22c55e" /> : <ExternalLink size={14} />}
              </button>
            )}

            {/* Copy invite code */}
            <button
              id="room-copy-code-btn"
              className="circle-icon-btn"
              onClick={() => copyText(roomCode, 'roomcode')}
              title="Copy Invite Code"
            >
              {copied === 'roomcode' ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
            </button>

            {/* Socket status */}
            <div className="circle-icon-btn" title={socketConnected ? 'Real-time connected' : 'Disconnected'}>
              {socketConnected ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#ef4444" />}
            </div>
          </div>
        </div>

        {/* Fullscreen Floating Chat Overlay Stack (Shows temporary message bubbles in Fullscreen or Collapsed mode) */}
        {(isFullscreenMode || !isSidebarOpen) && fullscreenFloatingItems.length > 0 && (
          <div className="fullscreen-floating-messages-stack">
            {fullscreenFloatingItems.map((item) => (
              <div
                key={item.id}
                className={`fullscreen-floating-card ${item.isSystem ? 'system' : item.isMe ? 'me' : 'other'}`}
              >
                {item.isSystem ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#9ca3af' }}>
                    {item.text?.includes('joined') ? <Users size={12} /> : <LogOut size={12} color="#ef4444" />}
                    <span>{item.text}</span>
                  </div>
                ) : (
                  <>
                    <div className="floating-sender-name">{item.isMe ? 'You' : item.senderName}</div>
                    <div className="floating-msg-text">{item.text}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Video Canvas / Netflix AI Custom Player */}
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <NetflixVideoPlayer
            ref={videoRef}
            src={videoSrc}
            poster={videoPoster}
            title={titleName}
            isHost={isHost}
            syncTime={playbackState.positionSeconds ?? playbackState.currentTime}
            syncIsPlaying={playbackState.state === 'playing' || playbackState.isPlaying}
            onTimeUpdate={(t) => setCurrentTime(t)}
            hideDefaultControls={true}
            onPlaybackChange={(data) => {
              if (isHost) {
                sendPlaybackUpdate(data);
              }
            }}
          />
        </div>

        {/* Authored Timeline Trivia Card Overlay */}
        {currentTrivia && (
          <div
            className="room-trivia-overlay"
            style={{
              position: 'absolute',
              top: '80px',
              right: '25px',
              backgroundColor: 'rgba(18, 18, 18, 0.95)',
              border: '1px solid rgba(229, 9, 20, 0.6)',
              borderRadius: '12px',
              padding: '1.25rem',
              width: '320px',
              zIndex: 38,
              boxShadow: '0 12px 30px rgba(0,0,0,0.85), 0 0 20px rgba(229,9,20,0.2)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--netflix-red)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <HelpCircle size={16} /> NETFLIX AI TRIVIA
              </div>
              <button
                onClick={dismissTrivia}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px', display: 'flex' }}
                title="Dismiss trivia"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', lineHeight: '1.4' }}>
              {currentTrivia.question}
            </p>

            {currentTrivia.hint && (
              <p style={{ fontSize: '0.8rem', color: '#ffb703', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                💡 Hint: {currentTrivia.hint}
              </p>
            )}

            {showTriviaAnswer ? (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.6rem 0.8rem', borderLeft: '3px solid var(--netflix-red)', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Answer:</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{currentTrivia.answer || 'Check back in the scene discussion!'}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowTriviaAnswer(true)}
                style={{
                  width: '100%',
                  background: 'rgba(229, 9, 20, 0.2)',
                  border: '1px solid rgba(229, 9, 20, 0.4)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '0.45rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  marginTop: '0.25rem',
                }}
              >
                Reveal Answer
              </button>
            )}
          </div>
        )}

        {/* Part 8: Subtitle Line Overlay (Pre-authored localized variants) */}
        {activeSubLine && (
          <div
            className="room-subtitle-overlay"
            style={{
              position: 'absolute',
              bottom: '95px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '0.45rem 1.1rem',
              borderRadius: '6px',
              fontSize: '1.05rem',
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0,0,0,0.9)',
              zIndex: 25,
              maxWidth: '85%',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}
          >
            {activeSubLine.text}
          </div>
        )}

        {/* Part 8: Winning Variation Result Banner Overlay */}
        {appliedVariation && (
          <div
            className="room-applied-banner"
            style={{
              position: 'absolute',
              top: '75px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(34, 197, 94, 0.95)',
              color: '#fff',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 35,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <CheckCircle2 size={18} />
            <span>Winning Branch Applied: <strong>{appliedVariation.winningOptionText}</strong> ({appliedVariation.totalVotes} votes)</span>
          </div>
        )}

        {/* Part 8: Interactive Narrative Variation Voting Modal Overlay */}
        {activeVote && (
          <div
            className="room-voting-overlay"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(15, 15, 15, 0.94)',
              border: '1px solid rgba(229, 9, 20, 0.7)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '480px',
              zIndex: 40,
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(229,9,20,0.25)',
              backdropFilter: 'blur(12px)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--netflix-red)', fontWeight: 800, fontSize: '0.95rem' }}>
                <Zap size={18} /> NARRATIVE VARIATION VOTE
              </div>
              <div style={{ background: 'rgba(229,9,20,0.2)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} /> {remainingSec}s remaining
              </div>
            </div>

            <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.2rem', lineHeight: '1.4' }}>
              {activeVote.promptText}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeVote.options.map((opt) => {
                const count = (voteTally && voteTally[opt.id]) || 0;
                const total = voteTally ? Object.values(voteTally).reduce((a, b) => a + b, 0) : 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const isSelected = userVotedOption === opt.id;

                return (
                  <button
                    key={opt.id}
                    className="room-vote-option-btn"
                    onClick={() => submitVote(opt.id)}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      background: isSelected ? 'rgba(229,9,20,0.25)' : 'rgba(255,255,255,0.06)',
                      border: isSelected ? '2px solid var(--netflix-red)' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${pct}%`,
                        background: 'rgba(229, 9, 20, 0.2)',
                        transition: 'width 0.3s ease',
                        pointerEvents: 'none',
                      }}
                    />
                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.text}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isSelected && <span style={{ fontSize: '0.75rem', background: 'var(--netflix-red)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>YOUR VOTE</span>}
                        <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 700 }}>{count} ({pct}%)</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#888', textAlign: 'center' }}>
              {userVotedOption ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#22c55e' }}>
                  <Check size={12} /> Your vote is recorded. You can change your choice before expiry.
                </span>
              ) : (
                'Click an option above to cast your vote.'
              )}
            </div>
          </div>
        )}

        {/* Floating Emoji Reactions Overlay */}
        <div className="room-floating-reactions-overlay" style={{ position: 'absolute', bottom: '80px', right: '40px', display: 'flex', flexDirection: 'column-reverse', gap: '0.4rem', pointerEvents: 'none', zIndex: 20 }}>
          {floatingReactions.map((r) => (
            <div key={r.id} className="floating-reaction-badge" style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '0.3rem 0.7rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: '0.4rem', animation: 'floatUp 3s ease-out forwards', fontSize: '0.85rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{r.emoji}</span>
              <span style={{ fontWeight: 600 }}>{r.displayName}</span>
            </div>
          ))}
        </div>

        {/* ── Controls Bar ── */}
        <div className={`cinema-controls-bar ${showControls ? 'visible' : ''}`}>
          {/* Scrubber */}
          <div
            className="netflix-scrubber-track"
            onClick={handleScrubberClick}
            title="Seek"
          >
            <div
              className="netflix-scrubber-progress"
              style={{ width: `${progressPct}%` }}
            >
              <div className="netflix-scrubber-thumb" />
            </div>
          </div>

          <div className="cinema-control-buttons">
            {/* Left side */}
            <div className="controls-left">
              <button id="room-play-btn" className="player-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
              </button>

              <button id="room-back10-btn" className="player-btn" onClick={() => skip(-10)} title="Back 10s">
                <RotateCcw size={22} />
              </button>

              <button id="room-fwd10-btn" className="player-btn" onClick={() => skip(10)} title="Forward 10s">
                <RotateCw size={22} />
              </button>

              {/* Volume cluster */}
              <div className="room-volume-cluster">
                <button id="room-mute-btn" className="player-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
                <input
                  type="range"
                  className="room-volume-slider"
                  min={0} max={1} step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                />
              </div>

              <span className="room-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Authoritative 8-Server Selector (Server 1 Vidsrc Default) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem', background: 'rgba(229,9,20,0.25)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(229,9,20,0.5)' }}>
                <Radio size={15} color="#e50914" />
                <select
                  id="room-server-selector"
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(Number(e.target.value))}
                  style={{
                    background: 'transparent',
                    color: '#fff',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  title="Select Streaming Server Mirror (Server 1 Vidsrc Default)"
                >
                  {MOVIE_SERVERS.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: '#141414', color: '#fff' }}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Part 8: Subtitle & Localization Variant Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Globe size={15} color="#aaa" />
                <select
                  id="locale-selector"
                  value={selectedLocale}
                  onChange={(e) => {
                    const loc = e.target.value;
                    const map = {
                      'en-US': 'English (v1.2 Approved)',
                      'es-ES': 'Spanish (v2.0 Approved)',
                      'ja-JP': 'Japanese (v1.0 Approved)',
                      'director_cut': "Director's Take (v1.1 Approved)",
                    };
                    updateLocalization({ locale: loc, subtitleTrack: map[loc] });
                  }}
                  style={{
                    background: 'transparent',
                    color: '#fff',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="Select Subtitle & Localization Variant"
                >
                  <option value="en-US" style={{ background: '#141414', color: '#fff' }}>EN - English (Standard v1.2)</option>
                  <option value="es-ES" style={{ background: '#141414', color: '#fff' }}>ES - Spanish (LatAm v2.0)</option>
                  <option value="ja-JP" style={{ background: '#141414', color: '#fff' }}>JA - Japanese (Subbed v1.0)</option>
                  <option value="director_cut" style={{ background: '#141414', color: '#fff' }}>Director's Cut (v1.1)</option>
                </select>
              </div>
            </div>

            {/* Right side */}
            <div className="controls-right">
              {/* Host: Go Live / End Room buttons */}
              {isHost && currentSpace?.status === 'scheduled' && (
                <button
                  id="go-live-btn"
                  className="room-control-btn room-go-live-btn"
                  onClick={handleGoLive}
                  disabled={isGoingLive}
                >
                  {isGoingLive ? <Loader size={14} className="spin-icon" /> : <SquareActivity size={14} />}
                  Go Live
                </button>
              )}

              {isHost && currentSpace?.status === 'live' && (
                <button
                  id="end-room-btn"
                  className={`room-control-btn room-end-btn ${confirmEnd ? 'confirm' : ''}`}
                  onClick={handleEndRoom}
                  disabled={isEnding}
                >
                  {isEnding ? <Loader size={14} className="spin-icon" /> : <StopCircle size={14} />}
                  {confirmEnd ? 'Click again to end' : 'End Room'}
                </button>
              )}

              {/* Toggle sidebar */}
              <button
                id="toggle-sidebar-btn"
                className="circle-icon-btn"
                style={{
                  backgroundColor: isSidebarOpen ? 'var(--netflix-red)' : 'rgba(42,42,42,0.6)',
                  borderColor: isSidebarOpen ? 'var(--netflix-red)' : 'rgba(255,255,255,0.3)',
                }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title="Toggle AI Panel"
              >
                <Sparkles size={15} />
              </button>

              <button id="room-fullscreen-btn" className="player-btn" onClick={toggleFullscreen} title="Full Screen">
                <Maximize size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2. CINEMA SIDEBAR ════════════════════════════════════════════════ */}
      {isSidebarOpen && (
        <aside className="cinema-sidebar">

          {/* ── Tab Navigation ── */}
          <div className="cinema-sidebar-tabs">
            <button
              id="tab-ai-btn"
              className={`sidebar-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={15} />
              <span>AI Co-Pilot</span>
            </button>

            <button
              id="tab-chat-btn"
              className={`sidebar-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={15} />
              <span>Chat</span>
            </button>

            <button
              id="tab-viewers-btn"
              className={`sidebar-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={15} />
              <span>Viewers ({liveViewerCount})</span>
            </button>

            <button
              id="tab-variations-btn"
              className={`sidebar-tab-btn ${activeTab === 'variations' ? 'active' : ''}`}
              onClick={() => setActiveTab('variations')}
            >
              <Vote size={15} />
              <span>Variations</span>
            </button>
          </div>

          {/* ── Sidebar Body ── */}
          <div className="cinema-sidebar-body">

            {/* ── AI TAB ── */}
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* AI Settings bar */}
                <div className="room-ai-settings-bar">
                  <div>
                    <strong style={{ color: 'var(--netflix-red)', fontSize: '0.75rem' }}>
                      AI Co-Pilot Active
                    </strong>
                    <div style={{ color: '#888', fontSize: '0.7rem', marginTop: '2px' }}>
                      Verbosity: <span style={{ color: '#e5e5e5', textTransform: 'capitalize' }}>
                        {currentSpace?.settings?.aiVerbosity || 'moderate'}
                      </span>
                      {currentSpace?.settings?.votingEnabled && (
                        <span style={{ marginLeft: '0.5rem' }}>• <Vote size={10} style={{ display: 'inline' }} /> Voting ON</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI conversation history area */}
                <div className="room-ai-messages" style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="room-ai-bubble">
                    <div className="room-ai-bubble-header">
                      <Sparkles size={13} />
                      <span>Netflix Co-Pilot</span>
                    </div>
                    <p>
                      Hi {user?.displayName}! I'm watching <strong>{titleName}</strong> with
                      your space. Ask me anything about the characters, lore, or timeline —
                      without fear of spoilers.
                    </p>
                  </div>

                  {aiHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`room-ai-bubble ${item.role === 'user' ? 'user-question' : ''}`}
                      style={item.role === 'user' ? { background: 'rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.3)', alignSelf: 'flex-end', marginLeft: '1.5rem' } : {}}
                    >
                      <div className="room-ai-bubble-header">
                        {item.role === 'user' ? <Users size={12} /> : <Sparkles size={13} />}
                        <span>{item.role === 'user' ? user?.displayName || 'You' : 'Netflix Co-Pilot'}</span>
                        {item.executionTimeMs && (
                          <span style={{ fontSize: '0.65rem', color: '#888', marginLeft: 'auto' }}>
                            {item.executionTimeMs}ms
                          </span>
                        )}
                      </div>
                      <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{item.text}</p>

                      {/* Source events chips */}
                      {item.sourceEvents && item.sourceEvents.length > 0 && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.65rem', color: '#aaa', width: '100%', fontWeight: 700 }}>GROUNDED SOURCES:</span>
                          {item.sourceEvents.slice(0, 3).map((src, sIdx) => (
                            <span
                              key={sIdx}
                              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.65rem', color: '#ddd' }}
                            >
                              {formatTime(src.timestampSec)} • {src.eventType}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="room-ai-bubble" style={{ opacity: 0.8 }}>
                      <div className="room-ai-bubble-header">
                        <Loader size={13} className="spin-icon" />
                        <span>Analyzing timeline metadata…</span>
                      </div>
                    </div>
                  )}

                  {aiHistory.length === 0 && (
                    <div style={{ marginTop: 'auto', paddingBottom: '0.5rem' }}>
                      <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Suggested Questions
                      </p>
                      {[
                        'Who is the main character?',
                        'What just happened in this scene?',
                        'Explain the world-building so far',
                      ].map((q) => (
                        <button
                          key={q}
                          className="room-suggested-q"
                          onClick={() => handleAskAi(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI input form */}
                <form
                  className="room-ai-input-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskAi();
                  }}
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <input
                    id="ai-question-input"
                    type="text"
                    className="room-text-input"
                    placeholder="Ask AI about this scene…"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    disabled={aiLoading}
                  />
                  <button
                    type="submit"
                    id="ai-send-btn"
                    className="circle-icon-btn space-btn"
                    style={{ width: '36px', height: '36px' }}
                    disabled={aiLoading || !aiQuestion.trim()}
                  >
                    {aiLoading ? <Loader size={14} className="spin-icon" /> : <Send size={14} />}
                  </button>
                </form>
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Chat Panel Header Card */}
                <div className="chat-panel-header">
                  <div className="chat-header-title-group">
                    <div className="chat-header-main">
                      <MessageSquare size={18} color="var(--netflix-red)" />
                      <span>Chat</span>
                    </div>
                    <div className="chat-header-subtitle">
                      <span className="live-green-dot" />
                      <span>{liveViewerCount} watching now</span>
                    </div>
                  </div>
                  <button
                    className="circle-icon-btn"
                    style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }}
                    onClick={() => setIsSidebarOpen(false)}
                    title="Collapse Chat"
                  >
                    <ChevronDown size={18} color="#aaa" />
                  </button>
                </div>

                {/* Chat message history list */}
                <div
                  ref={chatMessagesContainerRef}
                  className="room-chat-messages-container"
                >
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty-state">
                      <div className="chat-empty-icon">
                        <MessageSquare size={22} color="var(--netflix-red)" />
                      </div>
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        No messages yet
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Start the conversation while you watch.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const senderIdStr = msg.senderUserId?._id || msg.senderUserId || msg.senderId?._id || msg.senderId;
                      const isMe = senderIdStr === user?._id || senderIdStr === user?.id;
                      const senderDisplayName = msg.displayName || msg.senderName || (isMe ? 'You' : 'Participant');
                      const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                      if (msg.isSystem) {
                        const isJoin = msg.text?.includes('joined');
                        return (
                          <div key={msg._id || idx} className="chat-system-event-card">
                            {isJoin ? <Users size={13} color="#9ca3af" /> : <LogOut size={13} color="#ef4444" />}
                            <span>{msg.text}</span>
                            <span className="event-time">{timeStr}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={msg._id || idx} className={`chat-msg-row ${isMe ? 'me' : 'other'}`}>
                          <div className="chat-msg-header">
                            {!isMe && <AvatarInitial name={senderDisplayName} color={color} size={24} />}
                            <span className="chat-sender-name">{isMe ? 'You' : senderDisplayName}</span>
                            <span className="chat-time-stamp">{timeStr}</span>
                            {isMe && <AvatarInitial name={user?.displayName || 'You'} color="var(--netflix-red)" size={24} />}
                          </div>
                          <div className={isMe ? 'chat-bubble-me' : 'chat-bubble-other'}>
                            <p style={{ margin: 0 }}>{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Typing indicator prompt */}
                {Object.keys(typingUsers).filter(id => id !== user?._id).length > 0 && (
                  <div className="room-typing-indicator" style={{ padding: '0.3rem 1rem', fontSize: '0.7rem', color: '#888', fontStyle: 'italic' }}>
                    {Object.values(typingUsers).join(', ')} is typing…
                  </div>
                )}

                {/* Reaction Dock Bar */}
                <div className="chat-reaction-dock">
                  {[
                    { name: 'fire', icon: <Flame size={15} color="#e50914" /> },
                    { name: 'spark', icon: <Sparkles size={15} color="#f59e0b" /> },
                    { name: 'heart', icon: <Heart size={15} color="#ef4444" fill="#ef4444" /> },
                    { name: 'zap', icon: <Zap size={15} color="#38bdf8" /> },
                    { name: 'like', icon: <ThumbsUp size={15} color="#22c55e" /> },
                  ].map((item) => (
                    <button
                      key={item.name}
                      className="chat-reaction-btn"
                      onClick={() => sendEmojiReaction(item.name)}
                      title={`React ${item.name}`}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>

                {/* Message Composer */}
                <div className="chat-composer-container">
                  <form
                    className="chat-composer-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (chatInputText.trim()) {
                        sendChatMessage(chatInputText);
                        setChatInputText('');
                        sendTypingIndicator(false);
                      }
                    }}
                  >
                    <div className="chat-input-wrapper">
                      <Smile size={18} color="#888" className="chat-input-smile" />
                      <input
                        id="chat-input"
                        type="text"
                        className="chat-input-field"
                        placeholder="Send a message..."
                        value={chatInputText}
                        onChange={(e) => {
                          setChatInputText(e.target.value);
                          sendTypingIndicator(true);
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                          typingTimeoutRef.current = setTimeout(() => sendTypingIndicator(false), 2000);
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      id="chat-send-btn"
                      className="chat-send-btn"
                      disabled={!chatInputText.trim()}
                      title="Send message"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── VIEWERS TAB ── */}
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Room info card */}
                <div className="room-info-card">
                  <div className="room-info-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {presenceState.isLocked ? <Lock size={12} color="#ef4444" /> : <Unlock size={12} />}
                      {presenceState.isLocked ? 'Room Locked' : 'Room Unlocked'}
                    </span>
                    {isHost && (
                      <button
                        className="cs-copy-btn"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => sendModerationAction({ action: 'lock', isLocked: !presenceState.isLocked })}
                      >
                        {presenceState.isLocked ? 'Unlock Room' : 'Lock Room'}
                      </button>
                    )}
                  </div>
                  <div className="room-info-row">
                    <span><Users size={12} /></span>
                    <span>{liveViewerCount} active viewers</span>
                  </div>
                </div>

                {/* Member list with Host Moderation */}
                {liveMembers.map((member, idx) => {
                  const memberId = member.userId || member._id?.toString?.() || member._id;
                  const displayName = member.displayName || 'User';
                  const isCurrentUser = memberId === user?._id;
                  const isMemberHost = member.isHost || memberId === currentSpace?.hostUserId?._id || memberId === currentSpace?.hostUserId;
                  const isMuted = member.isMuted;
                  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                  return (
                    <div
                      key={member.socketId || `${memberId}-${idx}`}
                      className={`room-member-row ${isCurrentUser ? 'current-user' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AvatarInitial name={displayName} color={isMemberHost ? 'var(--netflix-red)' : color} />
                        <div className="room-member-info">
                          <div className="room-member-name" style={{ fontSize: '0.85rem' }}>
                            {displayName}
                            {isCurrentUser && <span className="room-you-badge">You</span>}
                          </div>
                          <div className="room-member-role" style={{ fontSize: '0.7rem' }}>
                            {isMemberHost ? (
                              <span style={{ color: 'var(--netflix-red)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Crown size={11} /> Host
                              </span>
                            ) : (
                              <span style={{ color: isMuted ? '#f59e0b' : '#22c55e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                ● {isMuted ? 'Muted' : 'Online'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Host Moderation Control Buttons */}
                      {isHost && !isCurrentUser && !isMemberHost && (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button
                            className="circle-icon-btn"
                            style={{ width: '26px', height: '26px' }}
                            title={isMuted ? 'Unmute' : 'Mute'}
                            onClick={() => sendModerationAction({ action: isMuted ? 'unmute' : 'mute', targetUserId: memberId })}
                          >
                            {isMuted ? <VolumeX size={12} color="#ef4444" /> : <Volume2 size={12} />}
                          </button>

                          <button
                            className="circle-icon-btn"
                            style={{ width: '26px', height: '26px' }}
                            title="Make Host"
                            onClick={() => {
                              if (window.confirm(`Transfer host privileges to ${displayName}?`)) {
                                sendModerationAction({ action: 'transfer_host', targetUserId: memberId });
                              }
                            }}
                          >
                            <Crown size={12} color="#f59e0b" />
                          </button>

                          <button
                            className="circle-icon-btn"
                            style={{ width: '26px', height: '26px' }}
                            title="Remove from Room"
                            onClick={() => sendModerationAction({ action: 'kick', targetUserId: memberId })}
                          >
                            <StopCircle size={12} color="#ef4444" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Invite section */}
                {currentSpace?.inviteCode && (
                  <div className="room-invite-section">
                    <p className="room-invite-label">Invite others</p>
                    <div className="room-invite-code-row">
                      <span className="room-invite-code-display">{currentSpace.inviteCode}</span>
                      <button
                        id="viewers-copy-code-btn"
                        className="cs-copy-btn"
                        onClick={() => copyText(currentSpace.inviteCode, 'vcode')}
                        title="Copy code"
                      >
                        {copied === 'vcode' ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── VARIATIONS TAB (Part 8: Narrative Variations & Localization) ── */}
            {activeTab === 'variations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Subtitle / Localization Status Card */}
                <div className="room-info-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <Globe size={16} color="var(--netflix-red)" />
                    <span>Active Localization Variant</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                    <div>Locale Preference: <strong style={{ color: '#fff' }}>{selectedLocale}</strong></div>
                    <div>Subtitle Track: <strong style={{ color: '#22c55e' }}>{selectedSubtitle}</strong></div>
                  </div>
                </div>

                {/* Pre-Authored Narrative Variation Points List */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    <Zap size={16} color="#f59e0b" />
                    <span>Pre-Authored Variation Points</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {PRE_AUTHORED_VARIATION_POINTS.map((vp) => {
                      const isPointActive = activeVote && activeVote.variationPointId === vp.id;
                      return (
                        <div
                          key={vp.id}
                          style={{
                            background: isPointActive ? 'rgba(229,9,20,0.15)' : 'rgba(255,255,255,0.04)',
                            border: isPointActive ? '1px solid var(--netflix-red)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{vp.title}</strong>
                            {isPointActive && <span style={{ fontSize: '0.65rem', background: 'var(--netflix-red)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>VOTING LIVE</span>}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.6rem' }}>{vp.promptText}</p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                            {vp.options.map((o) => (
                              <div key={o.id} style={{ fontSize: '0.75rem', color: '#ddd', background: 'rgba(0,0,0,0.4)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                                {o.text}
                              </div>
                            ))}
                          </div>

                          {/* Host Trigger Vote Button */}
                          {isHost ? (
                            <button
                              className="btn-netflix-play"
                              style={{
                                width: '100%',
                                fontSize: '0.75rem',
                                padding: '0.4rem',
                                background: isPointActive ? '#666' : 'var(--netflix-red)',
                              }}
                              disabled={!!activeVote}
                              onClick={() =>
                                openVariationVote({
                                  variationPointId: vp.id,
                                  promptText: vp.promptText,
                                  options: vp.options,
                                  durationSec: 15,
                                })
                              }
                            >
                              <Vote size={13} style={{ marginRight: '4px', display: 'inline' }} />
                              {isPointActive ? 'Vote in Progress…' : 'Trigger Variation Vote'}
                            </button>
                          ) : (
                            <div style={{ fontSize: '0.7rem', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                              Pre-approved branch option. Host will initiate voting.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>
        </aside>
      )}
      {/* ══ REALTIME SOCKET DIAGNOSTIC DEBUG PANEL ══════════════════════════ */}
      {import.meta.env.DEV && (
        <div
          className="watch-socket-debug-panel"
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(15, 15, 15, 0.92)',
            border: '1px solid rgba(229, 9, 20, 0.4)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#fff',
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#e50914', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px', marginBottom: '2px' }}>
            [WATCH_SOCKET DEBUG]
          </div>
          <div>Socket: <span style={{ color: socketConnected ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{socketConnected ? 'CONNECTED' : 'DISCONNECTED'}</span></div>
          <div>Socket ID: <span style={{ color: '#38bdf8' }}>{socketId || 'N/A'}</span></div>
          <div>Transport: <span style={{ color: '#f59e0b' }}>{socketTransport || 'N/A'}</span></div>
          <div>Room: <span style={{ color: '#a855f7' }}>{currentSpace?._id || roomId || 'N/A'}</span></div>
          <div>User: <span style={{ color: '#eab308' }}>{user?.displayName || user?._id || 'Guest'}</span></div>
        </div>
      )}
    </div>
  );
};

export default WatchSpace;
