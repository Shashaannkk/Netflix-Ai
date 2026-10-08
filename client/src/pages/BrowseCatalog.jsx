import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Film,
  Tv,
  Star,
  Play,
  Users,
  Info,
  Clock,
  Sparkles,
  SlidersHorizontal,
  X,
  ChevronDown,
  Loader,
  Flame,
  Trophy,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CinebyNavbar from '../components/CinebyNavbar';
import CinebyModal from '../components/CinebyModal';
import Footer from '../components/Footer';
import {
  searchMediaFiltered,
  fetchTrendingMovies,
  fetchTrendingTV,
  fetchPopularMovies,
  fetchPopularTV,
  fetchTopRatedMovies,
  fetchTrendingAnimeMovies,
  fetchTrendingAnimeTV,
  getImageUrl,
  CURATED_MOVIES,
  CURATED_ANIME_MOVIES,
  CURATED_ANIME_SERIES,
} from '../services/tmdb';

export const BrowseCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search & Filter State
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all'); // 'all' | 'movie' | 'tv' | 'anime' | 'top-imdb'
  const [region, setRegion] = useState(searchParams.get('region') || 'all'); // 'all' | 'hollywood' | 'bollywood' | 'anime'
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [durationBand, setDurationBand] = useState('all'); // 'all' | 'short' | 'feature' | 'epic'
  const [sortBy, setSortBy] = useState('trending'); // 'trending' | 'rating' | 'release'

  // Data & Modal State
  const [loading, setLoading] = useState(true);
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(24);

  // Available Genres List
  const GENRES_LIST = [
    'All',
    'Action',
    'Science Fiction',
    'Sci-Fi',
    'Adventure',
    'Drama',
    'Comedy',
    'Thriller',
    'Horror',
    'Animation',
    'Anime',
    'Romance',
    'Fantasy',
    'Crime',
  ];

  // Load initial media catalog
  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      try {
        setLoading(true);
        const [
          trendingM,
          trendingT,
          popularM,
          popularT,
          topRatedM,
          animeM,
          animeT,
        ] = await Promise.all([
          fetchTrendingMovies(),
          fetchTrendingTV(),
          fetchPopularMovies(),
          fetchPopularTV(),
          fetchTopRatedMovies(),
          fetchTrendingAnimeMovies(),
          fetchTrendingAnimeTV(),
        ]);

        if (!isMounted) return;

        // Deduplicate and combine into full catalog
        const combined = [];
        const seenIds = new Set();

        const addItems = (list, defaultType = 'movie') => {
          (list || []).forEach((item) => {
            const type = item.media_type || (item.first_air_date ? 'tv' : defaultType);
            const key = `${type}-${item.id}`;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              combined.push({
                ...item,
                media_type: type,
                title: item.title || item.name || 'Untitled',
                release_date: item.release_date || item.first_air_date || '2025',
              });
            }
          });
        };

        addItems(trendingM, 'movie');
        addItems(trendingT, 'tv');
        addItems(popularM, 'movie');
        addItems(popularT, 'tv');
        addItems(topRatedM, 'movie');
        addItems(animeM, 'movie');
        addItems(animeT, 'tv');
        addItems(CURATED_MOVIES, 'movie');

        setCatalogItems(combined);
      } catch (err) {
        console.error('[BrowseCatalog] Catalog loading error:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle dynamic query and category/region search using the EXACT same search engine
  useEffect(() => {
    let isMounted = true;
    const activeFilter = region !== 'all' ? region : category !== 'all' ? category : 'all';

    const performSearch = async () => {
      setLoading(true);
      const searchRes = await searchMediaFiltered(query, activeFilter);
      if (isMounted) {
        if (searchRes && searchRes.length > 0) {
          setCatalogItems(searchRes);
        }
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      performSearch();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, category, region]);

  // Filtered & Sorted Catalog Computation
  const filteredItems = useMemo(() => {
    return catalogItems
      .filter((item) => {
        const titleText = (item.title || item.name || '').toLowerCase();
        const overviewText = (item.overview || '').toLowerCase();
        const matchesQuery = !query.trim() || titleText.includes(query.toLowerCase()) || overviewText.includes(query.toLowerCase());

        // Category filter
        const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const isAnime = item.genre_ids?.includes(16) || item.genres?.some((g) => (g.name || g || '').toLowerCase().includes('animation')) || item.original_language === 'ja';

        let matchesCat = true;
        if (category === 'movie') matchesCat = type === 'movie' && !isAnime;
        if (category === 'tv') matchesCat = type === 'tv' && !isAnime;
        if (category === 'anime') matchesCat = isAnime;
        if (category === 'top-imdb') matchesCat = (item.vote_average || 0) >= 8.0;

        // Region / Language filter
        const lang = (item.original_language || item.language || '').toLowerCase();
        let matchesRegion = true;
        if (region === 'hollywood') matchesRegion = lang === 'en' || !lang;
        if (region === 'bollywood') matchesRegion = lang === 'hi' || lang === 'ta' || lang === 'te' || titleText.includes('hindi');
        if (region === 'anime') matchesRegion = lang === 'ja' || isAnime;

        // Genre filter
        let matchesGenre = true;
        if (selectedGenre !== 'all') {
          const lowerSelected = selectedGenre.toLowerCase();
          matchesGenre = (item.genres || []).some((g) => (g.name || g || '').toLowerCase().includes(lowerSelected)) ||
            (item.genre_ids && lowerSelected === 'animation' && item.genre_ids.includes(16));
        }

        // Duration Band filter
        const runtime = item.runtime || (type === 'tv' ? 45 : 110);
        let matchesDuration = true;
        if (durationBand === 'short') matchesDuration = runtime < 45;
        if (durationBand === 'feature') matchesDuration = runtime >= 45 && runtime <= 120;
        if (durationBand === 'epic') matchesDuration = runtime > 120;

        return matchesQuery && matchesCat && matchesRegion && matchesGenre && matchesDuration;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
        if (sortBy === 'release') return new Date(b.release_date || 0) - new Date(a.release_date || 0);
        return (b.popularity || 80) - (a.popularity || 80);
      });
  }, [catalogItems, query, category, region, selectedGenre, durationBand, sortBy]);

  const handleOpenWatchSpace = (item) => {
    const titleName = item.title || item.name || 'Netflix AI Title';
    const trailer = item.trailer_key || 'YoHD9XEInc0';
    const backdrop = getImageUrl(item.backdrop_path || item.poster_path, true);
    const poster = getImageUrl(item.poster_path);

    navigate(
      `/create-space?titleId=${item.id}&title=${encodeURIComponent(titleName)}&trailerKey=${trailer}&backdrop=${encodeURIComponent(backdrop)}&poster=${encodeURIComponent(poster)}`
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <CinebyNavbar onSelectMedia={(media) => setSelectedMedia(media)} />

      {/* Hero Search & Filter Header Banner */}
      <div
        style={{
          paddingTop: '100px',
          paddingBottom: '2rem',
          background: 'linear-gradient(180deg, rgba(229, 9, 20, 0.12) 0%, rgba(10, 10, 10, 1) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--netflix-red)', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Sparkles size={16} /> Netflix AI Global Catalog & Multi-Filter Search
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.5px', marginTop: '0.3rem' }}>
            Browse Movies, Series & Anime
          </h1>
          <p style={{ color: '#aaa', fontSize: '0.95rem', marginTop: '0.3rem', maxWidth: '680px' }}>
            Search over thousands of titles with precision region, genre, duration, and popularity filters.
          </p>

          {/* Master Search Input Bar */}
          <div style={{ marginTop: '1.75rem', position: 'relative', maxWidth: '720px' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              type="text"
              placeholder="Search by title, director, cast, or plot keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 3rem',
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Filter Drawer & Controls */}
      <div style={{ background: '#121212', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem 0' }}>
        <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Row 1: Format Category Pills & Region Chips */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Format Category Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[
                { key: 'all', label: 'All Catalog' },
                { key: 'movie', label: 'Movies' },
                { key: 'tv', label: 'Series' },
                { key: 'anime', label: 'Anime' },
                { key: 'top-imdb', label: 'Top IMDb' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setCategory(item.key)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    border: 'none',
                    background: category === item.key ? 'var(--netflix-red)' : '#1f1f1f',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Region / Cinema Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Region:</span>
              {[
                { key: 'all', label: 'Global' },
                { key: 'hollywood', label: 'Hollywood' },
                { key: 'bollywood', label: 'Bollywood' },
                { key: 'anime', label: 'Japanese Anime' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRegion(r.key)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '14px',
                    border: region === r.key ? '1px solid var(--netflix-red)' : '1px solid #333',
                    background: region === r.key ? 'rgba(229,9,20,0.15)' : '#181818',
                    color: region === r.key ? '#fff' : '#aaa',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Genre Pills & Sort Dropdowns */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Genre Horizontal Filter Scroll */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.2rem' }}>
              {GENRES_LIST.map((g) => {
                const key = g.toLowerCase();
                const isSelected = selectedGenre === key;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGenre(key)}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #fff' : '1px solid transparent',
                      background: isSelected ? '#333' : '#1c1c1c',
                      color: isSelected ? '#fff' : '#888',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {/* Sort & Duration Select Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Duration Filter */}
              <select
                value={durationBand}
                onChange={(e) => setDurationBand(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  background: '#1c1c1c',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Lengths</option>
                <option value="short">Quick (&lt;45 mins)</option>
                <option value="feature">Feature (45-120 mins)</option>
                <option value="epic">Epic (&gt;120 mins)</option>
              </select>

              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  background: '#1c1c1c',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="trending">Sort by Popular & Trending</option>
                <option value="rating">Sort by IMDb Rating</option>
                <option value="release">Sort by Release Date</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header Counter & Clear Filters */}
      <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: '#aaa', fontWeight: 600 }}>
          Showing <strong style={{ color: '#fff' }}>{filteredItems.length}</strong> titles matching filters
        </div>

        {(query || category !== 'all' || region !== 'all' || selectedGenre !== 'all' || durationBand !== 'all') && (
          <button
            onClick={() => {
              setQuery('');
              setCategory('all');
              setRegion('all');
              setSelectedGenre('all');
              setDurationBand('all');
              setSortBy('trending');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--netflix-red)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <X size={14} /> Reset All Filters
          </button>
        )}
      </div>

      {/* Main Content Grid Display */}
      <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <Loader size={36} className="spin-icon" color="var(--netflix-red)" />
            <p style={{ color: '#aaa', marginTop: '1rem', fontSize: '0.9rem' }}>Searching and indexing global catalog...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 2rem',
              background: '#121212',
              borderRadius: '16px',
              border: '1px dashed rgba(255,255,255,0.15)',
              margin: '2rem 0',
            }}
          >
            <Film size={48} color="#555" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>No Titles Found</h3>
            <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '0.4rem', maxWidth: '440px', margin: '0.4rem auto 1.5rem' }}>
              We couldn't find any titles matching your selected filters and query. Try adjusting your region, category, or search keywords.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setCategory('all');
                setRegion('all');
                setSelectedGenre('all');
                setDurationBand('all');
              }}
              className="cb-btn cb-btn-play"
              style={{ display: 'inline-flex', padding: '0.6rem 1.4rem' }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {filteredItems.slice(0, displayLimit).map((item, idx) => {
                const titleName = item.title || item.name || 'Untitled';
                const poster = getImageUrl(item.poster_path || item.poster);
                const releaseYear = (item.release_date || item.first_air_date || '').substring(0, 4) || '2025';
                const rating = item.vote_average ? item.vote_average.toFixed(1) : '8.2';
                const isTv = item.media_type === 'tv' || Boolean(item.first_air_date);

                return (
                  <div
                    key={item.id || idx}
                    className="cb-portrait-card"
                    onClick={() => setSelectedMedia(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="cb-portrait-wrapper" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                      <img
                        src={poster}
                        alt={titleName}
                        className="cb-portrait-img"
                        loading="lazy"
                      />

                      {/* Badge HD / Anime */}
                      <div className="cb-card-badge-hd">
                        {isTv ? 'Series' : 'HD 1080p'}
                      </div>

                      {/* Hover Overlay */}
                      <div className="cb-portrait-hover">
                        <div className="cb-hover-btn-group">
                          <button className="cb-circle-btn" title="Play">
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
                        <div className="cb-hover-title">{titleName}</div>
                        <div className="cb-hover-score" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Star size={12} fill="#e50914" color="#e50914" /> {rating} &bull; {releaseYear}
                        </div>
                      </div>
                    </div>

                    <div className="cb-card-footer-title" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>
                      {titleName}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {displayLimit < filteredItems.length && (
              <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 24)}
                  className="cb-btn cb-btn-secondary"
                  style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 800 }}
                >
                  Load More Titles ({filteredItems.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Detail Viewer */}
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

      <Footer />
    </div>
  );
};

export default BrowseCatalog;
