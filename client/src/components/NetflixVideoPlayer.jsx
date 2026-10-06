import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  Loader,
  AlertTriangle,
  RefreshCw,
  Globe,
} from 'lucide-react';

import NetflixIntroScreen from './NetflixIntroScreen';
import HTML5PlayerAdapter from '../services/adapters/HTML5PlayerAdapter';

import {
  isYouTubeUrl,
  getYouTubeVideoId,
  classifySource,
  getPlayerMode,
} from '../services/movieServers';

const SYNC_HARD_CORRECTION_THRESHOLD = 1.2;

export const NetflixVideoPlayer = React.forwardRef(({
  src,
  poster,
  title = 'Movie',
  onTimeUpdate,
  onEnded,
  isHost = true,
  syncTime,
  syncIsPlaying,
  onPlaybackChange,
  hideDefaultControls = false,
  serverNum = 1,
}, forwardedRef) => {
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const adapterRef = useRef(null);
  const isApplyingRemoteUpdateRef = useRef(false);
  const srcRef = useRef(src);
  const syncTimeRef = useRef(syncTime);
  const syncIsPlayingRef = useRef(syncIsPlaying);
  const isHostRef = useRef(isHost);
  const hasAppliedInitialSyncRef = useRef(false);

  const controlsTimeoutRef = useRef(null);
  const holdTimerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0 });

  const [currentSource, setCurrentSource] = useState(src || null);

  // Authoritative Single Player Mode Contract: 'native' | 'provider' | 'invalid'
  const playerMode = getPlayerMode(currentSource);
  const isNative = playerMode === 'native';
  const isProvider = playerMode === 'provider';
  const isInvalid = playerMode === 'invalid';

  // State initialization based on mode contract
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(isNative ? 0 : null);
  const [duration, setDuration] = useState(null);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [mediaState, setMediaState] = useState('LOADING');
  const [mediaError, setMediaError] = useState({
    code: null,
    message: null,
  });

  const [showIntro, setShowIntro] = useState(true);
  const [speedBoost, setSpeedBoost] = useState(false);
  const [seekRipple, setSeekRipple] = useState(null);

  // Diagnostic logging helper for Native Media (Server 8)
  const logNativeDiagnostics = useCallback((tag, videoEl, err = null) => {
    if (!videoEl) return;
    const errorObj = videoEl.error || err;
    console.log(`[PLAYER DIAGNOSTICS - ${tag}]`, {
      mode: 'native',
      source: videoEl.currentSrc || videoEl.src || currentSource,
      readyState: videoEl.readyState,
      networkState: videoEl.networkState,
      duration: videoEl.duration,
      error: errorObj
        ? { code: errorObj.code, message: errorObj.message || 'Media element error' }
        : 'none',
    });
  }, [currentSource]);

  /*
   * Build iframe source for provider mode.
   */
  const buildEmbedSource = useCallback((source) => {
    if (!source) return source;

    if (isYouTubeUrl(source)) {
      const id = getYouTubeVideoId(source);
      if (!id) return source;

      const params = new URLSearchParams({
        enablejsapi: '1',
        origin: typeof window !== 'undefined' ? window.location.origin : 'https://netflix-aipro.vercel.app',
        rel: '0',
        modestbranding: '1',
      });

      return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }

    return source;
  }, []);

  /*
   * Readiness check based on player mode.
   */
  const isMediaReady = useCallback(() => {
    if (isProvider) {
      return Boolean(iframeRef.current);
    }

    if (!isNative) return false;

    const video = videoRef.current;
    if (!video) return false;

    return (
      video.readyState >= 1 &&
      typeof video.duration === 'number' &&
      Number.isFinite(video.duration) &&
      video.duration > 0
    );
  }, [isProvider, isNative]);

  /*
   * Get HTML5 adapter instance for native media. Returns null for provider mode.
   */
  const getAdapter = useCallback(() => {
    if (adapterRef.current) {
      return adapterRef.current;
    }

    if (!videoRef.current || !isNative) {
      return null;
    }

    adapterRef.current = new HTML5PlayerAdapter(videoRef.current);
    return adapterRef.current;
  }, [isNative]);

  /*
   * Expose imperative ref handle according to Phase 1 Player State Contract.
   */
  React.useImperativeHandle(
    forwardedRef,
    () => ({
      getPlayerMode: () => playerMode,

      play: () => isNative ? getAdapter()?.play() : undefined,
      pause: () => isNative ? getAdapter()?.pause() : undefined,
      seek: (pos) => isNative ? getAdapter()?.seek(pos) : undefined,

      getCurrentTime: () => isNative ? (getAdapter()?.getCurrentTime() ?? videoRef.current?.currentTime ?? null) : null,
      getDuration: () => isNative ? (getAdapter()?.getDuration() ?? videoRef.current?.duration ?? null) : null,
      getState: () => isNative ? (getAdapter()?.getState() ?? (videoRef.current?.paused ? 'paused' : 'playing')) : null,

      setPlaybackRate: (rate) => isNative ? getAdapter()?.setPlaybackRate(rate) : undefined,
      setVolume: (vol) => isNative ? getAdapter()?.setVolume(vol) : undefined,
      setMuted: (muted) => isNative ? getAdapter()?.setMuted(muted) : undefined,

      isReady: () => isMediaReady(),

      getTelemetry: () => ({
        mode: playerMode,
        currentTime: isNative ? (videoRef.current?.currentTime ?? null) : null,
        duration: isNative ? (videoRef.current?.duration ?? null) : null,
        isPlaying: isNative ? (videoRef.current ? !videoRef.current.paused : false) : null,
        playbackRate: isNative ? (videoRef.current?.playbackRate ?? null) : null,
        precise: isNative,
        ready: isMediaReady(),
      }),

      get videoElement() {
        return isNative ? videoRef.current : null;
      },
    }),
    [playerMode, isNative, getAdapter, isMediaReady]
  );

  /*
   * Controls auto-hide timer.
   */
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying]);

  /*
   * Seek ripple animation for native media.
   */
  const triggerRipple = useCallback((side, text) => {
    setSeekRipple({ side, text });
    setTimeout(() => {
      setSeekRipple(null);
    }, 800);
  }, []);

  /*
   * Notify WatchSpace about host playback changes (native mode only).
   */
  const notifyPlayback = useCallback(
    (action, positionSeconds, playing) => {
      if (!isHost || isApplyingRemoteUpdateRef.current || !onPlaybackChange) {
        return;
      }

      onPlaybackChange({
        action,
        positionSeconds,
        isPlaying: playing,
      });
    },
    [isHost, onPlaybackChange]
  );

  useEffect(() => {
    syncTimeRef.current = syncTime;
    syncIsPlayingRef.current = syncIsPlaying;
  }, [syncTime, syncIsPlaying]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  /*
   * FIX #4: Clean Player Mode Transitions on source change.
   */
  useEffect(() => {
    if (src === srcRef.current) {
      return;
    }

    // 1. Cleanup old adapter reference
    if (adapterRef.current) {
      adapterRef.current.destroy();
      adapterRef.current = null;
    }

    srcRef.current = src;
    const nextSource = src || null;
    const nextMode = getPlayerMode(nextSource);

    setCurrentSource(nextSource);
    setMediaState('LOADING');
    setMediaError({ code: null, message: null });
    setShowIntro(true);
    hasAppliedInitialSyncRef.current = false;

    // Reset timestamp and duration state according to mode contract
    setIsPlaying(false);
    setCurrentTime(nextMode === 'native' ? 0 : null);
    setDuration(null);
  }, [src]);

  /*
   * Initial sync for non-host participants in native mode.
   */
  const applyInitialParticipantSync = useCallback(() => {
    if (isProvider || isHostRef.current || hasAppliedInitialSyncRef.current) {
      return;
    }

    if (!isMediaReady()) {
      return;
    }

    const targetTime = syncTimeRef.current;
    const shouldPlay = syncIsPlayingRef.current;

    if (typeof targetTime === 'number' && !Number.isNaN(targetTime)) {
      const adapter = getAdapter();

      if (adapter) {
        hasAppliedInitialSyncRef.current = true;
        isApplyingRemoteUpdateRef.current = true;

        adapter.seek(targetTime);
        setCurrentTime(targetTime);

        if (shouldPlay) {
          adapter.play();
          setIsPlaying(true);
        } else {
          adapter.pause();
          setIsPlaying(false);
        }

        setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;
        }, 150);
      }
    }
  }, [isProvider, isMediaReady, getAdapter]);

  /*
   * Native HTML5 Adapter lifecycle initialization and cleanup.
   */
  useEffect(() => {
    if (isProvider) {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
      return undefined;
    }

    if (!videoRef.current || !isNative) {
      return undefined;
    }

    if (adapterRef.current) {
      adapterRef.current.destroy();
    }

    adapterRef.current = new HTML5PlayerAdapter(videoRef.current);

    try {
      videoRef.current.load();
      logNativeDiagnostics('INIT', videoRef.current);
    } catch (err) {
      console.warn('[NetflixVideoPlayer] video.load() diagnostic error:', err);
    }

    return () => {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
  }, [currentSource, isNative, isProvider, logNativeDiagnostics]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimer]);

  /*
   * Watch Together Synchronization logic.
   */
  useEffect(() => {
    if (isProvider) {
      setMediaState('READY');
      return;
    }

    if (!isNative) return;

    if (typeof syncTime !== 'number' || Number.isNaN(syncTime)) {
      return;
    }

    if (isHost) {
      return;
    }

    if (!isMediaReady()) {
      return;
    }

    const adapter = getAdapter();
    if (!adapter) {
      return;
    }

    isApplyingRemoteUpdateRef.current = true;

    if (!isHost && !hasAppliedInitialSyncRef.current) {
      hasAppliedInitialSyncRef.current = true;
      adapter.seek(syncTime);
      setCurrentTime(syncTime);

      if (syncIsPlaying) {
        adapter.play();
        setIsPlaying(true);
      } else {
        adapter.pause();
        setIsPlaying(false);
      }
    } else {
      const localTime = adapter.getCurrentTime();
      const drift = Math.abs(localTime - syncTime);
      const hardCorrectionThreshold = (!syncIsPlaying || !isPlaying) ? 0.25 : SYNC_HARD_CORRECTION_THRESHOLD;

      if (drift > hardCorrectionThreshold) {
        adapter.seek(syncTime);
        setCurrentTime(syncTime);
      }

      if (syncIsPlaying && !isPlaying) {
        adapter.play();
        setIsPlaying(true);
      } else if (!syncIsPlaying && isPlaying) {
        adapter.pause();
        setIsPlaying(false);
      }
    }

    setTimeout(() => {
      isApplyingRemoteUpdateRef.current = false;
    }, 150);
  }, [
    syncTime,
    syncIsPlaying,
    isProvider,
    isNative,
    isMediaReady,
    getAdapter,
    isPlaying,
    isHost,
  ]);

  /*
   * Intro Screen completion.
   */
  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);

    if (isProvider) {
      setMediaState('READY');
      return;
    }

    if (isNative && isMediaReady()) {
      if (isHost) {
        if (syncIsPlaying ?? isPlaying) {
          videoRef.current
            ?.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn('[NetflixVideoPlayer] Autoplay prevented:', err?.message);
            });
        }
      } else {
        applyInitialParticipantSync();
      }
    }
  }, [
    isProvider,
    isNative,
    syncIsPlaying,
    isPlaying,
    isHost,
    isMediaReady,
    applyInitialParticipantSync,
  ]);

  /*
   * Play/Pause Toggle (Native Media only).
   */
  const togglePlay = useCallback(() => {
    if (!isHost || !isNative) {
      return;
    }

    if (!isMediaReady()) {
      return;
    }

    const adapter = getAdapter();
    if (!adapter) {
      return;
    }

    const next = !isPlaying;

    if (next) {
      adapter.play();
    } else {
      adapter.pause();
    }

    setIsPlaying(next);

    notifyPlayback(
      next ? 'play' : 'pause',
      adapter.getCurrentTime(),
      next
    );
  }, [
    isHost,
    isNative,
    isPlaying,
    notifyPlayback,
    isMediaReady,
    getAdapter,
  ]);

  /*
   * Seek by relative seconds (Native Media only).
   */
  const seekBy = useCallback(
    (seconds) => {
      if (!isHost || !isNative || !isMediaReady()) {
        return;
      }

      const adapter = getAdapter();
      if (!adapter) {
        return;
      }

      const max = duration || adapter.getDuration() || 0;
      const next = Math.max(0, Math.min(max, adapter.getCurrentTime() + seconds));

      adapter.seek(next);
      setCurrentTime(next);

      notifyPlayback('seek', next, isPlaying);
    },
    [
      isHost,
      isNative,
      isMediaReady,
      getAdapter,
      duration,
      notifyPlayback,
      isPlaying,
    ]
  );

  /*
   * Mouse/Touch Handlers.
   */
  const handleMouseDown = useCallback(
    (e) => {
      resetControlsTimer();

      if (!isHost || !isNative) {
        return;
      }

      const now = Date.now();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      if (now - lastTapRef.current.time < 300) {
        if (x < width * 0.35) {
          seekBy(-10);
          triggerRipple('left', '-10s ⏪');
        } else if (x > width * 0.65) {
          seekBy(10);
          triggerRipple('right', '⏩ +10s');
        } else {
          togglePlay();
        }

        lastTapRef.current.time = 0;
        return;
      }

      lastTapRef.current = { time: now, x };

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }

      holdTimerRef.current = setTimeout(() => {
        if (isNative && isMediaReady()) {
          getAdapter()?.setPlaybackRate(2);
          setSpeedBoost(true);
        }
      }, 350);
    },
    [
      resetControlsTimer,
      isHost,
      isNative,
      seekBy,
      triggerRipple,
      togglePlay,
      isMediaReady,
      getAdapter,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }

    if (speedBoost) {
      getAdapter()?.setPlaybackRate(1);
      setSpeedBoost(false);
    }
  }, [speedBoost, getAdapter]);

  /*
   * Scrubber Click Handler (Native Media only).
   */
  const handleScrubberClick = useCallback(
    (e) => {
      if (!isHost || !isNative || !isMediaReady()) {
        return;
      }

      const adapter = getAdapter();
      if (!adapter) {
        return;
      }

      const dur = duration || adapter.getDuration() || 0;
      if (!dur) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const next = pct * dur;

      adapter.seek(next);
      setCurrentTime(next);

      notifyPlayback('seek', next, isPlaying);
    },
    [
      isHost,
      isNative,
      isMediaReady,
      getAdapter,
      duration,
      notifyPlayback,
      isPlaying,
    ]
  );

  /*
   * Volume control.
   */
  const handleVolumeChange = useCallback(
    (e) => {
      const val = Number(e.target.value);
      setVolume(val);
      setIsMuted(val === 0);

      if (isNative) {
        getAdapter()?.setVolume(val);
      }
    },
    [getAdapter, isNative]
  );

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    if (isNative) {
      getAdapter()?.setMuted(next);
    }
    setIsMuted(next);
  }, [getAdapter, isMuted, isNative]);

  /*
   * Fullscreen.
   */
  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement || iframeRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  /*
   * Retry Stream.
   */
  const handleRetryStream = useCallback(() => {
    setMediaState('LOADING');
    setMediaError({ code: null, message: null });

    if (isProvider) {
      const srcTemp = currentSource;
      setCurrentSource('');
      requestAnimationFrame(() => {
        setCurrentSource(srcTemp);
      });
    } else if (isNative && videoRef.current) {
      videoRef.current.load();
    }
  }, [isProvider, isNative, currentSource]);

  /*
   * Time formatting helper.
   */
  const formatTime = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    if (!Number.isFinite(sec) || sec <= 0) return '0:00';

    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);

    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progressPct = (duration && currentTime)
    ? Math.min(100, (currentTime / duration) * 100)
    : 0;

  return (
    <div
      key={`${playerMode}_${currentSource}`}
      className="netflix-video-player-container"
      onMouseMove={resetControlsTimer}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Intro Screen for native media */}
      {isNative && showIntro && (
        <NetflixIntroScreen
          title="NETFLIX AI"
          onComplete={handleIntroComplete}
        />
      )}

      {/* Speed Boost Badge for native media */}
      {isNative && speedBoost && (
        <div className="netflix-speed-badge">
          <FastForward size={16} />
          <span>2X SPEED</span>
        </div>
      )}

      {/* Seek Ripple Animation for native media */}
      {isNative && seekRipple && (
        <div className={`netflix-seek-ripple ${seekRipple.side}`}>
          <div className="ripple-circle" />
          <span>{seekRipple.text}</span>
        </div>
      )}

      {isInvalid || mediaState === 'ERROR' ? (
        <div className="netflix-player-error-card">
          <AlertTriangle size={48} color="#e50914" />
          <h3>Playback Source Unavailable</h3>
          <p>
            {mediaError.message ||
              'The selected streaming provider or movie identifier is currently unavailable.'}
          </p>
          <div className="netflix-source-label">
            {title} • {currentSource || 'Invalid URL'}
          </div>
          <button onClick={handleRetryStream} className="netflix-error-btn">
            <RefreshCw size={16} />
            Retry Stream
          </button>
        </div>
      ) : isProvider ? (
        /*
         * PROVIDER EMBED NOTICE (Servers 1-7 without direct HTML5 media)
         * Non-blocking notice for embed servers so Host can select Server 8.
         */
        <div
          className="netflix-provider-notice-container"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1a1a24 0%, #0a0a0d 100%)',
            padding: '1.5rem',
          }}
        >
          {poster && (
            <img
              src={poster}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.15,
                filter: 'blur(8px)',
                pointerEvents: 'none',
              }}
            />
          )}
          <div
            className="netflix-provider-notice-card"
            style={{
              position: 'relative',
              zIndex: 6,
              pointerEvents: 'none',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              padding: '1.25rem 1.75rem',
              maxWidth: '520px',
              textAlign: 'center',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <span>Watch Together Notice</span>
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 0.5rem 0' }}>
              Server {serverNum} is unavailable for Watch Together sync. Select Server 8 for synchronized playback.
            </p>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
              {title} • Provider Embed Mode (Servers 1–7)
            </div>
          </div>
        </div>
      ) : (
        /*
         * MODE B — NATIVE DIRECT MEDIA (Server 8)
         * Direct HTML5 video with full control and telemetry.
         */
        <video
          ref={videoRef}
          src={currentSource}
          poster={poster}
          className="netflix-video-element"
          preload="auto"
          playsInline
          onPlay={(e) => {
            setIsPlaying(true);
            setMediaState('READY');
            logNativeDiagnostics('PLAY', e.currentTarget);
          }}
          onPause={(e) => {
            setIsPlaying(false);
            logNativeDiagnostics('PAUSE', e.currentTarget);
          }}
          onTimeUpdate={(e) => {
            const cur = e.currentTarget?.currentTime || 0;
            setCurrentTime(cur);
            onTimeUpdate?.(cur);
          }}
          onLoadedMetadata={(e) => {
            const videoEl = e.currentTarget;
            logNativeDiagnostics('LOADED_METADATA', videoEl);

            const dur = videoEl.duration;
            if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
              setDuration(dur);
              setMediaState('READY');
              setMediaError({ code: null, message: null });
              applyInitialParticipantSync();
            }
          }}
          onCanPlay={(e) => {
            logNativeDiagnostics('CAN_PLAY', e.currentTarget);
            if (isMediaReady()) {
              setMediaState('READY');
              applyInitialParticipantSync();
            }
          }}
          onError={(e) => {
            const videoEl = e.currentTarget;
            const error = videoEl?.error;
            const code = error?.code || 'UNKNOWN';
            const message = error?.message || 'Media element error reading direct video stream.';

            logNativeDiagnostics('ERROR', videoEl, error);

            setMediaState('ERROR');
            setMediaError({
              code: `CODE_${code}`,
              message: `Media stream error (Code ${code}): ${message}`,
            });
          }}
          onEnded={onEnded}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      )}

      {/* Loading Spinner for Native Player */}
      {mediaState === 'LOADING' && isNative && !showIntro && (
        <div className="netflix-player-loader">
          <Loader size={48} className="spin-icon" color="var(--netflix-red)" />
          <span>Loading Media Metadata…</span>
        </div>
      )}

      {/* Error Overlay for Native Player */}
      {mediaState === 'ERROR' && isNative && (
        <div className="netflix-player-error-overlay">
          <AlertTriangle size={48} color="#ef4444" />
          <h3>Media Initialization Failed</h3>
          <p>
            Unable to load video metadata from stream source.
            {mediaError.code && <span className="error-code">{mediaError.code}</span>}
          </p>
          <button className="btn-netflix-retry" onClick={handleRetryStream}>
            <RefreshCw size={16} />
            Retry Stream
          </button>
        </div>
      )}

      {/* HTML5 Custom Transport Controls Overlay — ONLY FOR NATIVE MODE */}
      {isNative && !hideDefaultControls && (
        <div className={`netflix-controls-overlay ${showControls ? 'visible' : ''}`}>
          <div className="netflix-controls-top">
            <span className="netflix-player-title">{title}</span>
          </div>

          <div className="netflix-controls-bottom">
            <div className="netflix-scrubber-wrapper" onClick={handleScrubberClick}>
              <div className="netflix-scrubber-track">
                <div
                  className="netflix-scrubber-fill"
                  style={{ width: `${progressPct}%` }}
                >
                  <div className="netflix-scrubber-head" />
                </div>
              </div>
            </div>

            <div className="netflix-controls-row">
              <div className="controls-group-left">
                <button
                  className="netflix-ctrl-btn"
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={24} fill="currentColor" />
                  ) : (
                    <Play size={24} fill="currentColor" />
                  )}
                </button>

                <button
                  className="netflix-ctrl-btn"
                  onClick={() => seekBy(-10)}
                  title="Rewind 10s"
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  className="netflix-ctrl-btn"
                  onClick={() => seekBy(10)}
                  title="Forward 10s"
                >
                  <RotateCw size={20} />
                </button>

                <div className="netflix-volume-group">
                  <button className="netflix-ctrl-btn" onClick={toggleMute}>
                    {isMuted || volume === 0 ? (
                      <VolumeX size={20} />
                    ) : (
                      <Volume2 size={20} />
                    )}
                  </button>

                  <input
                    type="range"
                    className="netflix-volume-slider"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                  />
                </div>

                <span className="netflix-time-label">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="controls-group-right">
                <button
                  className="netflix-ctrl-btn"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .netflix-video-player-container {
          cursor: default;
        }

        .provider-mode-overlay-notice {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #e2e8f0;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          z-index: 30;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }

        .netflix-speed-badge {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(229, 9, 20, 0.95);
          color: #fff;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-weight: 800;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          z-index: 100;
          box-shadow:
            0 4px 16px rgba(0,0,0,0.8),
            0 0 20px rgba(229,9,20,0.6);
          letter-spacing: 1px;
        }

        .netflix-seek-ripple {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 90;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: #fff;
          font-weight: 800;
          font-size: 1.1rem;
        }

        .netflix-seek-ripple.left {
          left: 15%;
        }

        .netflix-seek-ripple.right {
          right: 15%;
        }

        .ripple-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(229,9,20,0.35);
          border: 2px solid var(--netflix-red);
          animation: rippleExpand 0.7s ease-out forwards;
        }

        @keyframes rippleExpand {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        .netflix-player-loader,
        .netflix-player-error-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .netflix-player-loader {
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          gap: 0.75rem;
        }

        .spin-icon {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .netflix-player-error-card {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background: #0a0a0a;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
        }

        .netflix-player-error-card h3 {
          font-size: 1.25rem;
          margin: 1rem 0 0.5rem;
        }

        .netflix-player-error-card p {
          color: #aaa;
          max-width: 600px;
          line-height: 1.5;
        }

        .netflix-source-label {
          font-size: 0.75rem;
          color: #777;
          max-width: 80%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin: 0.5rem;
        }

        .netflix-error-btn,
        .btn-netflix-retry {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--netflix-red);
          color: #fff;
          border: 0;
          border-radius: 6px;
          padding: 0.65rem 1.25rem;
          font-weight: 700;
          cursor: pointer;
        }

        .netflix-player-error-overlay {
          inset: 0;
          transform: none;
          top: 0;
          left: 0;
          color: #fff;
          background: rgba(0,0,0,0.55);
        }

        .netflix-player-error-overlay h3 {
          font-size: 1.2rem;
        }

        .netflix-player-error-overlay p {
          color: #aaa;
          text-align: center;
          max-width: 400px;
        }

        .error-code {
          display: block;
          color: #ffb703;
          margin-top: 4px;
        }

        .netflix-controls-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0,0,0,0.7) 0%,
            transparent 20%,
            transparent 75%,
            rgba(0,0,0,0.85) 100%
          );
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.25rem;
          z-index: 40;
        }

        .netflix-controls-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .netflix-controls-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .netflix-player-title {
          color: #fff;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .netflix-controls-bottom {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .netflix-scrubber-wrapper {
          width: 100%;
          padding: 8px 0;
          cursor: pointer;
        }

        .netflix-scrubber-track {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          position: relative;
        }

        .netflix-scrubber-fill {
          height: 100%;
          background: var(--netflix-red);
          border-radius: 2px;
          position: relative;
        }

        .netflix-scrubber-head {
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--netflix-red);
          box-shadow: 0 0 6px rgba(229,9,20,0.8);
        }

        .netflix-controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .controls-group-left,
        .controls-group-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .netflix-ctrl-btn {
          background: transparent;
          border: 0;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: transform 0.15s ease;
        }

        .netflix-ctrl-btn:hover {
          transform: scale(1.15);
          color: var(--netflix-red);
        }

        .netflix-volume-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .netflix-volume-slider {
          width: 70px;
          accent-color: var(--netflix-red);
          cursor: pointer;
        }

        .netflix-time-label {
          color: #ccc;
          font-size: 0.85rem;
          font-weight: 600;
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
});

export default NetflixVideoPlayer;