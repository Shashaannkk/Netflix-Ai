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
  Server,
  Layers,
  Film,
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useWatchSpace } from '../context/WatchSpaceContext';
import { useAuth } from '../context/AuthContext';
import { askAiCoPilotApi } from '../services/watchSpaceApi';
import { fetchSeasonEpisodes, fetchMediaDetails } from '../services/tmdb';
import NetflixVideoPlayer from '../components/NetflixVideoPlayer';
import { MOVIE_SERVERS, WATCH_TOGETHER_DEMO_CONFIG, getServerStreamUrl, cleanTmdbId, classifySource, getPlayerMode, SERVER_8_CANONICAL_SOURCE, isObsoleteSampleUrl } from '../services/movieServers';
import {
  CINEMATIC_AVATARS,
  getStableAvatar,
  getStableColor,
  getStableAvatarObj,
} from '../services/avatarRegistry';

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

const UserAvatar = ({ userId, name, customAvatar, isAi = false, size = 26 }) => {
  if (isAi) {
    return (
      <div
        className="room-avatar ai-avatar-badge"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)',
          flexShrink: 0,
        }}
        title="Nova AI Assistant"
      >
        <Sparkles size={size * 0.55} color="#ffffff" />
      </div>
    );
  }

  const avatarObj = getStableAvatarObj(userId, name, customAvatar);
  const avatarUrl = avatarObj.src || getStableAvatar(userId, name, customAvatar);
  const color = getStableColor(userId, name);
  const characterName = avatarObj.character || 'Avatar';

  return (
    <div
      className="room-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      title={`${name || 'User'} (${characterName})`}
    >
      <img
        src={avatarUrl}
        alt={name || characterName}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
};

