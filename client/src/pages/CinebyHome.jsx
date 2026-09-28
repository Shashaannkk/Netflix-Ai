import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Users, ChevronLeft, ChevronRight, Star, Sparkles, Film, Heart, Tv, Flame, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CinebyNavbar from '../components/CinebyNavbar';
import CinebyModal from '../components/CinebyModal';
import CinebySplash from '../components/CinebySplash';
import Footer from '../components/Footer';

import {
  fetchTrendingMovies,
  fetchTrendingTV,
  fetchPopularMovies,
  fetchPopularTV,
  fetchTopRatedMovies,
  fetchUpcomingMovies,
  fetchMediaDetails,
  getImageUrl,
} from '../services/tmdb';

export const CinebyHome = ({ activeCategory = 'browse' }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [heroMedia, setHeroMedia] = useState(null);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hero Video Trailer Preview State
  const [heroTrailerPlaying, setHeroTrailerPlaying] = useState(false);
  const [isHeroMuted, setIsHeroMuted] = useState(true);
  const heroTimerRef = useRef(null);

  // Selected media modal state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Scroll refs for movie rows
  const rowRefs = useRef({});

  const startHeroTrailer = (unmute = false) => {
    if (unmute) {
      setIsHeroMuted(false);
    }
    setHeroTrailerPlaying(true);
    if (heroTimerRef.current) {
      clearTimeout(heroTimerRef.current);
    }
    // Fade poster back in after 90 seconds
    heroTimerRef.current = setTimeout(() => {
      setHeroTrailerPlaying(false);
    }, 90000);
  };

  useEffect(() => {
    let isMounted = true;

    const loadAllContent = async () => {
      try {
        setLoading(true);
        const [
          trendingM,
          trendingT,
          popularM,
          popularT,
          topRatedM,
          upcomingM,
        ] = await Promise.all([
          fetchTrendingMovies(),
          fetchTrendingTV(),
          fetchPopularMovies(),
          fetchPopularTV(),
          fetchTopRatedMovies(),
          fetchUpcomingMovies(),
        ]);

        if (!isMounted) return;

        setTrendingMovies(trendingM || []);
        setTrendingTV(trendingT || []);
        setPopularMovies(popularM || []);
        setPopularTV(popularT || []);
        setTopRatedMovies(topRatedM || []);
        setUpcomingMovies(upcomingM || []);

        // Pick a random hero title from category
        const pool = activeCategory === 'series'
          ? (trendingT?.length ? trendingT : popularT)
          : (trendingM?.length ? trendingM : popularM);

        if (pool && pool.length > 0) {
          const randomHero = pool[Math.floor(Math.random() * Math.min(pool.length, 5))];
          const type = activeCategory === 'series' ? 'tv' : 'movie';
          const fullDetails = await fetchMediaDetails(randomHero.id, type);
          setHeroMedia(fullDetails || randomHero);
        }
      } catch (err) {
        console.error('[Netflix AI] Failed to load catalog:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllContent();

    return () => {
      isMounted = false;
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    };
  }, [activeCategory]);

  // Auto-play trailer preview after heroMedia finishes loading
  useEffect(() => {
    if (heroMedia) {
      const autoPlayTimer = setTimeout(() => {
        startHeroTrailer(false);
      }, 1200);
      return () => clearTimeout(autoPlayTimer);
    }
  }, [heroMedia]);

  // Check URL query parameters for mediaId to auto-open modal
  useEffect(() => {
    const mediaId = searchParams.get('mediaId');
    const type = searchParams.get('type') || 'movie';

    if (mediaId) {
      fetchMediaDetails(mediaId, type).then((item) => {
        if (item) setSelectedMedia(item);
      });
    }
  }, [searchParams]);

  const handleScrollRow = (rowKey, direction) => {
    const container = rowRefs.current[rowKey];
    if (!container) return;
    const scrollAmount = direction === 'left' ? -container.clientWidth * 0.75 : container.clientWidth * 0.75;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleOpenWatchSpace = (item) => {
    const titleName = item.title || item.name || 'Netflix AI Title';
    const trailer = item.trailer_key || 'YoHD9XEInc0';
    const backdrop = getImageUrl(item.backdrop_path || item.poster_path, true);
    const poster = getImageUrl(item.poster_path);

    navigate(
      `/create-space?titleId=${item.id}&title=${encodeURIComponent(titleName)}&trailerKey=${trailer}&backdrop=${encodeURIComponent(backdrop)}&poster=${encodeURIComponent(poster)}`
    );
  };

  const showMovies = activeCategory === 'browse' || activeCategory === 'movies';
  const showSeries = activeCategory === 'browse' || activeCategory === 'series';
  const showTopImdb = activeCategory === 'browse' || activeCategory === 'top-imdb';

  const activeTrailerKey = heroMedia?.trailer_key || 'YoHD9XEInc0';

  return (
    <div className="cb-page-root">
      {/* 1. Splash Screen Loader */}
      {showSplash && <CinebySplash onFinish={() => setShowSplash(false)} />}

      {/* 2. Top Navigation Bar */}
      <CinebyNavbar onSelectMedia={(item) => setSelectedMedia(item)} />

      {/* 3. Hero Billboard Banner (With Netflix Poster Fade & Auto-Trailer) */}
      <section
        className="cb-hero-banner"
        onMouseEnter={() => !heroTrailerPlaying && startHeroTrailer(false)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#0d0d0d',
        }}
      >
        {/* Backdrop Poster Image Layer (Fades out when trailer plays) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: heroMedia
              ? `url(${getImageUrl(heroMedia.backdrop_path || heroMedia.poster_path, true)})`
              : 'url(https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            opacity: heroTrailerPlaying ? 0 : 1,
            transition: 'opacity 0.8s ease-in-out',
            zIndex: 1,
          }}
        />

        {/* Background YouTube Trailer Video Player (Fades in when playing, fades out when finished) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            zIndex: 2,
            opacity: heroTrailerPlaying ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
            pointerEvents: 'none',
          }}
        >
          {heroMedia && (
            <iframe
              key={`${heroMedia.id}-${isHeroMuted}-${heroTrailerPlaying}`}
              src={`https://www.youtube-nocookie.com/embed/${activeTrailerKey}?autoplay=1&mute=${isHeroMuted ? 1 : 0}&controls=0&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${activeTrailerKey}`}
              title="Hero Official Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              style={{
                width: '100vw',
                height: '56.25vw',
                minHeight: '100vh',
                minWidth: '177.77vh',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(1.4)',
                border: 'none',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div className="cb-hero-vignette" style={{ zIndex: 3 }} />
        <div className="cb-hero-bottom-fade" style={{ zIndex: 3 }} />

        <div className="cb-hero-content" style={{ zIndex: 4, position: 'relative' }}>
          <div className="cb-hero-tag">
            <span className="cb-exclusive-pill">NETFLIX AI FEATURED</span>
            <span className="cb-hero-rating">
              <Star size={13} color="#FBBF24" fill="#FBBF24" style={{ display: 'inline', marginRight: '4px' }} />
              IMDb {heroMedia?.vote_average ? heroMedia.vote_average.toFixed(1) : '8.6'}
            </span>
          </div>

          <h1 className="cb-hero-title">
            {heroMedia ? heroMedia.title || heroMedia.name : 'Stream Free Movies & TV Shows'}
          </h1>

          <p className="cb-hero-synopsis">
            {heroMedia
              ? heroMedia.overview
              : 'Watch full HD movie trailers and TV series on Netflix AI. Start a synchronized Watch Space to stream with friends in real-time.'}
          </p>

          <div className="cb-hero-actions">
            <button
              className="cb-btn cb-btn-play"
              onClick={() => startHeroTrailer(true)}
            >
              <Play size={20} fill="currentColor" />
              <span>{heroTrailerPlaying ? 'Playing Trailer' : 'Play Trailer'}</span>
            </button>

            <button
              className="cb-btn cb-btn-space"
              onClick={() => heroMedia && handleOpenWatchSpace(heroMedia)}
            >
              <Users size={19} />
              <span>Watch Together (Demo)</span>
            </button>

            <button
              className="cb-btn cb-btn-info"
              onClick={() => setSelectedMedia(heroMedia)}
            >
              <Info size={19} />
              <span>More Info</span>
            </button>

            {heroTrailerPlaying && (
              <button
                className="cb-btn cb-btn-secondary"
                onClick={() => setIsHeroMuted(!isHeroMuted)}
                title={isHeroMuted ? 'Unmute Audio' : 'Mute Audio'}
                style={{ borderRadius: '50%', padding: '0.65rem' }}
              >
                {isHeroMuted ? <VolumeX size={18} /> : <Volume2 size={18} color="var(--netflix-red)" />}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. Main Rows Container */}
      <main className="cb-main-content">

        {/* ── ROW 1: TRENDING MOVIES THIS WEEK (Landscape 16:9) ── */}
        {showMovies && (
          <section className="cb-movie-row">
            <div className="cb-row-header">
              <h2 className="cb-row-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Flame color="#e50914" size={20} /> Trending Movies This Week
              </h2>
              <span className="cb-row-sub">Handpicked global blockbusters</span>
            </div>

            <div className="cb-row-slider-wrapper">
              <button
                className="cb-row-arrow cb-arrow-left"
                onClick={() => handleScrollRow('trendingM', 'left')}
                aria-label="Scroll left"
              >
                <ChevronLeft size={24} />
              </button>

              <div
                className="cb-row-posters landscape-row"
                ref={(el) => (rowRefs.current['trendingM'] = el)}
              >
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="cb-skeleton-landscape-card cb-skeleton" />
                    ))
                  : trendingMovies.map((item) => (
                      <div
                        key={item.id}
                        className="cb-landscape-card"
                        onClick={() => setSelectedMedia(item)}
                      >
                        <div className="cb-card-img-wrap">
                          <img
                            src={getImageUrl(item.backdrop_path || item.poster_path, true)}
                            alt={item.title || item.name}
                            className="cb-card-img"
                          />
                          <div className="cb-card-badge-rating">
                            <Star size={11} color="#FBBF24" fill="#FBBF24" style={{ display: 'inline', marginRight: '3px' }} />{item.vote_average ? item.vote_average.toFixed(1) : '8.2'}
                          </div>
                          <div className="cb-card-overlay">
                            <div className="cb-card-play-btn">
                              <Play size={20} fill="#fff" />
                            </div>
                          </div>
                        </div>

                        <div className="cb-landscape-info">
                          <div className="cb-card-title">{item.title || item.name}</div>
                          <div className="cb-card-sub">
                            <span>{(item.release_date || item.first_air_date || '2026').substring(0, 4)}</span>
                            <button
                              className="cb-card-watch-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWatchSpace(item);
                              }}
                            >
                              <Users size={13} /> Watch Space
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>

              <button
                className="cb-row-arrow cb-arrow-right"
                onClick={() => handleScrollRow('trendingM', 'right')}
                aria-label="Scroll right"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </section>
        )}

        {/* ── ROW 2: TRENDING SERIES THIS WEEK (Landscape 16:9) ── */}
        {showSeries && (
          <section className="cb-movie-row">
            <div className="cb-row-header">
              <h2 className="cb-row-title"><Tv size={18} style={{ display: 'inline', marginRight: '6px', color: 'var(--netflix-red)' }} />Trending Series This Week</h2>
              <span className="cb-row-sub">Top binge-worthy TV shows</span>
            </div>

            <div className="cb-row-slider-wrapper">
              <button
                className="cb-row-arrow cb-arrow-left"
                onClick={() => handleScrollRow('trendingT', 'left')}
                aria-label="Scroll left"
              >
                <ChevronLeft size={24} />
              </button>

              <div
                className="cb-row-posters landscape-row"
                ref={(el) => (rowRefs.current['trendingT'] = el)}
              >
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="cb-skeleton-landscape-card cb-skeleton" />
                    ))
                  : trendingTV.map((item) => (
                      <div
                        key={item.id}
                        className="cb-landscape-card"
                        onClick={() => setSelectedMedia({ ...item, media_type: 'tv' })}
                      >
                        <div className="cb-card-img-wrap">
                          <img
                            src={getImageUrl(item.backdrop_path || item.poster_path, true)}
                            alt={item.name || item.title}
                            className="cb-card-img"
                          />
                          <div className="cb-card-badge-rating">
                            <Star size={11} color="#FBBF24" fill="#FBBF24" style={{ display: 'inline', marginRight: '3px' }} />{item.vote_average ? item.vote_average.toFixed(1) : '8.5'}
                          </div>
                          <div className="cb-card-overlay">
                            <div className="cb-card-play-btn">
                              <Play size={20} fill="#fff" />
                            </div>
                          </div>
                        </div>

                        <div className="cb-landscape-info">
                          <div className="cb-card-title">{item.name || item.title}</div>
                          <div className="cb-card-sub">
                            <span>{(item.first_air_date || item.release_date || '2026').substring(0, 4)}</span>
                            <button
                              className="cb-card-watch-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWatchSpace({ ...item, media_type: 'tv' });
                              }}
                            >
                              <Users size={13} /> Watch Space
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>

              <button
                className="cb-row-arrow cb-arrow-right"
                onClick={() => handleScrollRow('trendingT', 'right')}
                aria-label="Scroll right"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </section>
        )}

        {/* ── ROW 3: TOP RATED MOVIES (TOP IMDB - RANKED 1..10) ── */}
        {showTopImdb && (
          <section className="cb-movie-row">
            <div className="cb-row-header">
              <h2 className="cb-row-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trophy color="#f59e0b" size={20} /> Top IMDb — Highest Rated Content
              </h2>
              <span className="cb-row-sub">Top 10 cinema masterpieces</span>
            </div>

            <div className="cb-row-slider-wrapper">
              <button
                className="cb-row-arrow cb-arrow-left"
                onClick={() => handleScrollRow('topRated', 'left')}
                aria-label="Scroll left"
              >
                <ChevronLeft size={24} />
              </button>

              <div
                className="cb-row-posters portrait-row"
                ref={(el) => (rowRefs.current['topRated'] = el)}
              >
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="cb-skeleton-ranked-card cb-skeleton" />
                    ))
                  : topRatedMovies.slice(0, 10).map((item, idx) => (
                      <div
                        key={item.id}
                        className="cb-ranked-card"
                        onClick={() => setSelectedMedia(item)}
                      >
                        <div className="cb-rank-number">#{idx + 1}</div>
                        <div className="cb-portrait-wrapper">
                          <img
                            src={getImageUrl(item.poster_path)}
                            alt={item.title}
                            className="cb-portrait-img"
                          />
                          <div className="cb-card-badge-hd">HD</div>
                          <div className="cb-portrait-hover">
                            <div className="cb-hover-btn-group">
                              <button className="cb-circle-btn">
                                <Play size={15} fill="currentColor" />
                              </button>
                              <button
                                className="cb-circle-btn space"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWatchSpace(item);
                                }}
                                title="Watch Together"
                              >
                                <Users size={14} />
                              </button>
                            </div>
                            <div className="cb-hover-title">{item.title}</div>
                            <div className="cb-hover-score" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Star size={12} fill="#e50914" color="#e50914" /> {item.vote_average?.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>

              <button
                className="cb-row-arrow cb-arrow-right"
                onClick={() => handleScrollRow('topRated', 'right')}
                aria-label="Scroll right"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </section>
        )}

        {/* ── ROW 4: POPULAR MOVIES (Portrait 2:3) ── */}
        {showMovies && (
          <section className="cb-movie-row">
            <div className="cb-row-header">
              <h2 className="cb-row-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Film color="#e50914" size={20} /> Popular Movies
              </h2>
            </div>

            <div className="cb-row-slider-wrapper">
              <button
                className="cb-row-arrow cb-arrow-left"
                onClick={() => handleScrollRow('popularM', 'left')}
                aria-label="Scroll left"
              >
                <ChevronLeft size={24} />
              </button>

              <div
                className="cb-row-posters portrait-row"
                ref={(el) => (rowRefs.current['popularM'] = el)}
              >
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="cb-skeleton-card cb-skeleton" />
                    ))
                  : popularMovies.map((item) => (
                      <div
                        key={item.id}
                        className="cb-portrait-card"
                        onClick={() => setSelectedMedia(item)}
                      >
                        <div className="cb-portrait-wrapper">
                          <img
                            src={getImageUrl(item.poster_path)}
                            alt={item.title}
                            className="cb-portrait-img"
                          />
                          <div className="cb-card-badge-hd">HD</div>
                          <div className="cb-portrait-hover">
                            <div className="cb-hover-btn-group">
                              <button className="cb-circle-btn">
                                <Play size={15} fill="currentColor" />
                              </button>
                              <button
                                className="cb-circle-btn space"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWatchSpace(item);
                                }}
                                title="Watch Together"
                              >
                                <Users size={14} />
                              </button>
                            </div>
                            <div className="cb-hover-title">{item.title}</div>
                            <div className="cb-hover-score" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Star size={12} fill="#e50914" color="#e50914" /> {item.vote_average ? item.vote_average.toFixed(1) : '8.1'}
                            </div>
                          </div>
                        </div>
                        <div className="cb-card-footer-title">{item.title}</div>
                      </div>
                    ))}
              </div>

              <button
                className="cb-row-arrow cb-arrow-right"
                onClick={() => handleScrollRow('popularM', 'right')}
                aria-label="Scroll right"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </section>
        )}

        {/* ── ROW 5: POPULAR SERIES (Portrait 2:3) ── */}
        {showSeries && (
          <section className="cb-movie-row">
            <div className="cb-row-header">
              <h2 className="cb-row-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tv color="#e50914" size={20} /> Popular Series
              </h2>
            </div>

            <div className="cb-row-slider-wrapper">
              <button
                className="cb-row-arrow cb-arrow-left"
                onClick={() => handleScrollRow('popularT', 'left')}
                aria-label="Scroll left"
              >
                <ChevronLeft size={24} />
              </button>

              <div
                className="cb-row-posters portrait-row"
                ref={(el) => (rowRefs.current['popularT'] = el)}
              >
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="cb-skeleton-card cb-skeleton" />
                    ))
                  : popularTV.map((item) => (
                      <div
                        key={item.id}
                        className="cb-portrait-card"
                        onClick={() => setSelectedMedia({ ...item, media_type: 'tv' })}
                      >
                        <div className="cb-portrait-wrapper">
                          <img
                            src={getImageUrl(item.poster_path)}
                            alt={item.name}
                            className="cb-portrait-img"
                          />
                          <div className="cb-card-badge-hd">HD</div>
                          <div className="cb-portrait-hover">
                            <div className="cb-hover-btn-group">
                              <button className="cb-circle-btn">
                                <Play size={15} fill="currentColor" />
                              </button>
                              <button
                                className="cb-circle-btn space"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWatchSpace({ ...item, media_type: 'tv' });
                                }}
                                title="Watch Together"
                              >
                                <Users size={14} />
                              </button>
                            </div>
                            <div className="cb-hover-title">{item.name}</div>
                            <div className="cb-hover-score" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Star size={12} fill="#e50914" color="#e50914" /> {item.vote_average ? item.vote_average.toFixed(1) : '8.4'}
                            </div>
                          </div>
                        </div>
                        <div className="cb-card-footer-title">{item.name}</div>
                      </div>
                    ))}
              </div>

              <button
                className="cb-row-arrow cb-arrow-right"
                onClick={() => handleScrollRow('popularT', 'right')}
                aria-label="Scroll right"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </section>
        )}

        {/* ── ROW 6: UPCOMING MOVIES ── */}
        <section className="cb-movie-row">
          <div className="cb-row-header">
            <h2 className="cb-row-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles color="#e50914" size={20} /> Upcoming Releases
            </h2>
          </div>

          <div className="cb-row-slider-wrapper">
            <button
              className="cb-row-arrow cb-arrow-left"
              onClick={() => handleScrollRow('upcoming', 'left')}
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} />
            </button>

            <div
              className="cb-row-posters portrait-row"
              ref={(el) => (rowRefs.current['upcoming'] = el)}
            >
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="cb-skeleton-card cb-skeleton" />
                  ))
                : upcomingMovies.map((item) => (
                    <div
                      key={item.id}
                      className="cb-portrait-card"
                      onClick={() => setSelectedMedia(item)}
                    >
                      <div className="cb-portrait-wrapper">
                        <img
                          src={getImageUrl(item.poster_path)}
                          alt={item.title}
                          className="cb-portrait-img"
                        />
                        <div className="cb-card-badge-hd">Teaser</div>
                        <div className="cb-portrait-hover">
                          <div className="cb-hover-btn-group">
                            <button className="cb-circle-btn">
                              <Play size={15} fill="currentColor" />
                            </button>
                          </div>
                          <div className="cb-hover-title">{item.title}</div>
                          <div className="cb-hover-score">Coming Soon</div>
                        </div>
                      </div>
                      <div className="cb-card-footer-title">{item.title}</div>
                    </div>
                  ))}
            </div>

            <button
              className="cb-row-arrow cb-arrow-right"
              onClick={() => handleScrollRow('upcoming', 'right')}
              aria-label="Scroll right"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </section>
      </main>

      {/* 5. Detail & Trailer Modal */}
      {selectedMedia && (
        <CinebyModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onWatchTogether={(item) => {
            setSelectedMedia(null);
            handleOpenWatchSpace(item);
          }}
        />
      )}

      {/* 6. Footer */}
      <Footer />
    </div>
  );
};

export default CinebyHome;
