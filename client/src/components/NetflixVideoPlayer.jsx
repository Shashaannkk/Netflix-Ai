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
  Settings,
  Globe,
  FastForward,
  Loader,
  AlertTriangle,
  RefreshCw,
  Tv,
  Film
} from 'lucide-react';
import NetflixIntroScreen from './NetflixIntroScreen';
import HTML5PlayerAdapter from '../services/adapters/HTML5PlayerAdapter';
import YouTubePlayerAdapter from '../services/adapters/YouTubePlayerAdapter';
import { MOVIE_SERVERS, isEmbedProviderUrl } from '../services/movieServers';

/**
 * NetflixVideoPlayer — Custom Netflix AI Video Player
 */
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
}, forwardedRef) => {
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const adapterRef = useRef(null);
  const isApplyingRemoteUpdateRef = useRef(false);
  const srcRef = useRef(src);

  // Synchronize internal videoRef to forwardedRef
  const handleVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (typeof forwardedRef === 'function') {
      forwardedRef(el);
    } else if (forwardedRef) {
      forwardedRef.current = el;
    }
  }, [forwardedRef]);

  // ── States ─────────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(1);
  const [isMuted, setIsMuted]           = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Media State Machine: 'LOADING' | 'READY' | 'ERROR'
  const [mediaState, setMediaState]     = useState('LOADING');
  const [mediaError, setMediaError]     = useState({ code: null, message: null });
  const [showIntro, setShowIntro]       = useState(true);

  // Double tap & Speed Boost state
  const [speedBoost, setSpeedBoost]     = useState(false);
  const [seekRipple, setSeekRipple]     = useState(null);
  const holdTimerRef                   = useRef(null);
  const lastTapRef                    = useRef({ time: 0, x: 0 });
  const controlsTimeoutRef            = useRef(null);

  // Active Stream Source (Defaults to Server 1 Vidsrc embed or specified src)
  const [currentSource, setCurrentSource] = useState(src || 'https://vidsrc.pro/embed/movie/550');

  const isEmbed = isEmbedProviderUrl(currentSource);

  // Helper: Verify if media element has valid loaded metadata
  const isMediaReady = useCallback(() => {
    const video = videoRef.current;
    if (!video) return false;
    return (
      video.readyState >= 1 && // HAVE_METADATA or higher
      typeof video.duration === 'number' &&
      !Number.isNaN(video.duration) &&
      video.duration > 0
    );
  }, []);

  // Detailed Media Inspector Logger
  const logMediaState = useCallback((eventName) => {
    const video = videoRef.current;
    if (!video) return;
    console.log(
      `[MediaDebug:${eventName}] ` +
      `currentSrc: "${video.currentSrc || video.src}" | ` +
      `readyState: ${video.readyState} | ` +
      `networkState: ${video.networkState} | ` +
      `duration: ${video.duration} | ` +
      `currentTime: ${video.currentTime} | ` +
      `paused: ${video.paused} | ` +
      `error: ${video.error ? `${video.error.code} - ${video.error.message}` : 'none'}`
    );
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    if (isMediaReady() && (syncIsPlaying ?? isPlaying) && isHost) {
      videoRef.current.play().catch((err) => {
        console.warn('[NetflixVideoPlayer] Autoplay prevented by browser:', err.message);
      });
      setIsPlaying(true);
    }
  }, [syncIsPlaying, isPlaying, isHost, isMediaReady]);

  // Update currentSource when src prop changes, avoiding loops if src is unchanged
  useEffect(() => {
    if (src && src !== srcRef.current) {
      srcRef.current = src;
      setCurrentSource(src);
      setMediaState('LOADING');
      setMediaError({ code: null, message: null });
      setShowIntro(true);
    }
  }, [src]);

  // Initialize HTML5 Adapter
  useEffect(() => {
    if (videoRef.current) {
      adapterRef.current = new HTML5PlayerAdapter(videoRef.current);
    }
    return () => {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
  }, [currentSource]);

  // Exhaustive HTML5 Video Event Listeners for Inspection & Debugging
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isEmbed) return;

    const eventsToLog = [
      'loadstart',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'durationchange',
      'progress',
      'waiting',
      'stalled',
      'suspend',
      'error',
      'play',
      'playing',
      'pause',
      'ended'
    ];

    const handlers = {};
    eventsToLog.forEach((evtName) => {
      handlers[evtName] = () => {
        logMediaState(evtName);
      };
    });

    eventsToLog.forEach((evtName) => {
      video.addEventListener(evtName, handlers[evtName]);
    });

    return () => {
      eventsToLog.forEach((evtName) => {
        video.removeEventListener(evtName, handlers[evtName]);
      });
    };
  }, [currentSource, isEmbed, logMediaState]);

  // Synchronize incoming authoritative playback state from backend
  useEffect(() => {
    if (typeof syncTime !== 'number' || isNaN(syncTime)) return;
    if (!isMediaReady()) {
      console.log('[NetflixVideoPlayer] Skipping remote sync update: media metadata not yet loaded (readyState === 0 or duration missing).');
      return;
    }

    const adapter = adapterRef.current || (videoRef.current ? new HTML5PlayerAdapter(videoRef.current) : null);
    if (!adapter) return;

    const localTime = adapter.getCurrentTime();
    const drift = Math.abs(localTime - syncTime);

    logger.sync(`Drift measurement: ${drift.toFixed(3)}s | Target: ${syncTime.toFixed(2)}s | Local: ${localTime.toFixed(2)}s`);

    isApplyingRemoteUpdateRef.current = true;

    // Perform hard correction if drift exceeds threshold or play state differs
    if (drift > SYNC_HARD_CORRECTION_THRESHOLD) {
      logger.playback(`Applying drift correction: ${drift.toFixed(2)}s`);
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

    setTimeout(() => {
      isApplyingRemoteUpdateRef.current = false;
    }, 150);
  }, [syncTime, syncIsPlaying, isMediaReady, isPlaying]);

  // ── Handle Controls Auto-hide ──────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimer]);

  // ── Play / Pause toggle ───────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!isHost) return;
    if (!isMediaReady()) {
      console.warn('[NetflixVideoPlayer] Cannot play: Media metadata is not ready.');
      return;
    }

    const adapter = adapterRef.current || (videoRef.current ? new HTML5PlayerAdapter(videoRef.current) : null);
    if (!adapter) return;

    const nextPlayState = !isPlaying;
    if (nextPlayState) {
      adapter.play();
      setIsPlaying(true);
    } else {
      adapter.pause();
      setIsPlaying(false);
    }

    // Notify backend if Host and not processing remote command
    if (isHost && !isApplyingRemoteUpdateRef.current && onPlaybackChange) {
      onPlaybackChange({
        action: nextPlayState ? 'play' : 'pause',
        positionSeconds: adapter.getCurrentTime(),
        isPlaying: nextPlayState,
      });
    }
  }, [isPlaying, isHost, onPlaybackChange, isMediaReady]);

  // ── Seek helper ────────────────────────────────────────────────────────────
  const seekBy = useCallback((seconds) => {
    if (!isHost) return;
    if (!isMediaReady()) {
      console.warn('[NetflixVideoPlayer] Cannot seek: Media metadata is not ready.');
      return;
    }

    const adapter = adapterRef.current || (videoRef.current ? new HTML5PlayerAdapter(videoRef.current) : null);
    if (!adapter) return;

    const currentDur = duration || videoRef.current?.duration || 0;
    const newTime = Math.max(0, Math.min(currentDur, adapter.getCurrentTime() + seconds));
    adapter.seek(newTime);
    setCurrentTime(newTime);

    if (isHost && !isApplyingRemoteUpdateRef.current && onPlaybackChange) {
      onPlaybackChange({
        action: 'seek',
        positionSeconds: newTime,
        isPlaying,
      });
    }
  }, [duration, isPlaying, isHost, onPlaybackChange, isMediaReady]);

  // ── Press & Hold 2x Speed boost handlers ──────────────────────────────────
  const handleMouseDown = (e) => {
    resetControlsTimer();
    if (!isHost) return;
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Check for double tap (within 300ms)
    if (now - lastTapRef.current.time < 300) {
      if (clickX < width * 0.35) {
        // Double tap LEFT (-10s)
        seekBy(-10);
        triggerRipple('left', '-10s ⏪');
      } else if (clickX > width * 0.65) {
        // Double tap RIGHT (+10s)
        seekBy(10);
        triggerRipple('right', '⏩ +10s');
      } else {
        togglePlay();
      }
      lastTapRef.current.time = 0;
      return;
    }

    lastTapRef.current = { time: now, x: clickX };

    // Set hold timer for 2x speed boost after 350ms hold
    holdTimerRef.current = setTimeout(() => {
      if (videoRef.current && isMediaReady()) {
        videoRef.current.playbackRate = 2.0;
        setSpeedBoost(true);
      }
    }, 350);
  };

  const handleMouseUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (speedBoost && videoRef.current) {
      videoRef.current.playbackRate = 1.0;
      setSpeedBoost(false);
    }
  };

  const triggerRipple = (side, text) => {
    setSeekRipple({ side, text });
    setTimeout(() => setSeekRipple(null), 800);
  };

  // ── Scrubber click ────────────────────────────────────────────────────────
  const handleScrubberClick = (e) => {
    if (!isHost || !isMediaReady()) return;
    const adapter = adapterRef.current || (videoRef.current ? new HTML5PlayerAdapter(videoRef.current) : null);
    if (!adapter) return;

    const currentDur = duration || videoRef.current?.duration || 0;
    if (!currentDur) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * currentDur;
    adapter.seek(newTime);
    setCurrentTime(newTime);

    if (isHost && !isApplyingRemoteUpdateRef.current && onPlaybackChange) {
      onPlaybackChange({
        action: 'seek',
        positionSeconds: newTime,
        isPlaying,
      });
    }
  };

  // ── Volume & Mute ──────────────────────────────────────────────────────────
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // ── Fullscreen toggle ──────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // ── Retry Stream Loading ───────────────────────────────────────────────────
  const handleRetryStream = () => {
    console.log('[NetflixVideoPlayer] Manual retry requested for stream:', currentSource);
    setMediaState('LOADING');
    setMediaError({ code: null, message: null });
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // ── Format time (seconds -> 0:00 or 0:00:00) ──────────────────────────────
  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
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
      {/* 1. Netflix AI Intro Splash Overlay */}
      {showIntro && (
        <NetflixIntroScreen
          title="NETFLIX AI"
          onComplete={handleIntroComplete}
        />
      )}

      {/* 2. 2x Speed Boost Top Floating Badge */}
      {speedBoost && (
        <div className="netflix-speed-badge">
          <FastForward size={16} />
          <span>2X SPEED</span>
        </div>
      )}

      {/* 3. Double-tap Ripple Animation Badge */}
      {seekRipple && (
        <div className={`netflix-seek-ripple ${seekRipple.side}`}>
          <div className="ripple-circle" />
          <span className="ripple-text">{seekRipple.text}</span>
        </div>
      )}

      {/* 4. Video Stage */}
      {isEmbed ? (
        <iframe
          key={currentSource}
          src={(() => {
            if (currentSource.includes('v=') || currentSource.includes('youtu.be') || currentSource.includes('embed') || !currentSource.includes('http')) {
              let videoId = currentSource;
              if (currentSource.includes('v=')) {
                videoId = currentSource.split('v=')[1]?.split('&')[0];
              } else if (currentSource.includes('youtu.be/')) {
                videoId = currentSource.split('youtu.be/')[1]?.split('?')[0];
              } else if (currentSource.includes('embed/')) {
                videoId = currentSource.split('embed/')[1]?.split('?')[0];
              }
              // Extract clean 11-character videoId
              const cleanId = (videoId && videoId.length >= 11) ? videoId.substring(0, 11) : 'YoHD9XEInc0';
              const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : 'https%3A%2F%2Fnetflix-aipro.vercel.app';
              return `https://www.youtube.com/embed/${cleanId}?autoplay=1&enablejsapi=1&origin=${origin}&rel=0&modestbranding=1`;
            }
            return currentSource;
          })()}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin-when-cross-origin"
          onError={() => {
            console.warn('[NetflixVideoPlayer] Embed trailer unavailable. Falling back to Server Alpha HD stream.');
            setCurrentSource('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4');
          }}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <video
          ref={handleVideoRef}
          src={currentSource}
          poster={poster}
          className="netflix-video-element"
          onPlay={() => {
            setIsPlaying(true);
            if (mediaState !== 'READY') setMediaState('READY');
          }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (videoRef.current) {
              const cur = videoRef.current.currentTime;
              setCurrentTime(cur);
              if (onTimeUpdate) onTimeUpdate(cur);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration;
              if (typeof dur === 'number' && !Number.isNaN(dur) && dur > 0) {
                setDuration(dur);
                setMediaState('READY');
                setMediaError({ code: null, message: null });
                console.log(`[NetflixVideoPlayer] Media Metadata Loaded: duration = ${dur}s (${formatTime(dur)})`);
              }
            }
          }}
          onCanPlay={() => {
            if (mediaState !== 'READY' && isMediaReady()) {
              setMediaState('READY');
            }
          }}
          onWaiting={() => {
            if (mediaState === 'READY') {
              console.log('[NetflixVideoPlayer] Video buffering (waiting event fired)');
            }
          }}
          onError={(e) => {
            const errObj = videoRef.current?.error;
            const errCode = errObj?.code || e.target?.error?.code || 'UNKNOWN';
            const errMsg = errObj?.message || e.target?.error?.message || 'Failed to load media source.';
            console.warn(`[NetflixVideoPlayer] Video stream load error (code ${errCode}):`, errMsg, currentSource);

            const SERVER_FALLBACKS = [
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            ];
            const currentIndex = SERVER_FALLBACKS.indexOf(currentSource);
            if (currentIndex !== -1 && currentIndex < SERVER_FALLBACKS.length - 1) {
              const nextServer = SERVER_FALLBACKS[currentIndex + 1];
              console.log(`[NetflixVideoPlayer] Switching to backup stream source (${currentIndex + 2}):`, nextServer);
              setCurrentSource(nextServer);
            } else {
              // End of fallbacks or custom URL error -> enter ERROR state (do NOT remain in infinite LOADING state)
              setMediaState('ERROR');
              setMediaError({ code: errCode, message: errMsg });
            }
          }}
          onEnded={onEnded}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}

      {/* 5. Loading Spinner State */}
      {mediaState === 'LOADING' && !isEmbed && !showIntro && (
        <div className="netflix-player-loader">
          <Loader size={48} className="spin-icon" color="var(--netflix-red)" />
          <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.75rem' }}>
            Loading Media Metadata…
          </span>
        </div>
      )}

      {/* 6. Media Error State & Retry Interface */}
      {mediaState === 'ERROR' && !isEmbed && (
        <div className="netflix-player-error-overlay">
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Media Initialization Failed
          </h3>
          <p style={{ color: '#aaa', fontSize: '0.85rem', maxWidth: '400px', textAlign: 'center', marginBottom: '1rem', lineHeight: '1.4' }}>
            Unable to load video metadata from stream source.
            {mediaError.code && <span style={{ display: 'block', marginTop: '4px', color: '#ffb703' }}>Error Code: {mediaError.code}</span>}
          </p>
          <button
            className="btn-netflix-retry"
            onClick={handleRetryStream}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--netflix-red)',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <RefreshCw size={16} />
            <span>Retry Stream</span>
          </button>
        </div>
      )}

      {/* 7. Netflix AI Custom Controls Bar */}
      {!isEmbed && !hideDefaultControls && (
        <div className={`netflix-controls-overlay ${showControls ? 'visible' : ''}`}>
          {/* Top Title Bar */}
          <div className="netflix-controls-top">
            <span className="netflix-player-title">{title}</span>
          </div>

          {/* Bottom Controls Cluster */}
          <div className="netflix-controls-bottom">
            {/* Scrubber Progress Bar */}
            <div
              className="netflix-scrubber-wrapper"
              onClick={handleScrubberClick}
              title="Seek time"
            >
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
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>

                <button
                  className="netflix-ctrl-btn"
                  onClick={() => seekBy(-10)}
                  title="Rewind 10s (Double-tap left)"
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  className="netflix-ctrl-btn"
                  onClick={() => seekBy(10)}
                  title="Forward 10s (Double-tap right)"
                >
                  <RotateCw size={20} />
                </button>

                {/* Volume slider */}
                <div className="netflix-volume-group">
                  <button className="netflix-ctrl-btn" onClick={toggleMute}>
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    className="netflix-volume-slider"
                    min={0}
                    max={1}
                    step={0.05}
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

      {/* Styles */}
      <style>{`
        .netflix-video-player-container {
          cursor: default;
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
          box-shadow: 0 4px 16px rgba(0,0,0,0.8), 0 0 20px rgba(229, 9, 20, 0.6);
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
        .netflix-seek-ripple.left { left: 15%; }
        .netflix-seek-ripple.right { right: 15%; }

        .ripple-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(229, 9, 20, 0.35);
          border: 2px solid var(--netflix-red);
          animation: rippleExpand 0.7s ease-out forwards;
        }

        @keyframes rippleExpand {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .netflix-player-loader, .netflix-player-error-overlay {
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

        .spin-icon {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .netflix-controls-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.85) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5rem;
          z-index: 80;
        }
        .netflix-controls-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .netflix-player-title {
          color: #fff;
          font-size: 1.25rem;
          font-weight: 800;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }

        .netflix-scrubber-wrapper {
          width: 100%;
          padding: 8px 0;
          cursor: pointer;
        }

        .netflix-scrubber-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          position: relative;
          transition: height 0.15s ease;
        }
        .netflix-scrubber-wrapper:hover .netflix-scrubber-track {
          height: 7px;
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
          transform: translateY(-50%) scale(0);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--netflix-red);
          box-shadow: 0 0 10px rgba(229, 9, 20, 0.8);
          transition: transform 0.15s ease;
        }
        .netflix-scrubber-wrapper:hover .netflix-scrubber-head {
          transform: translateY(-50%) scale(1);
        }

        .netflix-controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.5rem;
        }

        .controls-group-left, .controls-group-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .netflix-ctrl-btn {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: transform 0.15s, opacity 0.15s;
        }
        .netflix-ctrl-btn:hover {
          transform: scale(1.15);
          color: var(--netflix-red);
        }

        .netflix-volume-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
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
        }
      `}</style>
    </div>
  );
});

export default NetflixVideoPlayer;