const WatchSpace = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    sendServerChange,
    mediaConfigState,
    sendMediaConfigChange,
    driftInfo,
    presenceState,
    chatMessages,
    setChatMessages,
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
  const videoRef = useRef(null);
  const controlsTimer = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Syncing…');

  // Multi-server & Episode state (Default Server 9 = Watch Together Demo Engine)
  const [selectedServer, setSelectedServer] = useState(playbackState?.serverNum || 9);
  const [selectedSeason, setSelectedSeason] = useState(playbackState?.season || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(playbackState?.episode || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Live Server Sync: Instantly reflect server changes on viewer UI without page refresh
  useEffect(() => {
    if (!isHost && playbackState?.serverNum !== undefined && playbackState.serverNum !== selectedServer) {
      console.log('[WATCHSPACE REACTIVE SERVER SYNC]', {
        prevServer: selectedServer,
        newServer: playbackState.serverNum,
        isHost,
      });
      setSelectedServer(playbackState.serverNum);
    }
  }, [playbackState?.serverNum, selectedServer, isHost]);

  useEffect(() => {
    if (playbackState.season && playbackState.season !== selectedSeason) {
      console.log('[WATCHSPACE PARTICIPANT SYNC SEASON]', {
        prevSeason: selectedSeason,
        newSeason: playbackState.season,
      });
      setSelectedSeason(playbackState.season);
    }
  }, [playbackState.season, selectedSeason]);

  useEffect(() => {
    if (playbackState.episode && playbackState.episode !== selectedEpisode) {
      console.log('[WATCHSPACE PARTICIPANT SYNC EPISODE]', {
        prevEpisode: selectedEpisode,
        newEpisode: playbackState.episode,
      });
      setSelectedEpisode(playbackState.episode);
    }
  }, [playbackState.episode, selectedEpisode]);

  const handleSelectServer = (sNum) => {
    if (!isHost) return;
    console.log('[WATCHSPACE SELECT SERVER]', { sNum, isHost, currentSpaceId: currentSpace?._id });
    setSelectedServer(sNum);
    if (sendServerChange) {
      sendServerChange({
        serverNum: sNum,
        season: selectedSeason,
        episode: selectedEpisode,
        positionSeconds: currentTime || 0,
      });
    }
  };

  const handleSelectSeason = (seasonNum) => {
    if (!isHost) return;
    setSelectedSeason(seasonNum);
    setSelectedEpisode(1);
    if (sendServerChange) {
      sendServerChange({
        serverNum: selectedServer,
        season: seasonNum,
        episode: 1,
        positionSeconds: 0,
      });
    }
  };

  const handleSelectEpisode = (epNum) => {
    if (!isHost) return;
    setSelectedEpisode(epNum);
    if (sendServerChange) {
      sendServerChange({
        serverNum: selectedServer,
        season: selectedSeason,
        episode: epNum,
        positionSeconds: 0,
      });
    }
  };

  // ── UI & AI state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copied, setCopied] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showTriviaAnswer, setShowTriviaAnswer] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);

  // Server 9 Watch Together Demo State & Preferences
  const [showDemoBanner, setShowDemoBanner] = useState(() => {
    return !sessionStorage.getItem('dismissed_watch_together_demo_banner');
  });
  const [selectedAudioLang, setSelectedAudioLang] = useState(WATCH_TOGETHER_DEMO_CONFIG.defaultLanguage);
  const [selectedDemoSub, setSelectedDemoSub] = useState(WATCH_TOGETHER_DEMO_CONFIG.defaultSubtitle);
  const [selectedDemoQuality, setSelectedDemoQuality] = useState(WATCH_TOGETHER_DEMO_CONFIG.defaultQuality);

  // Sync Server 9 audio, subtitles & quality from host mediaConfigState broadcast
  useEffect(() => {
    if (mediaConfigState) {
      if (mediaConfigState.audioLang) setSelectedAudioLang(mediaConfigState.audioLang);
      if (mediaConfigState.subTrack) setSelectedDemoSub(mediaConfigState.subTrack);
      if (mediaConfigState.quality) setSelectedDemoQuality(mediaConfigState.quality);
    }
  }, [mediaConfigState]);

  const handleDismissDemoBanner = () => {
    setShowDemoBanner(false);
    sessionStorage.setItem('dismissed_watch_together_demo_banner', 'true');
  };



  useEffect(() => {
    setShowTriviaAnswer(false);
  }, [currentTrivia]);

  // ── Chat & Fullscreen Overlay Refs & State ────────────────────────────────
  const chatMessagesContainerRef = useRef(null);
  const isInitialChatLoadRef = useRef(true);
  const prevChatLengthRef = useRef(0);
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
          const senderDisplayName = msg.displayName || msg.senderName || (msg.isAi ? 'Nova' : (isMe ? 'You' : 'Participant'));

          const newItem = {
            id: msg._id || `float-${Date.now()}-${Math.random()}`,
            text: msg.text,
            senderName: senderDisplayName,
            senderUserId: senderIdStr,
            isMe,
            isAi: !!msg.isAi,
            isSystem: !!msg.isSystem,
            timestamp: Date.now(),
          };

          setFullscreenFloatingItems((prev) => [...prev.slice(-2), newItem]);

          const displaySec = msg.isSystem ? 2500 : 4000;
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
  }, [chatMessages, aiLoading]);

  // Unified Chat Submission Handler with @ai trigger
  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    const rawText = chatInputText.trim();
    if (!rawText) return;

    setChatInputText('');
    sendTypingIndicator(false);

    // 1. Send normal chat message to space room
    sendChatMessage(rawText);

    // 2. Check for @ai trigger using case-insensitive word boundary parser: /(^|\s)@ai\b/i
    const isAiTriggered = /(^|\s)@ai\b/i.test(rawText);

    if (isAiTriggered) {
      setAiLoading(true);
      try {
        let answerText = '';
        let sourceEvents = [];

        if (currentSpace?._id) {
          try {
            const res = await askAiCoPilotApi(currentSpace._id, {
              userId: user?._id,
              currentTs: currentTime || 0,
              question: rawText,
            });
            if (res.data?.answer) {
              answerText = res.data.answer;
              sourceEvents = res.data.sourceEvents || [];
            }
          } catch (apiErr) {
            console.warn('[AI @ai] API fallback trigger:', apiErr?.message);
          }
        }

        if (!answerText) {
          const currentSec = Math.floor(currentTime || 0);
          answerText = `At timestamp ${formatTime(currentSec)} in **${effectiveSpace?.titleId?.title || 'Watch Together Demo'}**, Nova AI Co-Pilot is tracking Thom and Celia navigating the central neural memory confrontation.`;
          sourceEvents = [{ timestampSec: currentSec, eventType: 'scene' }];
        }

        const tempAiId = `ai-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newAiMsg = {
          _id: tempAiId,
          text: answerText,
          isAi: true,
          senderName: 'Netflix AI Co-Pilot',
          displayName: 'Netflix AI Co-Pilot',
          senderUserId: 'ai-copilot-nova',
          senderId: 'ai-copilot-nova',
          sourceEvents,
          createdAt: new Date().toISOString(),
        };

        // 1. Immediately insert locally into chat state for instant UI rendering
        setChatMessages((prev) => [...prev, newAiMsg]);

        // 2. Broadcast over socket to room participants
        sendChatMessage(answerText, {
          isAi: true,
          senderName: 'Netflix AI Co-Pilot',
          displayName: 'Netflix AI Co-Pilot',
          senderUserId: 'ai-copilot-nova',
          senderId: 'ai-copilot-nova',
          clientMsgId: tempAiId,
          sourceEvents,
        });
      } catch (err) {
        console.error('[AI @ai] Error handling AI question:', err);
      } finally {
        setAiLoading(false);
      }
    }
  };

  // Dedicated Nova AI Co-Pilot Tab Submission Handler
  const handleSendNovaAiMessage = async (customPrompt) => {
    const rawText = typeof customPrompt === 'string' ? customPrompt.trim() : chatInputText.trim();
    if (!rawText) return;

    setChatInputText('');
    setAiLoading(true);

    const formattedUserMsg = rawText.toLowerCase().includes('@ai') ? rawText : `@ai ${rawText}`;
    sendChatMessage(formattedUserMsg);

    try {
      let answerText = '';
      let sourceEvents = [];

      if (currentSpace?._id) {
        try {
          const res = await askAiCoPilotApi(currentSpace._id, {
            userId: user?._id,
            currentTs: currentTime || 0,
            question: formattedUserMsg,
          });
          if (res.data?.answer) {
            answerText = res.data.answer;
            sourceEvents = res.data.sourceEvents || [];
          }
        } catch (apiErr) {
          console.warn('[AI Nova Tab] API fallback trigger:', apiErr?.message);
        }
      }

      if (!answerText) {
        const currentSec = Math.floor(currentTime || 0);
        answerText = `At timestamp ${formatTime(currentSec)} in **${effectiveSpace?.titleId?.title || 'Watch Together Demo'}**, Nova AI Co-Pilot is tracking active scene developments and character interactions on screen.`;
        sourceEvents = [{ timestampSec: currentSec, eventType: 'scene' }];
      }

      const tempAiId = `ai-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newAiMsg = {
        _id: tempAiId,
        text: answerText,
        isAi: true,
        senderName: 'Netflix AI Co-Pilot',
        displayName: 'Netflix AI Co-Pilot',
        senderUserId: 'ai-copilot-nova',
        senderId: 'ai-copilot-nova',
        sourceEvents,
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, newAiMsg]);

      sendChatMessage(answerText, {
        isAi: true,
        senderName: 'Netflix AI Co-Pilot',
        displayName: 'Netflix AI Co-Pilot',
        senderUserId: 'ai-copilot-nova',
        senderId: 'ai-copilot-nova',
        clientMsgId: tempAiId,
        sourceEvents,
      });
    } catch (err) {
      console.error('[AI Nova Tab] Error fetching Nova response:', err);
    } finally {
      setAiLoading(false);
    }
  };

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
      loadSpace(roomId).catch(() => { });
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
    if (isPlaying && (selectedServer === 8 || selectedServer === 9)) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3500);
    }
  };

  useEffect(() => {
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, []);

  // ── Sync Status Pill State ──────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) {
      setSyncStatus('Host Authoritative');
      return;
    }

    if (playbackState.hostConnected === false) {
      setSyncStatus('Host Disconnected (Paused)');
      return;
    }

    setSyncStatus('🟢 In Sync');
  }, [isHost, playbackState.hostConnected, playbackState.lastUpdatedTs]);

  // ── Video callbacks & Host Emission ─────────────────────────────────────────
  const togglePlay = () => {
    if (!isHost) return;
    const player = videoRef.current;
    const nextState = !isPlaying;

    if (player) {
      if (player.togglePlay) {
        player.togglePlay();
      } else if (nextState) {
        player.play?.();
      } else {
        player.pause?.();
      }
    }
    setIsPlaying(nextState);

    if (sendPlaybackUpdate) {
      sendPlaybackUpdate({
        action: nextState ? 'play' : 'pause',
        currentTime: player?.getCurrentTime ? player.getCurrentTime() : currentTime,
        isPlaying: nextState,
      });
    }
  };

  const skip = (secs) => {
    if (!isHost) return;
    const player = videoRef.current;
    const currentDur = duration || (player?.getDuration ? player.getDuration() : 0) || 7200;
    const curTime = player?.getCurrentTime ? player.getCurrentTime() : currentTime;
    const newTime = Math.max(0, Math.min(currentDur, curTime + secs));

    if (player?.seek) {
      player.seek(newTime);
    }
    setCurrentTime(newTime);

    if (sendPlaybackUpdate) {
      sendPlaybackUpdate({
        action: 'seek',
        currentTime: newTime,
        isPlaying,
      });
    }
  };

  const handleSpeedChange = (newSpeed) => {
    const rate = parseFloat(newSpeed);
    if (Number.isNaN(rate) || rate <= 0) return;
    if (videoRef.current?.setPlaybackRate) {
      videoRef.current.setPlaybackRate(rate);
    }
    if (isHost && sendPlaybackUpdate) {
      sendPlaybackUpdate({
        action: 'rateChange',
        playbackRate: rate,
        currentTime: videoRef.current?.getCurrentTime ? videoRef.current.getCurrentTime() : currentTime,
        isPlaying,
      });
    }
  };

  const handleTimeUpdate = (val) => {
    const cur = typeof val === 'number' ? val : (videoRef.current?.getCurrentTime() || 0);
    setCurrentTime(cur);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.getDuration());
  };

  const handleScrubberClick = (e) => {
    const player = videoRef.current;
    if (!player) return;
    if (!isHost) return;

    const currentDur = duration || player.getDuration() || 0;
    if ((player.isReady && !player.isReady()) || !currentDur) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * currentDur;

    player.seek(newTime);
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
    if (videoRef.current) videoRef.current.setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.setMuted(newMuted);
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
    try { await goLive(); } catch { } finally { setIsGoingLive(false); }
  };

  const handleEndRoom = async () => {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 4000); return; }
    setIsEnding(true);
    try { await endRoom(); } catch { } finally { setIsEnding(false); }
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
    live: { label: 'LIVE', cls: 'badge-live' },
    ended: { label: 'Ended', cls: 'badge-ended' },
  };
  const statusBadge = statusConfig[currentSpace?.status] || statusConfig.scheduled;

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
      videoAssetUrl: SERVER_8_CANONICAL_SOURCE,
    }
  };

  const rawTitleObj = effectiveSpace?.titleId;
  const targetTmdbId = cleanTmdbId(
    (typeof rawTitleObj === 'object' && rawTitleObj !== null ? (rawTitleObj.tmdbId || rawTitleObj.id) : null) ||
    (typeof rawTitleObj === 'number' || typeof rawTitleObj === 'string' ? rawTitleObj : null)
  ) || 550;
  const isTvSeries = effectiveSpace?.titleId?.media_type === 'tv' || effectiveSpace?.titleId?.type === 'tv' || Boolean(effectiveSpace?.titleId?.first_air_date);

  // Load TV episodes when season or title changes
  useEffect(() => {
    if (!isTvSeries || !targetTmdbId) return;
    let isMounted = true;
    const loadEp = async () => {
      setLoadingEpisodes(true);
      try {
        const epList = await fetchSeasonEpisodes(targetTmdbId, selectedSeason);
        if (isMounted) setEpisodes(epList || []);
      } catch (err) {
        console.error('Failed to load TV episodes in WatchSpace:', err);
      } finally {
        if (isMounted) setLoadingEpisodes(false);
      }
    };
    loadEp();
    return () => { isMounted = false; };
  }, [targetTmdbId, selectedSeason, isTvSeries]);

  // Load actual movie/TV runtime duration in seconds from TMDB
  useEffect(() => {
    if (!targetTmdbId) return;
    let isMounted = true;
    fetchMediaDetails(targetTmdbId, isTvSeries ? 'tv' : 'movie').then((details) => {
      if (isMounted && details) {
        const mins = details.runtime || (details.episode_run_time && details.episode_run_time[0]) || 120;
        const secs = mins * 60;
        if (secs > 0) setDuration(secs);
      }
    }).catch((err) => {
      console.warn('[WatchSpace] Could not load media duration from TMDB:', err);
    });
    return () => { isMounted = false; };
  }, [targetTmdbId, isTvSeries]);

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (spaceLoading && !currentSpace) {
    return (
      <div className="room-full-loader">
        <Loader size={40} className="spin-icon" color="var(--netflix-red)" />
        <span style={{ color: '#fff', marginTop: '1rem', fontWeight: 600 }}>Loading Netflix AI Watch Space…</span>
      </div>
    );
  }

  // Compute stream URL using 9-Server Architecture (Server 9 = Watch Together Demo, Servers 1-8 = Normal Movies)
  let videoSrc = null;
  let titleName = effectiveSpace?.titleId?.title || 'Netflix AI Watch Space';

  if (selectedServer === 9) {
    videoSrc = getServerStreamUrl({
      tmdbId: targetTmdbId,
      isTv: isTvSeries,
      season: selectedSeason,
      episode: selectedEpisode,
      serverNum: 9,
    });
    titleName = 'Kantara A Legend: Chapter 1';

  } else {
    videoSrc = getServerStreamUrl({
      tmdbId: targetTmdbId,
      isTv: isTvSeries,
      season: selectedSeason,
      episode: selectedEpisode,
      serverNum: selectedServer,
    });
  }

  // Backward compatibility fallback for old records without tmdbId:
  // Use existing stored videoAssetUrl if targetTmdbId is missing and videoAssetUrl is valid & not an obsolete sample URL
  if (!videoSrc && effectiveSpace?.titleId?.videoAssetUrl) {
    const existingUrl = effectiveSpace.titleId.videoAssetUrl;
    if (
      typeof existingUrl === 'string' &&
      (existingUrl.startsWith('http://') || existingUrl.startsWith('https://')) &&
      !isObsoleteSampleUrl(existingUrl)
    ) {
      videoSrc = existingUrl;
    }
  }

  // Final safety net: If videoSrc is missing, invalid, or obsolete, default to SERVER_8_CANONICAL_SOURCE
  if (!videoSrc || classifySource(videoSrc) === 'INVALID') {
    videoSrc = SERVER_8_CANONICAL_SOURCE;
  }

  const isEmbedServer = getPlayerMode(videoSrc, selectedServer) === 'provider';

  console.log('[WATCHSPACE SOURCE]', {
    serverNum: selectedServer,
    season: selectedSeason,
    episode: selectedEpisode,
    tmdbId: targetTmdbId,
    videoSrc,
    playerMode: isEmbedServer ? 'provider' : 'native',
  });

  const videoPoster = effectiveSpace?.titleId?.backdropUrl ||
    effectiveSpace?.titleId?.poster || null;
  const roomCode = effectiveSpace?.inviteCode || roomId || 'NX-0000';

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="cinema-view" onMouseMove={resetControlsTimer}>

      {/* ══ 1. CINEMA VIDEO STAGE ══════════════════════════════════════════════ */}
      <div className="cinema-video-area">

        {/* Top Header Overlay */}
        <div className={`cinema-top-bar ${showControls ? 'visible' : ''}`} style={{ pointerEvents: 'auto', zIndex: 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="cinema-leave-btn"
              onClick={() => isHost ? handleEndRoom() : exitRoom()}
              title="Leave Watch Party"
            >
              <ArrowLeft size={16} color="#e50914" />
              <span>Leave Watch Party</span>
            </button>


          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Authoritative Server Selector Dropdown (Header) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: selectedServer === 9 ? 'rgba(229,9,20,0.35)' : 'rgba(255,255,255,0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: selectedServer === 9 ? '1px solid #e50914' : '1px solid rgba(255,255,255,0.2)', pointerEvents: 'auto' }}>
              <Radio size={14} color="#e50914" />
              <select
                id="header-room-server-selector"
                value={selectedServer}
                disabled={!isHost}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  console.log('[WATCHSPACE HOST CHANGED SERVER]', val);
                  if (isHost) handleSelectServer(val);
                }}
                style={{
                  background: '#141414',
                  color: '#fff',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: isHost ? 'pointer' : 'not-allowed',
                  opacity: isHost ? 1 : 0.75,
                  pointerEvents: 'auto',
                }}
                title={isHost ? "Select Streaming Server Mirror (1-9)" : "Server selection is controlled by the Host"}
              >
                {MOVIE_SERVERS.map((s) => (
                  <option key={s.id} value={s.id} style={{ background: '#141414', color: '#fff' }}>
                    {s.label}
                  </option>
                ))}
              </select>

              {selectedServer === 9 && (
                <span style={{ background: '#e50914', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', marginLeft: '2px', letterSpacing: '0.5px' }}>
                  SYNC DEMO
                </span>
              )}
            </div>

            {/* Live Sync Status Pill */}
            <div
              className="room-sync-status-pill"
              title={isEmbedServer ? "Third-party movie provider embed mode: Manual play per user. Switch to Server 8 or 9 for AI Auto-Sync." : "Real-time Synchronization Engine"}
            >
              {isEmbedServer ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8' }}>
                  <Globe size={12} color="#38bdf8" /> Provider Embed Mode
                </span>
              ) : isHost ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Crown size={12} color="#f59e0b" /> Host Authoritative
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="live-green-dot" /> {syncStatus}
                </span>
              )}
              {!isEmbedServer && driftInfo.rttMs > 0 && <span style={{ opacity: 0.7, marginLeft: '4px' }}>({driftInfo.rttMs}ms RTT)</span>}
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

        {/* Informational Watch Together Demo Banner Toast (Dismissible) */}
        {showDemoBanner && (
          <div
            className="watch-together-demo-toast"
            style={{
              position: 'absolute',
              top: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 600,
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              color: '#fff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(229, 9, 20, 0.6)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              maxWidth: '90%',
              fontSize: '0.85rem',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={16} color="#e50914" />
              <div>
                <strong style={{ color: '#e50914' }}>Watch Together Demo:</strong> For the synchronized Watch Together demonstration, select <strong style={{ color: '#fff' }}>Server 9 — Watch Together Demo</strong>. Servers 1–8 use original movie-provider players.
              </div>
            </div>
            <button
              onClick={handleDismissDemoBanner}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              title="Close banner"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
            key={`player_s${selectedServer}_${videoSrc}`}
            ref={videoRef}
            src={videoSrc}
            // Server 9 must not inherit the workspace movie artwork. Keep the existing poster for Servers 1–8.
            poster={selectedServer === 9 ? null : videoPoster}
            title={titleName}
            isHost={isHost}
            serverNum={selectedServer}
            duration={duration}
            syncTime={playbackState.positionSeconds ?? playbackState.currentTime}
            syncIsPlaying={playbackState.state === 'playing' || playbackState.isPlaying}
            hideDefaultControls={true}
            onTimeUpdate={(t) => setCurrentTime(t)}
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

        {/* Live Recent Chat Ticker Overlay under video player */}
        {chatMessages.length > 0 && (
          <div className="video-under-chat-ticker">
            <div className="ticker-badge">
              <MessageSquare size={13} color="var(--netflix-red)" />
              <span>Live Chat</span>
            </div>
            <div className="ticker-message">
              {(() => {
                const lastMsg = chatMessages[chatMessages.length - 1];
                const isAi = Boolean(lastMsg.isAi || lastMsg.senderUserId === 'ai-copilot-nova' || lastMsg.senderName === 'Netflix AI Co-Pilot' || lastMsg.displayName === 'Netflix AI Co-Pilot');
                const name = isAi ? 'Netflix AI Co-Pilot' : (lastMsg.displayName || lastMsg.senderName || 'User');
                return (
                  <span>
                    <strong style={{ color: isAi ? '#c084fc' : '#e50914' }}>{name}: </strong>
                    {lastMsg.text}
                  </span>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Controls Bar — ONLY FOR NATIVE MEDIA (Servers 8 & 9) ── */}
        {!isEmbedServer && (
          <div className={`cinema-controls-bar ${showControls ? 'visible' : ''}`}>
            {/* Scrubber */}
            <div
              className="netflix-scrubber-track"
              onClick={handleScrubberClick}
              style={{ cursor: isHost ? 'pointer' : 'not-allowed' }}
              title={!isHost ? "Seeking is controlled live by Host (Viewer Mode)" : "Seek"}
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
                <button
                  id="room-play-btn"
                  className="player-btn"
                  onClick={togglePlay}
                  disabled={!isHost}
                  style={{ opacity: isHost ? 1 : 0.45, cursor: isHost ? 'pointer' : 'not-allowed' }}
                  title={!isHost ? 'Playback is controlled live by Host (Viewer Mode)' : (isPlaying ? 'Pause' : 'Play')}
                >
                  {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
                </button>

                <button
                  id="room-back10-btn"
                  className="player-btn"
                  onClick={() => skip(-10)}
                  disabled={!isHost}
                  style={{ opacity: isHost ? 1 : 0.45, cursor: isHost ? 'pointer' : 'not-allowed' }}
                  title={!isHost ? 'Playback is controlled live by Host (Viewer Mode)' : 'Back 10s'}
                >
                  <RotateCcw size={22} />
                </button>

                <button
                  id="room-fwd10-btn"
                  className="player-btn"
                  onClick={() => skip(10)}
                  disabled={!isHost}
                  style={{ opacity: isHost ? 1 : 0.45, cursor: isHost ? 'pointer' : 'not-allowed' }}
                  title={!isHost ? 'Playback is controlled live by Host (Viewer Mode)' : 'Forward 10s'}
                >
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

                {/* Server 9 Dedicated Controls: Audio Language, Subtitles, Quality & Speed */}
                {selectedServer === 9 && (
                  <>
                    {/* Audio Language */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.25rem', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Globe size={13} color="#38bdf8" />
                      <select
                        id="demo-audio-selector"
                        value={selectedAudioLang}
                        disabled={!isHost}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedAudioLang(val);
                          if (isHost && sendMediaConfigChange) {
                            sendMediaConfigChange({ audioLang: val });
                          }
                        }}
                        style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: '0.75rem', cursor: isHost ? 'pointer' : 'not-allowed', opacity: isHost ? 1 : 0.75 }}
                        title={isHost ? "Available Audio Track (Host Controlled)" : "Audio track controlled by Host"}
                      >
                        {WATCH_TOGETHER_DEMO_CONFIG.availableAudioLanguages.map((l) => (
                          <option key={l.code} value={l.code} style={{ background: '#141414', color: '#fff' }}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Video Quality */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.25rem', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Film size={13} color="#e50914" />
                      <select
                        id="demo-quality-selector"
                        value={selectedDemoQuality}
                        disabled={!isHost}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedDemoQuality(val);
                          if (isHost && sendMediaConfigChange) {
                            sendMediaConfigChange({ quality: val });
                          }
                        }}
                        style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: '0.75rem', cursor: isHost ? 'pointer' : 'not-allowed', opacity: isHost ? 1 : 0.75 }}
                        title={isHost ? "Video Stream Quality (Host Controlled)" : "Stream quality controlled by Host"}
                      >
                        {WATCH_TOGETHER_DEMO_CONFIG.availableQualities.map((q) => (
                          <option key={q} value={q} style={{ background: '#141414', color: '#fff' }}>
                            {q}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
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
        )}
      </div>

      {/* ══ 2. CINEMA SIDEBAR ════════════════════════════════════════════════ */}
      {isSidebarOpen && (
        <aside className="cinema-sidebar">

          {/* ── Tab Navigation ── */}
          <div className="cinema-sidebar-tabs">
            <button
              id="tab-chat-btn"
              className={`sidebar-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={15} />
              <span>Party Chat</span>
            </button>

            <button
              id="tab-nova-ai-btn"
              className={`sidebar-tab-btn ai-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
              style={{
                color: activeTab === 'ai' ? '#d8b4fe' : '#c084fc',
                background: activeTab === 'ai' ? 'rgba(168,85,247,0.15)' : 'transparent',
                borderBottom: activeTab === 'ai' ? '2px solid #a855f7' : '2px solid transparent',
              }}
            >
              <Sparkles size={15} color="#c084fc" />
              <span>Nova AI</span>
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
              <span>Branching</span>
            </button>
          </div>

          {/* ── Sidebar Body ── */}
          <div className="cinema-sidebar-body">

            {/* ── DEDICATED NOVA AI CO-PILOT TAB ── */}
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Nova AI Panel Header */}
                <div className="chat-panel-header" style={{ background: 'linear-gradient(135deg, rgba(20,22,28,0.98) 0%, rgba(35,18,50,0.95) 100%)', borderBottom: '1px solid rgba(168,85,247,0.3)' }}>
                  <div className="chat-header-title-group">
                    <div className="chat-header-main">
                      <Sparkles size={18} color="#c084fc" />
                      <span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #d8b4fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Nova AI Co-Pilot</span>
                    </div>
                    <div className="chat-header-subtitle">
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7', display: 'inline-block' }} />
                      <span style={{ color: '#d8b4fe' }}>Real-time Stream Synced • Online</span>
                    </div>
                  </div>
                  <button
                    className="circle-icon-btn"
                    style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }}
                    onClick={() => setIsSidebarOpen(false)}
                    title="Collapse AI Panel"
                  >
                    <ChevronDown size={18} color="#aaa" />
                  </button>
                </div>

                {/* Nova AI Dedicated Chat Messages List */}
                <div ref={chatMessagesContainerRef} className="room-chat-messages-container">
                  <div className="nova-ai-welcome-card" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(229,9,20,0.08) 100%)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '0.6rem', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(168,85,247,0.3) 0%, rgba(236,72,153,0.3) 100%)', marginBottom: '0.5rem', boxShadow: '0 0 16px rgba(168,85,247,0.4)' }}>
                      <Sparkles size={24} color="#fff" />
                    </div>
                    <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.35rem 0' }}>
                      Talk with Nova AI Co-Pilot
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: '#e9d5ff', margin: '0 0 0.75rem 0', lineHeight: '1.45' }}>
                      Ask anything about the movie, characters, plot points, scene context, or any topic. Nova answers in real-time!
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center' }}>
                      {[
                        '🎬 Explain current scene',
                        '👥 Who is on screen?',
                        '🍿 Give me movie trivia',
                        '💡 What is this movie about?',
                        '❓ Explain the ending',
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#f3e8ff', borderRadius: '14px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                          onClick={() => handleSendNovaAiMessage(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Render Nova AI conversations & messages */}
                  {chatMessages.map((msg, idx) => {
                    const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isAiMsg = Boolean(
                      msg.isAi ||
                      msg.senderName === 'Nova' ||
                      msg.displayName === 'Nova' ||
                      msg.senderUserId === 'ai-copilot' ||
                      msg.senderId === 'ai-copilot' ||
                      msg.role === 'assistant'
                    );

                    if (isAiMsg) {
                      return (
                        <div key={msg._id || idx} className="chat-msg-row ai-msg" style={{ width: '100%', marginBottom: '0.85rem' }}>
                          <div className="chat-msg-header" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', boxShadow: '0 0 10px rgba(168,85,247,0.5)' }}>
                              <Sparkles size={13} color="#fff" />
                            </div>
                            <span style={{ color: '#d8b4fe', fontWeight: 800, fontSize: '0.82rem' }}>Netflix AI Co-Pilot</span>
                            <span style={{ fontSize: '0.6rem', background: 'rgba(168,85,247,0.25)', color: '#f3e8ff', padding: '0.1rem 0.4rem', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.4)', fontWeight: 700 }}>NOVA AI</span>
                            <span style={{ fontSize: '0.65rem', color: '#6b7280', marginLeft: 'auto' }}>{timeStr}</span>
                          </div>

                          <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(20,22,28,0.95) 100%)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '14px', padding: '0.75rem 0.9rem', color: '#f3e8ff', fontSize: '0.84rem', lineHeight: '1.5' }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            {msg.sourceEvents && msg.sourceEvents.length > 0 && (
                              <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(168,85,247,0.2)', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.62rem', color: '#c084fc', width: '100%', fontWeight: 700 }}>GROUNDED MOVIE CONTEXT:</span>
                                {msg.sourceEvents.slice(0, 3).map((src, sIdx) => (
                                  <span key={sIdx} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '4px', padding: '0.12rem 0.4rem', fontSize: '0.62rem', color: '#e9d5ff', fontWeight: 600 }}>
                                    {formatTime(src.timestampSec)} • {src.eventType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const senderIdStr = msg.senderUserId?._id || msg.senderUserId || msg.senderId?._id || msg.senderId;
                    const isMe = (senderIdStr === user?._id || senderIdStr === user?.id) && !isAiMsg;
                    const senderDisplayName = msg.displayName || msg.senderName || (isMe ? 'You' : 'Participant');

                    return (
                      <div key={msg._id || idx} className={`chat-msg-row ${isMe ? 'me' : 'other'}`}>
                        <div className="chat-msg-header">
                          {!isMe && <UserAvatar userId={senderIdStr} name={senderDisplayName} size={24} />}
                          <span className="chat-sender-name" style={{ color: isMe ? '#fff' : '#aaa' }}>{isMe ? 'You' : senderDisplayName}</span>
                          <span className="chat-time-stamp">{timeStr}</span>
                        </div>
                        <div className={isMe ? 'chat-bubble-me' : 'chat-bubble-other'}>
                          <p style={{ margin: 0 }}>{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}

                  {aiLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#e9d5ff', background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(20,22,28,0.95) 100%)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 4px 12px rgba(168,85,247,0.25)' }}>
                      <Sparkles size={16} className="spin-icon" color="#c084fc" />
                      <span style={{ fontWeight: 600 }}>Nova AI is analyzing scene context…</span>
                    </div>
                  )}
                </div>

                {/* Nova AI Dedicated Input Composer */}
                <div className="chat-composer-container" style={{ background: 'rgba(25,18,35,0.95)', borderTop: '1px solid rgba(168,85,247,0.25)' }}>
                  <form className="chat-composer-form" onSubmit={(e) => { e.preventDefault(); handleSendNovaAiMessage(); }}>
                    <div className="chat-input-wrapper" style={{ borderColor: 'rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.08)' }}>
                      <Sparkles size={18} color="#c084fc" className="chat-input-smile" />
                      <input
                        id="nova-ai-input"
                        type="text"
                        className="chat-input-field"
                        placeholder="Ask Nova AI Co-Pilot anything about this movie or topic…"
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      id="nova-ai-send-btn"
                      className="chat-send-btn"
                      style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', boxShadow: '0 4px 12px rgba(168,85,247,0.4)' }}
                      disabled={!chatInputText.trim() || aiLoading}
                      title="Ask Nova"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── CHAT TAB (UNIFIED WITH @AI) ── */}
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
                    <div className="chat-empty-state" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                      <div className="chat-empty-icon" style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(229,9,20,0.1)', marginBottom: '0.75rem' }}>
                        <Sparkles size={24} color="var(--netflix-red)" />
                      </div>
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        Chat with everyone while you watch.
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                        Need answers about the movie?<br />
                        Type <span style={{ color: '#a855f7', fontWeight: 700 }}>@ai</span> before your question.
                      </p>
                      <button
                        type="button"
                        className="chat-empty-chip"
                        style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#d8b4fe', borderRadius: '16px', padding: '0.3rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        onClick={() => setChatInputText('@ai who is this character?')}
                      >
                        @ai who is this character?
                      </button>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

                      const isAiMsg = Boolean(
                        msg.isAi ||
                        msg.senderName === 'Nova' ||
                        msg.displayName === 'Nova' ||
                        msg.senderUserId === 'ai-copilot' ||
                        msg.senderId === 'ai-copilot' ||
                        msg.role === 'assistant'
                      );

                      // Render AI Co-Pilot Replay / Response UI Card
                      if (isAiMsg) {
                        return (
                          <div key={msg._id || idx} className="chat-msg-row ai-msg" style={{ width: '100%', marginBottom: '0.85rem' }}>
                            <div className="chat-msg-header" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', boxShadow: '0 0 10px rgba(168,85,247,0.5)' }}>
                                <Sparkles size={13} color="#fff" />
                              </div>
                              <span className="chat-sender-name" style={{ color: '#d8b4fe', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.3px' }}>Netflix AI Co-Pilot</span>
                              <span style={{ fontSize: '0.6rem', background: 'linear-gradient(135deg, rgba(168,85,247,0.3) 0%, rgba(229,9,20,0.3) 100%)', color: '#f3e8ff', padding: '0.12rem 0.45rem', borderRadius: '10px', border: '1px solid rgba(168,85,247,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>NOVA AI</span>
                              <span className="chat-time-stamp" style={{ fontSize: '0.65rem', color: '#6b7280', marginLeft: 'auto' }}>{timeStr}</span>
                            </div>

                            <div className="chat-bubble-ai" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(20,22,28,0.95) 100%)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '14px', padding: '0.75rem 0.9rem', color: '#f3e8ff', fontSize: '0.84rem', lineHeight: '1.5', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontWeight: 400 }}>{msg.text}</p>

                              {msg.sourceEvents && msg.sourceEvents.length > 0 && (
                                <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(168,85,247,0.2)', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.62rem', color: '#c084fc', width: '100%', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Sparkles size={10} color="#c084fc" /> GROUNDED MOVIE CONTEXT:
                                  </span>
                                  {msg.sourceEvents.slice(0, 3).map((src, sIdx) => (
                                    <span key={sIdx} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '4px', padding: '0.12rem 0.4rem', fontSize: '0.62rem', color: '#e9d5ff', fontWeight: 600 }}>
                                      {formatTime(src.timestampSec)} • {src.eventType}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Quick AI follow-up suggestions */}
                              <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                <button
                                  type="button"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#d8b4fe', borderRadius: '12px', padding: '0.2rem 0.55rem', fontSize: '0.68rem', cursor: 'pointer' }}
                                  onClick={() => setChatInputText('@ai explain this scene details')}
                                >
                                  @ai explain scene details
                                </button>
                                <button
                                  type="button"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#d8b4fe', borderRadius: '12px', padding: '0.2rem 0.55rem', fontSize: '0.68rem', cursor: 'pointer' }}
                                  onClick={() => setChatInputText('@ai who is in this scene?')}
                                >
                                  @ai who is in this scene?
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const senderIdStr = msg.senderUserId?._id || msg.senderUserId || msg.senderId?._id || msg.senderId;
                      const isMe = (senderIdStr === user?._id || senderIdStr === user?.id) && !isAiMsg;
                      const senderDisplayName = msg.displayName || msg.senderName || (isMe ? 'You' : 'Participant');
                      const userColor = getStableColor(senderIdStr, senderDisplayName);
                      const hasAiMention = /(^|\s)@ai\b/i.test(msg.text || '');

                      return (
                        <div key={msg._id || idx} className={`chat-msg-row ${isMe ? 'me' : 'other'}`}>
                          <div className="chat-msg-header">
                            {!isMe && <UserAvatar userId={senderIdStr} name={senderDisplayName} size={24} />}
                            <span className="chat-sender-name" style={{ color: isMe ? '#fff' : userColor }}>{isMe ? 'You' : senderDisplayName}</span>
                            {hasAiMention && (
                              <span style={{ fontSize: '0.6rem', background: 'rgba(168,85,247,0.25)', color: '#e9d5ff', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', padding: '0.05rem 0.3rem', fontWeight: 700 }}>
                                AI QUERY
                              </span>
                            )}
                            <span className="chat-time-stamp">{timeStr}</span>
                            {isMe && <UserAvatar userId={user?._id} name={user?.displayName || 'You'} size={24} />}
                          </div>
                          <div className={isMe ? 'chat-bubble-me' : 'chat-bubble-other'}>
                            <p style={{ margin: 0 }}>
                              {hasAiMention ? (
                                <span>
                                  {msg.text.split(/(^|\s)(@ai)\b/gi).map((part, pIdx) => {
                                    if (part.toLowerCase() === '@ai') {
                                      return (
                                        <span key={pIdx} style={{ color: '#a855f7', fontWeight: 800, background: 'rgba(168,85,247,0.18)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.3)', marginRight: '2px' }}>
                                          @ai
                                        </span>
                                      );
                                    }
                                    return part;
                                  })}
                                </span>
                              ) : (
                                msg.text
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {aiLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#e9d5ff', background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(20,22,28,0.95) 100%)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.35)', boxShadow: '0 4px 12px rgba(168,85,247,0.2)' }}>
                      <Sparkles size={16} className="spin-icon" color="#c084fc" />
                      <span style={{ fontWeight: 600 }}>Netflix AI Co-Pilot is analyzing movie context…</span>
                    </div>
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
                    { name: 'fire', emoji: '🔥', icon: <Flame size={15} color="#e50914" /> },
                    { name: 'spark', emoji: '✨', icon: <Sparkles size={15} color="#f59e0b" /> },
                    { name: 'heart', emoji: '❤️', icon: <Heart size={15} color="#ef4444" fill="#ef4444" /> },
                    { name: 'zap', emoji: '⚡', icon: <Zap size={15} color="#38bdf8" /> },
                    { name: 'like', emoji: '👍', icon: <ThumbsUp size={15} color="#22c55e" /> },
                  ].map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="chat-reaction-btn"
                      onClick={() => sendEmojiReaction(item.emoji)}
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
                    onSubmit={handleSendChatMessage}
                  >
                    <div className="chat-input-wrapper">
                      <Smile size={18} color="#888" className="chat-input-smile" />
                      <input
                        id="chat-input"
                        type="text"
                        className="chat-input-field"
                        placeholder="Message the room… • @ai to ask Nova"
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
                  const userColor = getStableColor(memberId, displayName);

                  return (
                    <div
                      key={member.socketId || `${memberId}-${idx}`}
                      className={`room-member-row ${isCurrentUser ? 'current-user' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserAvatar userId={memberId} name={displayName} size={28} />
                        <div className="room-member-info">
                          <div className="room-member-name" style={{ fontSize: '0.85rem', color: userColor }}>
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
