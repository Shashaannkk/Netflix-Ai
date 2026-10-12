import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Users, Star, Clock, Calendar, Sparkles, Film, ExternalLink, Share2, Heart, User, Server, Layers, ChevronDown, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchTrailerKey, getImageUrl, fetchMediaCredits, fetchSimilarMedia, fetchSeasonEpisodes, fetchMediaDetails } from '../services/tmdb';
import { MOVIE_SERVERS, getServerStreamUrl, SERVER_8_CANONICAL_SOURCE } from '../services/movieServers';
import { recordInteractionApi } from '../services/api';

export const CinebyModal = ({ media, onClose, onWatchTogether }) => {
  const [currentMedia, setCurrentMedia] = useState(media);
  const [trailerKey, setTrailerKey] = useState(media?.trailer_key || null);
  const [loadingTrailer, setLoadingTrailer] = useState(!media?.trailer_key);
  const [credits, setCredits] = useState({ cast: [], crew: [] });
  const [similarMedia, setSimilarMedia] = useState([]);
  const [activeTab, setActiveTab] = useState('trailer'); // 'trailer' | 'overview' | 'movie'
  const [isFavorited, setIsFavorited] = useState(false);
  
  // Real Playback Resume Tracking State
  const [shouldResume, setShouldResume] = useState(Boolean(media?.startFromResume));
  const [currentPlaybackSecs, setCurrentPlaybackSecs] = useState(null);
  const [currentDurationSecs, setCurrentDurationSecs] = useState(null);
  const lastLoggedTimeRef = useRef(0);
  
  // Multi-server state (Default Server 1 = Vidsrc.pro)
  const [selectedServer, setSelectedServer] = useState(1);
  
  // TV Series Seasons & Episodes State (initialized from media if present)
  const [selectedSeason, setSelectedSeason] = useState(media?.season || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(media?.episode || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Detail fields
  const [runtimeMinutes, setRuntimeMinutes] = useState(media?.runtime || 128);

  const navigate = useNavigate();
  const modalContainerRef = React.useRef(null);

  useEffect(() => {
    if (media) {
      setCurrentMedia(media);
      if (media.season) setSelectedSeason(media.season);
      if (media.episode) setSelectedEpisode(media.episode);
    }
  }, [media]);

  // Real-time viewing progress synchronization with backend and recommendation engine
  const syncViewingProgress = useCallback((cur, dur) => {
    if (!currentMedia || typeof cur !== 'number' || isNaN(cur)) return;
    const watched = Math.max(0, Math.floor(cur));
    const total = Math.max(1, Math.floor(dur || (runtimeMinutes ? runtimeMinutes * 60 : 7200)));
    const isCompleted = watched >= total - 30 || (total > 0 && watched / total >= 0.95);
    const mediaType = currentMedia.media_type || (currentMedia.first_air_date ? 'tv' : 'movie');
    const lang = currentMedia.original_language || 'en';
    const languageName = lang === 'hi' ? 'Hindi' : lang === 'ja' ? 'Japanese' : 'English';
    const extractedGenres = (currentMedia.genres || []).map((g) => g.name || g);

    recordInteractionApi({
      titleId: String(currentMedia.tmdbId || currentMedia.id),
      title: currentMedia.title || currentMedia.name || 'Streamed Content',
      poster: getImageUrl(currentMedia.poster_path),
      backdropUrl: getImageUrl(currentMedia.backdrop_path || currentMedia.poster_path, true),
      watchedSeconds: watched,
      durationSeconds: total,
      season: selectedSeason,
      episode: selectedEpisode,
      completed: isCompleted,
      genreAffinity: extractedGenres.length ? extractedGenres : ['Movie'],
      mediaType,
      language: languageName,
      tags: [
        mediaType === 'tv' ? 'Series' : 'Movie',
        lang === 'ja' ? 'Anime' : lang === 'hi' ? 'Bollywood' : 'Hollywood',
        ...extractedGenres,
      ],
    }).catch((err) => console.warn('[CinebyModal] Interaction save note:', err.message));
  }, [currentMedia, runtimeMinutes, selectedSeason, selectedEpisode]);

  // Flush viewing progress when modal unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.currentTime > 0) {
        syncViewingProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    };
  }, [syncViewingProgress]);

  useEffect(() => {
    if (!currentMedia) return;

    let isMounted = true;
    const mediaType = currentMedia.media_type || (currentMedia.first_air_date ? 'tv' : 'movie');

    const loadData = async () => {
      // 1. Fetch Detailed Info (runtime, resolved TMDB ID, etc)
      const fullDetails = await fetchMediaDetails(currentMedia, mediaType);
      if (isMounted && fullDetails) {
        setCurrentMedia((prev) => ({ ...prev, ...fullDetails }));
        if (fullDetails.runtime) setRuntimeMinutes(fullDetails.runtime);
      }

      const activeMedia = fullDetails || currentMedia;

      // 2. Fetch Trailer
      if (!activeMedia.trailer_key) {
        setLoadingTrailer(true);
        const key = await fetchTrailerKey(activeMedia, mediaType);
        if (isMounted) {
          setTrailerKey(key);
          setLoadingTrailer(false);
        }
      } else {
        setTrailerKey(activeMedia.trailer_key);
        setLoadingTrailer(false);
      }

      // 3. Fetch Cast & Crew credits
      const creditsData = await fetchMediaCredits(activeMedia.tmdbId || activeMedia.id, mediaType);
      if (isMounted && creditsData) {
        setCredits(creditsData);
      }

      // 4. Fetch Similar Content ("More Like This")
      const similar = await fetchSimilarMedia(activeMedia.tmdbId || activeMedia.id, mediaType);
      if (isMounted) {
        setSimilarMedia(similar || []);
      }

      // 5. If TV Series, load episodes for season
      if (mediaType === 'tv' || activeMedia.first_air_date) {
        setLoadingEpisodes(true);
        const epList = await fetchSeasonEpisodes(activeMedia.tmdbId || activeMedia.id, selectedSeason);
        if (isMounted) {
          setEpisodes(epList);
          setLoadingEpisodes(false);
        }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [currentMedia?.id, currentMedia?.tmdbId, currentMedia?.title]);

  // Load episodes when season changes
  useEffect(() => {
    if (!currentMedia || (currentMedia.media_type !== 'tv' && !currentMedia.first_air_date)) return;
    let isMounted = true;
    const loadSeason = async () => {
      setLoadingEpisodes(true);
      const epList = await fetchSeasonEpisodes(currentMedia.tmdbId || currentMedia.id, selectedSeason);
      if (isMounted) {
        setEpisodes(epList);
        setSelectedEpisode(1);
        setLoadingEpisodes(false);
      }
    };
    loadSeason();
    return () => { isMounted = false; };
  }, [selectedSeason]);

  if (!currentMedia) return null;

  const targetMedia = currentMedia;
  const title = targetMedia.title || targetMedia.name || 'Untitled';
  const releaseYear = (targetMedia.release_date || targetMedia.first_air_date || '').substring(0, 4) || '2026';
  const rating = targetMedia.vote_average ? targetMedia.vote_average.toFixed(1) : '8.5';
  const backdropUrl = getImageUrl(targetMedia.backdrop_path || targetMedia.poster_path, true);
  const posterUrl = getImageUrl(targetMedia.poster_path);
  const isTv = targetMedia.media_type === 'tv' || Boolean(targetMedia.first_air_date);

  const getStoredResumeSecs = () => {
    try {
      const local = localStorage.getItem(`netflix_ai_resume_${targetMedia.tmdbId || targetMedia.id}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (typeof parsed.watchedSeconds === 'number' && !parsed.completed) {
          return parsed.watchedSeconds;
        }
      }
    } catch {}
    return targetMedia.resumeTime || targetMedia.watchedSeconds || 0;
  };

  const resumeSecs = getStoredResumeSecs();
  const activePositionSecs = currentPlaybackSecs !== null ? currentPlaybackSecs : resumeSecs;
  const totalDurationSecs = currentDurationSecs || targetMedia.durationSeconds || (runtimeMinutes ? runtimeMinutes * 60 : 7200);
  const remainingSecs = Math.max(0, totalDurationSecs - activePositionSecs);
  const remainingMins = Math.ceil(remainingSecs / 60);

  const formatTimestamp = (totalSec) => {
    if (typeof totalSec !== 'number' || isNaN(totalSec)) return '0:00';
    const sec = Math.floor(totalSec % 60);
    const min = Math.floor((totalSec / 60) % 60);
    const hr = Math.floor(totalSec / 3600);
    if (hr > 0) {
      return `${hr}:${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const formattedRuntime = isTv 
    ? (episodes && episodes.length ? `${episodes.length} Episodes` : 'TV Series')
    : `${Math.floor((runtimeMinutes || 120) / 60)}h ${(runtimeMinutes || 120) % 60}m`;
  const videoRef = React.useRef(null);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || totalDurationSecs;
      setCurrentDurationSecs(dur);
      if (shouldResume && resumeSecs > 0 && resumeSecs < dur - 10) {
        videoRef.current.currentTime = resumeSecs;
      } else {
        videoRef.current.currentTime = 0;
      }
    }
  };

  const handleTimeUpdate = (e) => {
    const cur = e.target.currentTime;
    const dur = e.target.duration || totalDurationSecs;
    setCurrentPlaybackSecs(cur);
    if (dur && !isNaN(dur)) setCurrentDurationSecs(dur);

    try {
      localStorage.setItem(`netflix_ai_resume_${targetMedia.tmdbId || targetMedia.id}`, JSON.stringify({
        watchedSeconds: Math.floor(cur),
        durationSeconds: Math.floor(dur),
        completed: cur >= dur - 30,
        timestamp: Date.now()
      }));
    } catch {}

    if (Math.abs(cur - lastLoggedTimeRef.current) >= 10) {
      lastLoggedTimeRef.current = cur;
      syncViewingProgress(cur, dur);
    }
  };

  const handleStartWatchSpace = () => {
    if (onWatchTogether) {
      onWatchTogether(targetMedia);
    } else {
      const tmdbIdVal = targetMedia.tmdbId || targetMedia.id;
      navigate(
        `/create-space?titleId=${tmdbIdVal}&title=${encodeURIComponent(title)}&trailerKey=${trailerKey || 'YoHD9XEInc0'}`
      );
    }
  };

  const rawIdVal = targetMedia.tmdbId || targetMedia.id;
  const tmdbNumericId = typeof rawIdVal === 'number' ? rawIdVal : (!isNaN(Number(rawIdVal)) ? Number(rawIdVal) : 550);

  return (
    <div className="cb-modal-overlay" onClick={onClose}>
      <div ref={modalContainerRef} className="cb-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="cb-modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={22} />
        </button>

        {/* Hero Media Header */}
        <div className="cb-modal-hero" style={{ backgroundImage: `url(${backdropUrl})` }}>
          <div className="cb-modal-hero-gradient" />

          {/* Video or Poster Stage */}
          <div className="cb-modal-media-stage">
            {activeTab === 'movie' ? (
              <div className="cb-modal-iframe-wrapper">
                {selectedServer === 8 || selectedServer === 9 ? (
                  <video
                    ref={videoRef}
                    src={SERVER_8_CANONICAL_SOURCE}
                    controls
                    autoPlay
                    onLoadedMetadata={handleVideoLoaded}
                    onTimeUpdate={handleTimeUpdate}
                    onPause={(e) => syncViewingProgress(e.target.currentTime, e.target.duration)}
                    onEnded={(e) => syncViewingProgress(e.target.duration, e.target.duration)}
                    className="cb-modal-iframe"
                    poster={backdropUrl}
                  />
                ) : (
                  <iframe
                    src={`${getServerStreamUrl({ tmdbId: tmdbNumericId, isTv, season: selectedSeason, episode: selectedEpisode, serverNum: selectedServer })}${shouldResume && resumeSecs > 0 ? `#t=${resumeSecs}` : ''}`}
                    title={`${title} Stream - Server ${selectedServer}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="origin-when-cross-origin"
                    className="cb-modal-iframe"
                  />
                )}
              </div>
            ) : activeTab === 'trailer' && trailerKey ? (
              <div className="cb-modal-iframe-wrapper">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey.substring(0, 11)}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                  title={`${title} Official Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="origin-when-cross-origin"
                  className="cb-modal-iframe"
                />
              </div>
            ) : (
              <div className="cb-modal-hero-info">
                <div className="cb-modal-badge-group">
                  <span className="cb-badge cb-badge-hd">HD 1080p</span>
                  <span className="cb-badge cb-badge-imdb" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={12} fill="#e50914" color="#e50914" /> IMDb {rating}
                  </span>
                  <span className="cb-badge cb-badge-year">{releaseYear}</span>
                  <span className="cb-badge cb-badge-type">{isTv ? 'Series' : 'Movie'}</span>
                  <span className="cb-badge cb-badge-runtime" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    <Clock size={11} style={{ marginRight: '3px' }} /> {formattedRuntime}
                  </span>
                </div>
                <h1 className="cb-modal-title">{title}</h1>
              </div>
            )}
          </div>
        </div>

        {/* Modal Main Content & Actions */}
        <div className="cb-modal-body">
          {/* Resume Progress Bar if previously watched */}
          {resumeSecs > 0 && !targetMedia.completed && (
            <div style={{ background: '#1c1c1c', border: '1px solid rgba(229,9,20,0.35)', padding: '0.85rem 1.1rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.86rem', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--netflix-red)" />
                <span>{isTv ? `Resume S${selectedSeason} E${selectedEpisode}` : 'Where you left off'}:</span>
                <span style={{ color: '#FBBF24', fontWeight: 800 }}>{formatTimestamp(activePositionSecs)}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#ff4d4d', fontWeight: 800, background: 'rgba(229,9,20,0.15)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                -{formatTimestamp(remainingSecs)} ({remainingMins} min left)
              </div>
            </div>
          )}

          <div className="cb-modal-actions-bar" style={{ flexWrap: 'wrap' }}>
            <button className="cb-btn cb-btn-watch-space" onClick={handleStartWatchSpace}>
              <Users size={18} />
              <span>Watch Together (AI Space)</span>
            </button>

            {resumeSecs > 0 && !targetMedia.completed ? (
              <>
                <button
                  className="cb-btn cb-btn-play"
                  onClick={() => {
                    setShouldResume(true);
                    setActiveTab('movie');
                    if (videoRef.current) {
                      videoRef.current.currentTime = resumeSecs;
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  title={`Start from ${formatTimestamp(resumeSecs)}`}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Resume at {formatTimestamp(resumeSecs)} (-{remainingMins}m left)</span>
                </button>

                <button
                  className="cb-btn cb-btn-secondary"
                  onClick={() => {
                    setShouldResume(false);
                    setActiveTab('movie');
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  title="Start playback from the very beginning"
                >
                  <RotateCcw size={15} />
                  <span>Start from Beginning (0:00)</span>
                </button>
              </>
            ) : (
              <button
                className={`cb-btn ${activeTab === 'movie' ? 'cb-btn-play' : 'cb-btn-secondary'}`}
                onClick={() => {
                  setShouldResume(false);
                  setActiveTab('movie');
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().catch(() => {});
                  }
                }}
              >
                <Film size={16} />
                <span>Play Full {isTv ? 'Series' : 'Movie'}</span>
              </button>
            )}

            <button
              className={`cb-btn cb-btn-secondary ${activeTab === 'trailer' ? 'active' : ''}`}
              onClick={() => setActiveTab('trailer')}
            >
              <Play size={16} fill="currentColor" />
              <span>Play Trailer</span>
            </button>

            <button
              className={`cb-btn cb-btn-icon ${isFavorited ? 'favorited' : ''}`}
              onClick={() => setIsFavorited(!isFavorited)}
              title={isFavorited ? 'Remove from My List' : 'Add to My List'}
            >
              <Heart size={18} fill={isFavorited ? '#EF4444' : 'none'} color={isFavorited ? '#EF4444' : '#fff'} />
            </button>
          </div>

          {/* 8 Server Selector Bar (when activeTab === 'movie') */}
          {activeTab === 'movie' && (
            <div style={{ marginTop: '1rem', background: '#1a1a1a', border: '1px solid rgba(229,9,20,0.3)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem', color: '#e50914', fontWeight: 800, fontSize: '0.85rem' }}>
                <Server size={16} /> SELECT STREAMING SERVER SOURCE (8 HD MIRRORS):
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {MOVIE_SERVERS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedServer(s.id)}
                    style={{
                      background: selectedServer === s.id ? 'var(--netflix-red)' : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      border: selectedServer === s.id ? '1px solid #ff3b30' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: selectedServer === s.id ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TV Seasons & Episode Picker */}
          {isTv && (
            <div style={{ marginTop: '1.25rem', background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                  <Layers size={18} color="var(--netflix-red)" />
                  <span>Seasons & Episodes</span>
                </div>

                {/* Season Dropdown */}
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  style={{
                    background: '#222',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((sNum) => (
                    <option key={sNum} value={sNum}>Season {sNum}</option>
                  ))}
                </select>
              </div>

              {/* Episode Grid / List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                {episodes.map((ep) => (
                  <div
                    key={ep.id}
                    onClick={() => {
                      setSelectedEpisode(ep.episode_number);
                      setActiveTab('movie');
                    }}
                    style={{
                      background: selectedEpisode === ep.episode_number ? 'rgba(229,9,20,0.18)' : '#222',
                      border: selectedEpisode === ep.episode_number ? '1px solid var(--netflix-red)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: selectedEpisode === ep.episode_number ? '#e50914' : '#fff' }}>
                        E{ep.episode_number} • {ep.name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{ep.runtime}m</span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#888', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ep.overview}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cb-modal-details-grid">
            <div className="cb-modal-left">
              <h3 className="cb-section-title">Synopsis</h3>
              <p className="cb-modal-overview">
                {media.overview || 'Stream this title online on Netflix AI. Experience synchronized playback, real-time AI context, live audio chat, and narrative variations.'}
              </p>

              {/* Cast & Actors Section */}
              {credits.cast && credits.cast.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h3 className="cb-section-title" style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    Top Cast & Actors
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {credits.cast.slice(0, 6).map((actor, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '16px',
                          padding: '0.3rem 0.75rem',
                          fontSize: '0.8rem',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <User size={12} color="var(--netflix-red)" />
                        <strong>{actor.name}</strong>
                        {actor.character && <span style={{ color: '#aaa' }}>as {actor.character}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Director & Crew */}
              {credits.crew && credits.crew.length > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
                  <strong>Director:</strong> <span style={{ color: '#fff' }}>{credits.crew.join(', ')}</span>
                </div>
              )}

              {/* ── MORE LIKE THIS (RECOMMENDED TITLES GRID) ── */}
              {similarMedia && similarMedia.length > 0 && (
                <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 className="cb-section-title" style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="var(--netflix-red)" /> More Like This
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.85rem' }}>
                    {similarMedia.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (modalContainerRef.current) {
                            modalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                          setCurrentMedia(item);
                          setActiveTab('trailer');
                        }}
                        style={{
                          background: '#1a1a1a',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, border-color 0.2s'
                        }}
                        className="cb-similar-card"
                      >
                        <div style={{ aspectRatio: '2/3', position: 'relative', overflow: 'hidden' }}>
                          <img
                            src={getImageUrl(item.poster_path)}
                            alt={item.title || item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', padding: '2px 5px', borderRadius: '4px', fontSize: '0.65rem', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={10} fill="#f59e0b" /> {item.vote_average ? item.vote_average.toFixed(1) : '8.1'}
                          </div>
                        </div>
                        <div style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title || item.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="cb-modal-right">
              <div className="cb-poster-preview-card">
                <img src={posterUrl} alt={title} className="cb-poster-img" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinebyModal;
