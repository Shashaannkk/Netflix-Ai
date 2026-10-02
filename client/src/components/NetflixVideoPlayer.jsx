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
} from 'lucide-react';

import NetflixIntroScreen from './NetflixIntroScreen';
import HTML5PlayerAdapter from '../services/adapters/HTML5PlayerAdapter';

import {
  isEmbedProviderUrl,
  isYouTubeUrl,
  getYouTubeVideoId,
  classifySource,
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  const [currentSource, setCurrentSource] = useState(
    src || 'https://vidsrc.pro/embed/movie/550'
  );

  /*
   * This state is used only for cross-origin iframe providers.
   *
   * We cannot call play(), pause() or currentTime directly inside a
   * third-party iframe because of browser same-origin restrictions.
   *
   * For the PLAY command, we reload the same provider URL with
   * autoplay=1. This keeps the provider unchanged.
   */
  const [embedPlaybackRequested, setEmbedPlaybackRequested] = useState(false);

  const isEmbed = isEmbedProviderUrl(currentSource);

  /*
   * Build the iframe source.
   *
   * IMPORTANT:
   * - Never convert a generic "/embed/" URL into YouTube.
   * - Never replace a provider URL with a demo MP4.
   * - Preserve the original provider/domain.
   * - Only add autoplay=1 when Watch Together requests PLAY.
   */
  const buildEmbedSource = useCallback((source, autoplay = false) => {
    if (!source) return source;

    /*
     * YouTube is handled separately because it has its own iframe API
     * parameters.
     */
    if (isYouTubeUrl(source)) {
      const id = getYouTubeVideoId(source);

      if (!id) {
        return source;
      }

      const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        enablejsapi: '1',
        origin:
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://netflix-aipro.vercel.app',
        rel: '0',
        modestbranding: '1',
      });

      return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }

    /*
     * For every other iframe provider:
     * preserve the exact provider URL.
     */
    if (!autoplay) {
      return source;
    }

    try {
      const url = new URL(source);
      url.searchParams.set('autoplay', '1');
      return url.toString();
    } catch {
      const separator = source.includes('?') ? '&' : '?';
      return `${source}${separator}autoplay=1`;
    }
  }, []);

  /*
   * Determine whether the active player is ready.
   *
   * HTML5:
   * requires actual media metadata.
   *
   * iframe:
   * only requires that the iframe exists because we cannot inspect
   * the third-party video's internal readyState.
   */
  const isMediaReady = useCallback(() => {
    if (isEmbed) {
      return Boolean(iframeRef.current);
    }

    const video = videoRef.current;

    if (!video) {
      return false;
    }

    return (
      video.readyState >= 1 &&
      Number.isFinite(video.duration) &&
      video.duration > 0
    );
  }, [isEmbed]);

  /*
   * Get the HTML5 adapter.
   *
   * For iframe providers this intentionally returns null.
   */
  const getAdapter = useCallback(() => {
    if (adapterRef.current) {
      return adapterRef.current;
    }

    if (!videoRef.current || isEmbed) {
      return null;
    }

    adapterRef.current = new HTML5PlayerAdapter(videoRef.current);

    return adapterRef.current;
  }, [isEmbed]);

  /*
   * Expose the HTML5 player interface to WatchSpace.
   *
   * For iframe providers these methods naturally return undefined because
   * the browser does not expose the provider's internal video element.
   */
  React.useImperativeHandle(
    forwardedRef,
    () => ({
      play: () => getAdapter()?.play(),

      pause: () => getAdapter()?.pause(),

      seek: (pos) => getAdapter()?.seek(pos),

      getCurrentTime: () =>
        getAdapter()?.getCurrentTime() ??
        (videoRef.current?.currentTime || 0),

      getDuration: () =>
        getAdapter()?.getDuration() ??
        (videoRef.current?.duration || 0),

      getState: () =>
        getAdapter()?.getState() ??
        (videoRef.current?.paused ? 'paused' : 'playing'),

      setPlaybackRate: (rate) =>
        getAdapter()?.setPlaybackRate(rate),

      setVolume: (vol) =>
        getAdapter()?.setVolume(vol),

      setMuted: (muted) =>
        getAdapter()?.setMuted(muted),

      isReady: () => isMediaReady(),

      get videoElement() {
        return videoRef.current;
      },
    }),
    [getAdapter, isMediaReady]
  );

  /*
   * Controls auto-hide.
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
   * Seek ripple animation.
   */
  const triggerRipple = useCallback((side, text) => {
    setSeekRipple({
      side,
      text,
    });

    setTimeout(() => {
      setSeekRipple(null);
    }, 800);
  }, []);

  /*
   * Notify WatchSpace/backend about host playback actions.
   */
  const notifyPlayback = useCallback(
    (action, positionSeconds, playing) => {
      if (
        !isHost ||
        isApplyingRemoteUpdateRef.current ||
        !onPlaybackChange
      ) {
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

  /*
   * Keep refs synced with props for async video lifecycle events.
   */
  useEffect(() => {
    syncTimeRef.current = syncTime;
    syncIsPlayingRef.current = syncIsPlaying;
  }, [syncTime, syncIsPlaying]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  /*
   * Update source when parent changes it.
   */
  useEffect(() => {
    if (!src || src === srcRef.current) {
      return;
    }

    srcRef.current = src;

    setCurrentSource(src);
    setMediaState('LOADING');

    setMediaError({
      code: null,
      message: null,
    });

    setShowIntro(true);
    setEmbedPlaybackRequested(false);
    hasAppliedInitialSyncRef.current = false;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  /*
   * Apply initial sync snapshot for non-host participants when media becomes ready.
   */
  const applyInitialParticipantSync = useCallback(() => {
    if (isEmbed || isHostRef.current || hasAppliedInitialSyncRef.current) {
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
  }, [isEmbed, isMediaReady, getAdapter]);

  /*
   * Initialize HTML5 adapter only for native video sources.
   */
  useEffect(() => {
    if (isEmbed) {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }

      return undefined;
    }

    if (!videoRef.current) {
      return undefined;
    }

    if (adapterRef.current) {
      adapterRef.current.destroy();
    }

    adapterRef.current = new HTML5PlayerAdapter(videoRef.current);

    try {
      videoRef.current.load();
    } catch (err) {
      console.warn(
        '[NetflixVideoPlayer] video.load():',
        err
      );
    }

    return () => {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
  }, [currentSource, isEmbed]);

  /*
   * Controls timer.
   */
  useEffect(() => {
    resetControlsTimer();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimer]);

  /*
   * AUTHORITATIVE WATCH TOGETHER SYNC
   *
   * HTML5:
   * - drift correction
   * - play/pause
   *
   * iframe:
   * - PLAY request becomes autoplay=1
   *
   * Generic third-party iframe pause/seek cannot be performed by React
   * without a provider-specific API.
   */
  useEffect(() => {
    if (
      typeof syncTime !== 'number' ||
      Number.isNaN(syncTime)
    ) {
      return;
    }

    /*
     * Cross-origin iframe.
     *
     * If server says PLAY, reload the same provider URL with autoplay=1.
     */
    if (isEmbed) {
      if (syncIsPlaying) {
        setEmbedPlaybackRequested(true);
        setMediaState('READY');
      }

      return;
    }

    /*
     * Native HTML5 source.
     */
    if (!isMediaReady()) {
      return;
    }

    const adapter = getAdapter();

    if (!adapter) {
      return;
    }

    isApplyingRemoteUpdateRef.current = true;

    /*
     * Non-host initial readiness sync catchup.
     */
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

      /*
       * Hard correction above threshold (1.2s when playing, 0.25s when paused).
       */
      if (drift > hardCorrectionThreshold) {
        adapter.seek(syncTime);
        setCurrentTime(syncTime);
      }

      /*
       * Authoritative play state.
       */
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
    isEmbed,
    isMediaReady,
    getAdapter,
    isPlaying,
    isHost,
  ]);

  /*
   * Netflix intro completion.
   */
  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);

    /*
     * iframe:
     * the sync effect / host play handler controls autoplay.
     */
    if (isEmbed) {
      if (
        (syncIsPlaying ?? isPlaying) &&
        isHost
      ) {
        setEmbedPlaybackRequested(true);
        setMediaState('READY');
      }

      return;
    }

    /*
     * HTML5:
     * start playback if authoritative state says playing.
     */
    if (isMediaReady()) {
      if (isHost) {
        if (syncIsPlaying ?? isPlaying) {
          videoRef.current
            ?.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn(
                '[NetflixVideoPlayer] Autoplay prevented:',
                err?.message
              );
            });
        }
      } else {
        applyInitialParticipantSync();
      }
    }
  }, [
    isEmbed,
    syncIsPlaying,
    isPlaying,
    isHost,
    isMediaReady,
    applyInitialParticipantSync,
  ]);

  /*
   * PLAY / PAUSE
   */
  const togglePlay = useCallback(() => {
    if (!isHost) {
      return;
    }

    /*
     * Cross-origin provider.
     *
     * PLAY:
     * reload same URL with autoplay=1.
     *
     * PAUSE:
     * update local/watch-party state only.
     * Generic iframe pause is impossible without provider API.
     */
    if (isEmbed) {
      const next = !isPlaying;

      if (next) {
        setEmbedPlaybackRequested(true);
        setMediaState('READY');
      }

      setIsPlaying(next);

      notifyPlayback(
        next ? 'play' : 'pause',
        currentTime,
        next
      );

      return;
    }

    /*
     * HTML5 source.
     */
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
    isEmbed,
    isPlaying,
    currentTime,
    notifyPlayback,
    isMediaReady,
    getAdapter,
  ]);

  /*
   * SEEK ±10 seconds.
   *
   * Only native HTML5 sources can be controlled directly.
   */
  const seekBy = useCallback(
    (seconds) => {
      if (
        !isHost ||
        isEmbed ||
        !isMediaReady()
      ) {
        return;
      }

      const adapter = getAdapter();

      if (!adapter) {
        return;
      }

      const max =
        duration ||
        adapter.getDuration() ||
        0;

      const next = Math.max(
        0,
        Math.min(
          max,
          adapter.getCurrentTime() + seconds
        )
      );

      adapter.seek(next);

      setCurrentTime(next);

      notifyPlayback(
        'seek',
        next,
        isPlaying
      );
    },
    [
      isHost,
      isEmbed,
      isMediaReady,
      getAdapter,
      duration,
      notifyPlayback,
      isPlaying,
    ]
  );

  /*
   * Mouse / touch handling.
   */
  const handleMouseDown = useCallback(
    (e) => {
      resetControlsTimer();

      if (!isHost) {
        return;
      }

      const now = Date.now();

      const rect =
        e.currentTarget.getBoundingClientRect();

      const x =
        e.clientX - rect.left;

      const width = rect.width;

      /*
       * Double tap.
       */
      if (
        now - lastTapRef.current.time <
        300
      ) {
        if (x < width * 0.35) {
          seekBy(-10);
          triggerRipple(
            'left',
            '-10s ⏪'
          );
        } else if (
          x > width * 0.65
        ) {
          seekBy(10);
          triggerRipple(
            'right',
            '⏩ +10s'
          );
        } else {
          togglePlay();
        }

        lastTapRef.current.time = 0;

        return;
      }

      lastTapRef.current = {
        time: now,
        x,
      };

      /*
       * Hold for 2x speed.
       *
       * Only available for native HTML5 media.
       */
      if (holdTimerRef.current) {
        clearTimeout(
          holdTimerRef.current
        );
      }

      holdTimerRef.current =
        setTimeout(() => {
          if (
            !isEmbed &&
            isMediaReady()
          ) {
            getAdapter()?.setPlaybackRate(2);
            setSpeedBoost(true);
          }
        }, 350);
    },
    [
      resetControlsTimer,
      isHost,
      seekBy,
      triggerRipple,
      togglePlay,
      isEmbed,
      isMediaReady,
      getAdapter,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(
        holdTimerRef.current
      );
    }

    if (speedBoost) {
      getAdapter()?.setPlaybackRate(1);
      setSpeedBoost(false);
    }
  }, [
    speedBoost,
    getAdapter,
  ]);

  /*
   * Scrubber.
   */
  const handleScrubberClick =
    useCallback(
      (e) => {
        if (
          !isHost ||
          isEmbed ||
          !isMediaReady()
        ) {
          return;
        }

        const adapter = getAdapter();

        if (!adapter) {
          return;
        }

        const dur =
          duration ||
          adapter.getDuration() ||
          0;

        if (!dur) {
          return;
        }

        const rect =
          e.currentTarget.getBoundingClientRect();

        const pct = Math.max(
          0,
          Math.min(
            1,
            (e.clientX - rect.left) /
            rect.width
          )
        );

        const next = pct * dur;

        adapter.seek(next);

        setCurrentTime(next);

        notifyPlayback(
          'seek',
          next,
          isPlaying
        );
      },
      [
        isHost,
        isEmbed,
        isMediaReady,
        getAdapter,
        duration,
        notifyPlayback,
        isPlaying,
      ]
    );

  /*
   * Volume.
   */
  const handleVolumeChange =
    useCallback(
      (e) => {
        const val =
          Number(e.target.value);

        setVolume(val);
        setIsMuted(val === 0);

        getAdapter()?.setVolume(val);
      },
      [getAdapter]
    );

  const toggleMute = useCallback(
    () => {
      const next = !isMuted;

      getAdapter()?.setMuted(next);

      setIsMuted(next);
    },
    [getAdapter, isMuted]
  );

  /*
   * Fullscreen.
   */
  const toggleFullscreen =
    useCallback(() => {
      const container =
        videoRef.current
          ?.parentElement ||
        iframeRef.current
          ?.parentElement;

      if (!container) {
        return;
      }

      if (!document.fullscreenElement) {
        container.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }, []);

  /*
   * Retry.
   */
  const handleRetryStream =
    useCallback(() => {
      setMediaState('LOADING');

      setMediaError({
        code: null,
        message: null,
      });

      if (isEmbed) {
        /*
         * Recreate iframe using the same source.
         */
        setEmbedPlaybackRequested(false);

        requestAnimationFrame(() => {
          setEmbedPlaybackRequested(true);
        });
      } else {
        videoRef.current?.load();
      }
    }, [isEmbed]);

  /*
   * Time formatting.
   */
  const formatTime = (sec) => {
    if (
      !Number.isFinite(sec) ||
      sec <= 0
    ) {
      return '0:00';
    }

    const h = Math.floor(
      sec / 3600
    );

    const m = Math.floor(
      (sec % 3600) / 60
    );

    const s = Math.floor(
      sec % 60
    );

    if (h > 0) {
      return (
        `${h}:${String(m).padStart(
          2,
          '0'
        )}:${String(s).padStart(
          2,
          '0'
        )}`
      );
    }

    return (
      `${m}:${String(s).padStart(
        2,
        '0'
      )}`
    );
  };

  const progressPct = duration
    ? Math.min(
      100,
      (currentTime / duration) * 100
    )
    : 0;

  const sourceInvalid =
    classifySource(currentSource) ===
    'INVALID';

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
      {showIntro && (
        <NetflixIntroScreen
          title="NETFLIX AI"
          onComplete={
            handleIntroComplete
          }
        />
      )}

      {speedBoost && (
        <div className="netflix-speed-badge">
          <FastForward size={16} />
          <span>2X SPEED</span>
        </div>
      )}

      {seekRipple && (
        <div
          className={`netflix-seek-ripple ${seekRipple.side}`}
        >
          <div className="ripple-circle" />
          <span>
            {seekRipple.text}
          </span>
        </div>
      )}

      {sourceInvalid ||
        mediaState === 'ERROR' ? (
        <div className="netflix-player-error-card">
          <AlertTriangle
            size={48}
            color="#e50914"
          />

          <h3>
            Playback Source Unavailable
          </h3>

          <p>
            {mediaError.message ||
              'The selected streaming provider or movie identifier is currently unavailable.'}
          </p>

          <div className="netflix-source-label">
            {title} •{' '}
            {currentSource ||
              'Invalid URL'}
          </div>

          <button
            onClick={
              handleRetryStream
            }
            className="netflix-error-btn"
          >
            <RefreshCw size={16} />
            Retry Stream
          </button>
        </div>
      ) : isEmbed ? (
        /*
         * CROSS-ORIGIN PROVIDER
         *
         * The original provider URL is kept.
         *
         * When Watch Together says PLAY,
         * embedPlaybackRequested becomes true
         * and autoplay=1 is added.
         */
        <iframe
          key={`${currentSource}|${embedPlaybackRequested
              ? 'play'
              : 'idle'
            }`}
          ref={iframeRef}
          src={buildEmbedSource(
            currentSource,
            embedPlaybackRequested
          )}
          title={title}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; clipboard-write"
          allowFullScreen
          referrerPolicy="origin-when-cross-origin"
          onLoad={() => {
            setMediaState('READY');

            if (
              embedPlaybackRequested
            ) {
              console.log(
                '[NetflixVideoPlayer] Embed loaded with autoplay request:',
                currentSource
              );
            }
          }}
          onError={() => {
            setMediaState('ERROR');

            setMediaError({
              code:
                'PROVIDER_ERROR',
              message:
                'The selected movie server embed stream could not be loaded.',
            });
          }}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      ) : (
        /*
         * NATIVE HTML5 PLAYER
         */
        <video
          ref={videoRef}
          src={currentSource}
          poster={poster}
          className="netflix-video-element"
          preload="auto"
          playsInline
          onPlay={() => {
            setIsPlaying(true);
            setMediaState('READY');
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
          onTimeUpdate={() => {
            const cur =
              videoRef.current
                ?.currentTime || 0;

            setCurrentTime(cur);

            onTimeUpdate?.(cur);
          }}
          onLoadedMetadata={() => {
            const dur =
              videoRef.current
                ?.duration;

            if (
              Number.isFinite(dur) &&
              dur > 0
            ) {
              setDuration(dur);

              setMediaState(
                'READY'
              );

              setMediaError({
                code: null,
                message: null,
              });

              applyInitialParticipantSync();
            }
          }}
          onCanPlay={() => {
            if (
              isMediaReady()
            ) {
              setMediaState(
                'READY'
              );

              applyInitialParticipantSync();
            }
          }}
          onError={(e) => {
            const error =
              e.currentTarget?.error;

            const code =
              error?.code ||
              'UNKNOWN';

            const message =
              error?.message ||
              'Media initialization unable to load video metadata from stream source.';

            setMediaState(
              'ERROR'
            );

            setMediaError({
              code: `CODE_${code}`,
              message:
                `Media stream error (Code ${code}): ${message}`,
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

      {mediaState ===
        'LOADING' &&
        !isEmbed &&
        !showIntro && (
          <div className="netflix-player-loader">
            <Loader
              size={48}
              className="spin-icon"
              color="var(--netflix-red)"
            />

            <span>
              Loading Media Metadata…
            </span>
          </div>
        )}

      {mediaState ===
        'ERROR' &&
        !isEmbed && (
          <div className="netflix-player-error-overlay">
            <AlertTriangle
              size={48}
              color="#ef4444"
            />

            <h3>
              Media Initialization
              Failed
            </h3>

            <p>
              Unable to load video
              metadata from stream
              source.

              {mediaError.code && (
                <span className="error-code">
                  {mediaError.code}
                </span>
              )}
            </p>

            <button
              className="btn-netflix-retry"
              onClick={
                handleRetryStream
              }
            >
              <RefreshCw size={16} />
              Retry Stream
            </button>
          </div>
        )}

      {!isEmbed &&
        !hideDefaultControls && (
          <div
            className={`netflix-controls-overlay ${showControls
                ? 'visible'
                : ''
              }`}
          >
            <div className="netflix-controls-top">
              <span className="netflix-player-title">
                {title}
              </span>
            </div>

            <div className="netflix-controls-bottom">
              <div
                className="netflix-scrubber-wrapper"
                onClick={
                  handleScrubberClick
                }
              >
                <div className="netflix-scrubber-track">
                  <div
                    className="netflix-scrubber-fill"
                    style={{
                      width: `${progressPct}%`,
                    }}
                  >
                    <div className="netflix-scrubber-head" />
                  </div>
                </div>
              </div>

              <div className="netflix-controls-row">
                <div className="controls-group-left">
                  <button
                    className="netflix-ctrl-btn"
                    onClick={
                      togglePlay
                    }
                    title={
                      isPlaying
                        ? 'Pause'
                        : 'Play'
                    }
                  >
                    {isPlaying ? (
                      <Pause
                        size={24}
                        fill="currentColor"
                      />
                    ) : (
                      <Play
                        size={24}
                        fill="currentColor"
                      />
                    )}
                  </button>

                  <button
                    className="netflix-ctrl-btn"
                    onClick={() =>
                      seekBy(-10)
                    }
                    title="Rewind 10s"
                  >
                    <RotateCcw
                      size={20}
                    />
                  </button>

                  <button
                    className="netflix-ctrl-btn"
                    onClick={() =>
                      seekBy(10)
                    }
                    title="Forward 10s"
                  >
                    <RotateCw
                      size={20}
                    />
                  </button>

                  <div className="netflix-volume-group">
                    <button
                      className="netflix-ctrl-btn"
                      onClick={
                        toggleMute
                      }
                    >
                      {isMuted ||
                        volume === 0 ? (
                        <VolumeX
                          size={20}
                        />
                      ) : (
                        <Volume2
                          size={20}
                        />
                      )}
                    </button>

                    <input
                      type="range"
                      className="netflix-volume-slider"
                      min="0"
                      max="1"
                      step="0.05"
                      value={
                        isMuted
                          ? 0
                          : volume
                      }
                      onChange={
                        handleVolumeChange
                      }
                    />
                  </div>

                  <span className="netflix-time-label">
                    {formatTime(
                      currentTime
                    )}{' '}
                    /{' '}
                    {formatTime(
                      duration
                    )}
                  </span>
                </div>

                <div className="controls-group-right">
                  <button
                    className="netflix-ctrl-btn"
                    onClick={
                      toggleFullscreen
                    }
                    title={
                      isFullscreen
                        ? 'Exit Fullscreen'
                        : 'Fullscreen'
                    }
                  >
                    {isFullscreen ? (
                      <Minimize
                        size={20}
                      />
                    ) : (
                      <Maximize
                        size={20}
                      />
                    )}
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
          z-index: 60;
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
          background:
            linear-gradient(
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
          padding: 1.5rem;
          z-index: 80;
        }

        .netflix-controls-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .netflix-controls-top {
          display: flex;
          justify-content: flex-start;
        }

        .netflix-player-title {
          color: #fff;
          font-size: 1.25rem;
          font-weight: 800;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }

        .netflix-controls-bottom {
          width: 100%;
        }

        .netflix-scrubber-wrapper {
          width: 100%;
          padding: 8px 0;
          cursor: pointer;
        }

        .netflix-scrubber-track {
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          position: relative;
          transition: height 0.15s;
        }

        .netflix-scrubber-wrapper:hover
        .netflix-scrubber-track {
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
          box-shadow: 0 0 10px rgba(229,9,20,0.8);
          transition: transform 0.15s;
        }

        .netflix-scrubber-wrapper:hover
        .netflix-scrubber-head {
          transform: translateY(-50%) scale(1);
        }

        .netflix-controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.5rem;
        }

        .controls-group-left,
        .controls-group-right {
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
          transition:
            transform 0.15s,
            color 0.15s;
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