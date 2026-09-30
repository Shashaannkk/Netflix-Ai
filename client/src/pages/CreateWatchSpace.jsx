import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Users,
  Lock,
  Unlock,
  Sparkles,
  Vote,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  ExternalLink,
  Play,
  Loader,
  AlertCircle,
  Clock,
  Star,
  VolumeX,
  MessageSquare,
  Bot,
  Film,
  Server,
  Edit2,
  Eye,
  Plus,
  Tv,
  Filter,
  Info,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWatchSpace } from '../context/WatchSpaceContext';
import { createSpace, getTitlesForPicker } from '../services/watchSpaceApi';
import {
  fetchTrendingMovies,
  fetchTrendingTV,
  fetchPopularMovies,
  fetchPopularTV,
  fetchUpcomingMovies,
  fetchTopRatedMovies,
  searchMedia,
  getImageUrl
} from '../services/tmdb';
import NetflixAiLogo from '../components/NetflixAiLogo';
import './CreateWatchSpace.css';

// ── Step constants ──────────────────────────────────────────────────────────
const STEP_PICK_TITLE = 1;
const STEP_SETTINGS   = 2;
const STEP_LAUNCH     = 3;

// ── Category chips ──────────────────────────────────────────────────────────
const CATEGORIES = [
  'All',
  'Movies',
  'TV Shows',
  'Action',
  'Comedy',
  'Drama',
  'Thriller',
  'Sci-Fi',
  'Horror',
  'Romance',
  'Animation',
  'Documentary'
];

// ── Helper: Format duration ──────────────────────────────────────────────────
const formatDurationOrSeasons = (item) => {
  if (item.type === 'tv' || item.media_type === 'tv') {
    const seasons = item.number_of_seasons || item.seasonsCount || 2;
    return `${seasons} Season${seasons > 1 ? 's' : ''}`;
  }
  const sec = item.durationSeconds || (item.runtime ? item.runtime * 60 : 7200);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const SERVERS = [
  {
    id: 'server_alpha',
    name: 'Server 1',
    provider: 'Alpha HD Stream',
    badge: 'Recommended',
    icon: '🚀',
    bullets: ['High quality', 'Stable', 'Works most of the time']
  },
  {
    id: 'server_beta',
    name: 'Server 2',
    provider: 'Beta High-Speed',
    icon: '⚡',
    bullets: ['Good quality', 'Fast loading', 'Reliable']
  },
  {
    id: 'server_gamma',
    name: 'Server 3',
    provider: 'Gamma CDN Mirror',
    icon: '🌐',
    bullets: ['Backup source', 'Good quality', 'Region friendly']
  },
  {
    id: 'server_delta',
    name: 'Server 4',
    provider: 'Delta Fallback Stream',
    icon: '🛡️',
    bullets: ['Fallback option', 'Moderate speed', 'Use if others fail']
  }
];

const START_POSITIONS = [
  { id: 'beginning', label: 'From Beginning' },
  { id: '10m', label: '10 Minutes In' },
  { id: 'halfway', label: 'Halfway' },
  { id: 'custom', label: 'Custom Timestamp' }
];

const PARTICIPANT_OPTIONS = [2, 5, 10, 15, 20, 25, 50];

const VERBOSITY_OPTIONS = [
  { val: 'silent', icon: VolumeX, label: 'Silent', desc: 'Questions only' },
  { val: 'moderate', icon: MessageSquare, label: 'Moderate', desc: 'Occasional insights' },
  { val: 'chatty', icon: Bot, label: 'Chatty', desc: 'Proactive & fun' }
];

const FALLBACK_CATALOG = [
  {
    _id: 'm1',
    id: 'm1',
    title: 'Oppenheimer',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    durationSeconds: 10800,
    type: 'movie',
    media_type: 'movie',
    genres: ['History', 'Drama', 'Thriller'],
    ageRating: 'R',
    vote_average: 8.3,
    year: '2023',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
  },
  {
    _id: 't1',
    id: 't1',
    title: 'Breaking Bad',
    description: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
    durationSeconds: 3600,
    type: 'tv',
    media_type: 'tv',
    number_of_seasons: 5,
    genres: ['Crime', 'Drama', 'Thriller'],
    ageRating: '18+',
    vote_average: 9.5,
    year: '2013',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=1920&auto=format&fit=crop',
  }
];

const CreateWatchSpace = () => {
  const { user } = useAuth();
  const { setSpace } = useWatchSpace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Step state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(STEP_PICK_TITLE);

  // ── Step 1 catalog states ──────────────────────────────────────────────────
  const [popularMovies, setPopularMovies]   = useState([]);
  const [popularTV, setPopularTV]           = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [searchResults, setSearchResults]   = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy]                 = useState('Popular');
  const [selectedTitle, setSelectedTitle]   = useState(null);
  const [detailsModalTitle, setDetailsModalTitle] = useState(null);
  const userSelectedRef = useRef(false);

  const selectTitle = useCallback((item) => {
    if (!item) return;
    setSelectedTitle(item);
    userSelectedRef.current = true;
  }, []);

  // ── Room settings state (Step 2) ──────────────────────────────────────────
  const [roomName, setRoomName]               = useState('');
  const [isPrivate, setIsPrivate]             = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [startPosition, setStartPosition]     = useState('beginning');
  const [aiVerbosity, setAiVerbosity]         = useState('moderate');
  const [votingEnabled, setVotingEnabled]     = useState(true);
  const [mediaChoice, setMediaChoice]         = useState('movie'); // 'movie' | 'trailer'
  const [selectedServer, setSelectedServer]   = useState('server_alpha');

  // ── Launch state (Step 3) ──────────────────────────────────────────────────
  const [createdSpace, setCreatedSpace] = useState(null);
  const [creating, setCreating]         = useState(false);
  const [copied, setCopied]             = useState('');

  // ── Normalize raw backend/TMDB items ──────────────────────────────────────
  const normalizeItem = useCallback((item, defaultType = 'movie') => {
    const isTv = item.media_type === 'tv' || item.first_air_date || item.name || defaultType === 'tv';
    const titleText = item.title || item.name || 'Untitled';
    const yearText = item.release_date
      ? item.release_date.substring(0, 4)
      : (item.first_air_date ? item.first_air_date.substring(0, 4) : item.year || '2023');
    
    return {
      _id: String(item._id || item.id),
      id: String(item.id || item._id),
      title: titleText,
      description: item.overview || item.description || 'Watch together in real-time with synchronized stream and AI co-pilot on Netflix AI.',
      durationSeconds: item.runtime ? item.runtime * 60 : (item.durationSeconds || 7200),
      type: isTv ? 'tv' : 'movie',
      media_type: isTv ? 'tv' : 'movie',
      number_of_seasons: item.number_of_seasons || item.seasonsCount || (isTv ? 2 : undefined),
      genres: item.genres && item.genres.length > 0
        ? (typeof item.genres[0] === 'string' ? item.genres : item.genres.map(g => g.name))
        : (isTv ? ['TV Series', 'Drama'] : ['Movie', 'Feature']),
      ageRating: item.certification || item.ageRating || (isTv ? '16+' : 'R'),
      vote_average: item.vote_average || 8.2,
      year: yearText,
      poster: getImageUrl(item.poster_path || item.poster),
      backdropUrl: getImageUrl(item.backdrop_path || item.backdropUrl || item.poster_path, true),
      trailer_key: item.trailer_key,
      videoAssetUrl: item.videoAssetUrl || (item.trailer_key
        ? `https://www.youtube.com/embed/${item.trailer_key}?autoplay=1`
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4')
    };
  }, []);

  // ── Load Real Catalog Data ─────────────────────────────────────────────────
  useEffect(() => {
    const loadCatalogData = async () => {
      setLoadingCatalog(true);
      try {
        const [popM, popT, upM, dbRes] = await Promise.all([
          fetchPopularMovies().catch(() => []),
          fetchPopularTV().catch(() => []),
          fetchUpcomingMovies().catch(() => []),
          getTitlesForPicker().catch(() => ({ data: { titles: [] } })),
        ]);

        const normMovies = (popM || []).map((m) => normalizeItem(m, 'movie'));
        const normTV     = (popT || []).map((t) => normalizeItem(t, 'tv'));
        const normUp     = (upM || []).map((m) => normalizeItem(m, 'movie'));

        const moviesList = normMovies.length > 0 ? normMovies : FALLBACK_CATALOG.filter(i => i.type === 'movie');
        const tvList     = normTV.length > 0 ? normTV : FALLBACK_CATALOG.filter(i => i.type === 'tv');

        setPopularMovies(moviesList);
        setPopularTV(tvList);
        setUpcomingMovies(normUp.length > 0 ? normUp : normMovies.slice(0, 6));

        // Only auto-select if user hasn't chosen a title yet
        if (!userSelectedRef.current) {
          const first = moviesList[0] || tvList[0] || FALLBACK_CATALOG[0];
          setSelectedTitle(first);
        }
      } catch (err) {
        console.error('[CreateWatchSpace] Error loading catalog:', err);
        setPopularMovies(FALLBACK_CATALOG.filter(i => i.type === 'movie'));
        setPopularTV(FALLBACK_CATALOG.filter(i => i.type === 'tv'));
        if (!userSelectedRef.current) {
          setSelectedTitle(FALLBACK_CATALOG[0]);
        }
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalogData();
  }, [normalizeItem]);

  // ── Search handler with debouncing ─────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchMedia(searchQuery);
        if (results && results.length > 0) {
          setSearchResults(results.map(r => normalizeItem(r)));
        } else {
          // Client side search fallback
          const allLocal = [...popularMovies, ...popularTV, ...upcomingMovies];
          const matched = allLocal.filter(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.genres || []).some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          setSearchResults(matched);
        }
      } catch (err) {
        console.warn('[CreateWatchSpace] Remote search fallback:', err);
        const allLocal = [...popularMovies, ...popularTV, ...upcomingMovies];
        setSearchResults(
          allLocal.filter((i) => i.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, popularMovies, popularTV, upcomingMovies, normalizeItem]);

  // ── Pre-select if URL params exist ──────────────────────────────────────────
  useEffect(() => {
    if (userSelectedRef.current) return;

    const preselectedId = searchParams.get('titleId');
    const paramTitle = searchParams.get('title');
    const paramTrailer = searchParams.get('trailerKey');

    if (preselectedId || paramTitle) {
      const allLocal = [...popularMovies, ...popularTV, ...upcomingMovies];
      const found = allLocal.find((t) => String(t._id) === String(preselectedId) || String(t.id) === String(preselectedId));
      if (found) {
        setSelectedTitle(found);
        userSelectedRef.current = true;
      } else if (paramTitle) {
        setSelectedTitle({
          _id: preselectedId || 'custom-1',
          id: preselectedId || 'custom-1',
          title: paramTitle,
          description: 'Stream movie & trailer together with live AI co-pilot on Netflix AI.',
          durationSeconds: 10800,
          type: 'movie',
          genres: ['Movie', 'Feature'],
          ageRating: 'R',
          vote_average: 8.3,
          year: '2023',
          poster: searchParams.get('poster') || FALLBACK_CATALOG[0].poster,
          backdropUrl: searchParams.get('backdrop') || FALLBACK_CATALOG[0].backdropUrl,
          trailer_key: paramTrailer,
          videoAssetUrl: paramTrailer
            ? (paramTrailer.startsWith('http') ? paramTrailer : `https://www.youtube.com/embed/${paramTrailer}?autoplay=1`)
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
        });
        userSelectedRef.current = true;
      }
    }
  }, [searchParams, popularMovies, popularTV, upcomingMovies]);

  // ── Auto-fill room name ─────────────────────────────────────────────────────
  useEffect(() => {
    const userName = user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : 'Shashank');
    if (selectedTitle) {
      setRoomName(`${userName}'s ${selectedTitle.title} Watch Space`);
    } else {
      setRoomName(`${userName}'s Watch Space`);
    }
  }, [user, selectedTitle]);

  // ── Filter & Sort Helper ───────────────────────────────────────────────────
  const filterAndSortList = (list) => {
    let filtered = [...list];
    if (selectedCategory === 'Movies') {
      filtered = filtered.filter((i) => i.type === 'movie');
    } else if (selectedCategory === 'TV Shows') {
      filtered = filtered.filter((i) => i.type === 'tv');
    } else if (selectedCategory !== 'All') {
      filtered = filtered.filter((i) =>
        (i.genres || []).some((g) => g.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
    }

    if (sortBy === 'Top Rated') {
      filtered.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === 'Newest') {
      filtered.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
    } else if (sortBy === 'Alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    return filtered;
  };

  // ── Handle Watch Space Creation (Step 2 -> 3) ─────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!selectedTitle) return;
    setCreating(true);

    let computedVideoUrl = selectedTitle.videoAssetUrl;
    if (mediaChoice === 'trailer') {
      computedVideoUrl = selectedTitle.trailer_key
        ? `https://www.youtube.com/embed/${selectedTitle.trailer_key}?autoplay=1`
        : (selectedTitle.videoAssetUrl && selectedTitle.videoAssetUrl.includes('youtube')
            ? selectedTitle.videoAssetUrl
            : 'https://www.youtube.com/embed/b9EkMc79ZSU?autoplay=1');
    } else {
      if (selectedServer === 'server_beta') {
        computedVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';
      } else if (selectedServer === 'server_gamma') {
        computedVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      } else if (selectedServer === 'server_delta') {
        computedVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
      } else {
        computedVideoUrl = (selectedTitle.videoAssetUrl && !selectedTitle.videoAssetUrl.includes('youtube'))
          ? selectedTitle.videoAssetUrl
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
      }
    }

    try {
      const res = await createSpace({
        titleId: selectedTitle._id || selectedTitle.id,
        title: selectedTitle.title,
        poster: selectedTitle.poster,
        backdropUrl: selectedTitle.backdropUrl,
        videoAssetUrl: computedVideoUrl,
        genres: selectedTitle.genres,
        settings: { roomName, isPrivate, maxParticipants, startPosition, aiVerbosity, votingEnabled, mediaChoice, selectedServer },
      });
      const space = res.data.space;
      setCreatedSpace(space);
      setSpace(space);
      setStep(STEP_LAUNCH);
    } catch (err) {
      console.warn('[CreateWatchSpace] Backend fallback room:', err.message);
      const code = 'NX' + Math.floor(1000 + Math.random() * 9000);
      const demoSpace = {
        _id: `space-${Date.now()}`,
        inviteCode: code,
        inviteLink: `${window.location.origin}/space/space-${Date.now()}`,
        status: 'live',
        hostUserId: user || { _id: 'guest-1', displayName: 'Host User' },
        participantIds: [],
        settings: { roomName, isPrivate, maxParticipants, startPosition, aiVerbosity, votingEnabled, mediaChoice, selectedServer },
        titleId: {
          _id: selectedTitle._id || selectedTitle.id,
          title: selectedTitle.title,
          poster: selectedTitle.poster,
          backdropUrl: selectedTitle.backdropUrl,
          videoAssetUrl: computedVideoUrl,
        }
      };
      setCreatedSpace(demoSpace);
      setSpace(demoSpace);
      setStep(STEP_LAUNCH);
    } finally {
      setCreating(false);
    }
  }, [selectedTitle, roomName, isPrivate, maxParticipants, startPosition, aiVerbosity, votingEnabled, mediaChoice, selectedServer, setSpace, user]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const selectedServerObj = SERVERS.find((s) => s.id === selectedServer) || SERVERS[0];
  const selectedPositionObj = START_POSITIONS.find((p) => p.id === startPosition) || START_POSITIONS[0];

  return (
    <div className="create-space-page">
      {/* Dynamic blurred backdrop background when title is selected */}
      {selectedTitle?.backdropUrl && step === STEP_PICK_TITLE && (
        <div
          className="cs-cinematic-bg-hero"
          style={{ backgroundImage: `url(${selectedTitle.backdropUrl})` }}
        />
      )}

      {/* ── TOP HEADER SUB-BAR ── */}
      <div className="cs-top-bar">
        <div className="cs-top-bar-left">
          <button
            className="cs-cancel-btn"
            onClick={() => (step > 1 && step < STEP_LAUNCH ? setStep(step - 1) : navigate(-1))}
          >
            <ArrowLeft size={16} />
            <span>{step === 1 ? 'Cancel' : 'Back'}</span>
          </button>
          <div className="cs-logo-wrapper" onClick={() => navigate('/')} style={{ cursor: 'pointer', marginLeft: '1rem' }}>
            <NetflixAiLogo height={28} />
          </div>
        </div>

        {/* Stepper Indicator */}
        <div className="cs-stepper">
          <div className={`cs-step-item ${step >= 1 ? 'active' : ''}`}>
            <span className="cs-step-num">1</span>
            <span className="cs-step-text">Pick Title</span>
          </div>
          <div className={`cs-step-line ${step > 1 ? 'active' : ''}`} />
          <div className={`cs-step-item ${step >= 2 ? 'active' : ''}`}>
            <span className="cs-step-num">2</span>
            <span className="cs-step-text">Settings</span>
          </div>
          <div className={`cs-step-line ${step > 2 ? 'active' : ''}`} />
          <div className={`cs-step-item ${step === 3 ? 'active' : ''}`}>
            <span className="cs-step-num">3</span>
            <span className="cs-step-text">Launch</span>
          </div>
        </div>
      </div>

      {/* ── STEP 1: PICK A TITLE ── */}
      {step === STEP_PICK_TITLE && (
        <div className="cs-step1-container">
          {/* Main Title Banner */}
          <div className="cs-page-heading-row">
            <div className="cs-page-icon-box">
              <Users size={22} color="#fff" />
            </div>
            <div>
              <h1 className="cs-page-heading">
                Create <span className="cs-red-accent">Watch Space</span>
              </h1>
              <p className="cs-page-subtitle">
                Pick a movie or series from your library to watch together.
              </p>
            </div>
          </div>

          {/* ── PERSISTENT SELECTED TITLE BANNER PANEL ── */}
          <div className="cs-selected-persistent-banner" id="cs-selected-persistent-banner">
            {selectedTitle ? (
              <div className="cs-selected-banner-content">
                <div className="cs-selected-banner-poster-box">
                  <img
                    src={selectedTitle.poster || selectedTitle.backdropUrl}
                    alt={selectedTitle.title}
                    className="cs-selected-banner-poster"
                  />
                  <span className="cs-selected-banner-type-badge">
                    {selectedTitle.type === 'tv' ? '📺 TV Series' : '🎬 Movie'}
                  </span>
                </div>

                <div className="cs-selected-banner-details">
                  <div className="cs-selected-banner-label">
                    <Sparkles size={14} color="#e50914" />
                    <span>SELECTED TITLE</span>
                  </div>

                  <h2 className="cs-selected-banner-title">{selectedTitle.title}</h2>

                  <div className="cs-selected-banner-meta">
                    <span className="cs-meta-year">{selectedTitle.year}</span>
                    <span className="cs-meta-dot">•</span>
                    <span className="cs-meta-duration">{formatDurationOrSeasons(selectedTitle)}</span>
                    <span className="cs-meta-dot">•</span>
                    <span className="cs-rating-pill">{selectedTitle.ageRating}</span>
                    <span className="cs-meta-dot">•</span>
                    <span className="cs-imdb-rating">
                      <Star size={13} fill="#eab308" color="#eab308" />
                      {selectedTitle.vote_average ? selectedTitle.vote_average.toFixed(1) : '8.3'} IMDb
                    </span>
                  </div>

                  <div className="cs-selected-banner-genres">
                    {(selectedTitle.genres || ['Drama', 'Thriller']).slice(0, 4).map((g) => (
                      <span key={g} className="cs-genre-pill">{g}</span>
                    ))}
                  </div>

                  <p className="cs-selected-banner-overview">
                    {selectedTitle.description}
                  </p>
                </div>

                <div className="cs-selected-banner-action-area">
                  <button
                    type="button"
                    id="make-watch-party-btn"
                    className="cs-make-party-primary-btn"
                    onClick={() => setStep(STEP_SETTINGS)}
                  >
                    <span>MAKE WATCH PARTY</span>
                    <ChevronRight size={20} />
                  </button>

                  <button
                    type="button"
                    className="cs-banner-details-btn"
                    onClick={() => setDetailsModalTitle(selectedTitle)}
                  >
                    <Info size={15} />
                    <span>Full Details</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="cs-selected-banner-empty">
                <AlertCircle size={28} color="#e50914" />
                <span>Select a movie or series to continue.</span>
              </div>
            )}
          </div>

          {/* Search & Sort Controls Row */}
          <div className="cs-search-sort-row">
            <div className="cs-search-wrap">
              <Search size={16} className="cs-search-icon" />
              <input
                id="title-search"
                className="cs-search-input"
                type="text"
                placeholder="Search for movies, TV shows, or genres…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="cs-sort-wrap">
              <Filter size={14} className="cs-sort-icon" />
              <span className="cs-sort-label">Sort by</span>
              <select
                id="sort-by-select"
                className="cs-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="Popular">Popular</option>
                <option value="Top Rated">Top Rated</option>
                <option value="Newest">Newest</option>
                <option value="Alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="cs-categories-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cs-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* CATALOG MAIN CONTENT AREA */}
          <div className="cs-step1-content-layout">
            <div className="cs-catalog-full">
              {loadingCatalog ? (
                <div className="cs-loader-wrap">
                  <Loader size={32} className="spin-icon" />
                  <span>Loading movie and TV catalog…</span>
                </div>
              ) : searchResults ? (
                /* Search Results Horizontal Carousel Row */
                <MediaCarouselRow
                  title={`Search Results for "${searchQuery}"`}
                  icon={Search}
                  iconClass="red"
                  items={filterAndSortList(searchResults)}
                  selectedTitleId={selectedTitle?._id || selectedTitle?.id}
                  onSelectTitle={selectTitle}
                />
              ) : (
                <>
                  {/* Row 1: Popular Movies */}
                  {(selectedCategory === 'All' || selectedCategory === 'Movies' || filterAndSortList(popularMovies).length > 0) && (
                    <MediaCarouselRow
                      title="Popular Movies"
                      icon={Film}
                      iconClass="red"
                      items={filterAndSortList(popularMovies)}
                      selectedTitleId={selectedTitle?._id || selectedTitle?.id}
                      onSelectTitle={selectTitle}
                    />
                  )}

                  {/* Row 2: Popular TV Shows */}
                  {(selectedCategory === 'All' || selectedCategory === 'TV Shows' || filterAndSortList(popularTV).length > 0) && (
                    <MediaCarouselRow
                      title="Popular TV Shows"
                      icon={Tv}
                      iconClass="purple"
                      items={filterAndSortList(popularTV)}
                      selectedTitleId={selectedTitle?._id || selectedTitle?.id}
                      onSelectTitle={selectTitle}
                    />
                  )}

                  {/* Row 3: Upcoming Releases */}
                  {(selectedCategory === 'All' || filterAndSortList(upcomingMovies).length > 0) && (
                    <MediaCarouselRow
                      title="Upcoming Releases"
                      icon={Sparkles}
                      iconClass="gold"
                      items={filterAndSortList(upcomingMovies)}
                      selectedTitleId={selectedTitle?._id || selectedTitle?.id}
                      onSelectTitle={selectTitle}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Main Two-Column Room Settings Experience ── */}
      {step === STEP_SETTINGS && selectedTitle && (
        <div className="cs-main-content">
          <div className="cs-grid-container">
            {/* LEFT COLUMN: CONFIGURATION */}
            <div className="cs-left-panel">
              {/* Selected Title summary */}
              <div className="cs-card cs-selected-card">
                <div className="cs-card-header">
                  <Film size={15} className="cs-header-icon" />
                  <span>Selected Title</span>
                </div>
                <div className="cs-selected-body">
                  <div className="cs-selected-content">
                    <img
                      src={selectedTitle.poster || FALLBACK_CATALOG[0].poster}
                      alt={selectedTitle.title}
                      className="cs-selected-poster"
                    />
                    <div className="cs-selected-details">
                      <h3 className="cs-selected-title-text">{selectedTitle.title}</h3>
                      <div className="cs-selected-meta-row">
                        <span>{selectedTitle.year || '2023'}</span>
                        <span className="cs-meta-dot">•</span>
                        <span>{formatDurationOrSeasons(selectedTitle)}</span>
                        <span className="cs-meta-dot">•</span>
                        <span className="cs-rating-pill">{selectedTitle.ageRating || 'R'}</span>
                        <span className="cs-meta-dot">•</span>
                        <span className="cs-imdb-rating">
                          <Star size={13} fill="#eab308" color="#eab308" />
                          {selectedTitle.vote_average ? selectedTitle.vote_average.toFixed(1) : '8.3'} (IMDb)
                        </span>
                      </div>
                      <p className="cs-selected-overview">{selectedTitle.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What do you want to watch? */}
              <div className="cs-card">
                <div className="cs-card-header">
                  <span className="cs-header-emoji">🍿</span>
                  <span>What do you want to watch?</span>
                </div>
                <div className="cs-media-grid">
                  <button
                    type="button"
                    id="media-choice-movie"
                    className={`cs-media-btn ${mediaChoice === 'movie' ? 'active' : ''}`}
                    onClick={() => setMediaChoice('movie')}
                  >
                    <div className="cs-media-icon">🍿</div>
                    <div className="cs-media-info">
                      <strong className="cs-media-label">Full Feature / Movie</strong>
                      <span className="cs-media-sub">Watch the complete title together</span>
                    </div>
                    {mediaChoice === 'movie' && (
                      <div className="cs-check-badge">
                        <Check size={11} color="#fff" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    id="media-choice-trailer"
                    className={`cs-media-btn ${mediaChoice === 'trailer' ? 'active' : ''}`}
                    onClick={() => setMediaChoice('trailer')}
                  >
                    <div className="cs-media-icon">🎬</div>
                    <div className="cs-media-info">
                      <strong className="cs-media-label">Official Trailer</strong>
                      <span className="cs-media-sub">Watch official YouTube trailer</span>
                    </div>
                    {mediaChoice === 'trailer' && (
                      <div className="cs-check-badge">
                        <Check size={11} color="#fff" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Streaming Servers */}
              {mediaChoice === 'movie' && (
                <div className="cs-card">
                  <div className="cs-card-header">
                    <Server size={15} className="cs-header-icon" />
                    <span>Select Streaming Server / Provider</span>
                  </div>
                  <div className="cs-servers-grid">
                    {SERVERS.map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        id={`${srv.id}-btn`}
                        className={`cs-server-card ${selectedServer === srv.id ? 'active' : ''}`}
                        onClick={() => setSelectedServer(srv.id)}
                      >
                        <div className="cs-server-top">
                          <span className="cs-server-name">
                            {srv.icon} {srv.name}
                          </span>
                          {srv.badge && (
                            <span className="cs-recommended-tag">{srv.badge}</span>
                          )}
                          {selectedServer === srv.id && (
                            <div className="cs-check-badge cs-check-badge-sm">
                              <Check size={10} color="#fff" />
                            </div>
                          )}
                        </div>
                        <span className="cs-server-provider">{srv.provider}</span>
                        <ul className="cs-server-bullets">
                          {srv.bullets.map((b, idx) => (
                            <li key={idx}>
                              <Check size={11} className="cs-bullet-icon" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Settings */}
              <div className="cs-card">
                <div className="cs-card-header">
                  <span className="cs-header-emoji">⚙️</span>
                  <span>Room Settings</span>
                </div>
                <div className="cs-room-settings-row">
                  <div className="cs-field-group">
                    <label htmlFor="room-name" className="cs-field-label">
                      <Edit2 size={12} /> Room Name
                    </label>
                    <input
                      id="room-name"
                      type="text"
                      className="cs-compact-input"
                      value={roomName}
                      maxLength={80}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Room Name..."
                    />
                  </div>

                  <div className="cs-field-group">
                    <label className="cs-field-label">
                      {isPrivate ? <Lock size={12} /> : <Unlock size={12} />} Privacy
                    </label>
                    <div className="cs-privacy-box">
                      <button
                        type="button"
                        id="toggle-private-btn"
                        className={`cs-privacy-option ${!isPrivate ? 'active' : ''}`}
                        onClick={() => setIsPrivate(false)}
                      >
                        {!isPrivate && <Check size={10} className="cs-option-check" />}
                        <span>Public</span>
                        <small>Discoverable</small>
                      </button>
                      <button
                        type="button"
                        id="toggle-public-btn"
                        className={`cs-privacy-option ${isPrivate ? 'active' : ''}`}
                        onClick={() => setIsPrivate(true)}
                      >
                        {isPrivate && <Check size={10} className="cs-option-check" />}
                        <span>Private</span>
                        <small>Invite only</small>
                      </button>
                    </div>
                  </div>

                  <div className="cs-field-group">
                    <label htmlFor="max-participants" className="cs-field-label">
                      <Users size={12} /> Max Participants
                    </label>
                    <select
                      id="max-participants"
                      className="cs-compact-select"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    >
                      {PARTICIPANT_OPTIONS.map((num) => (
                        <option key={num} value={num}>
                          {num} people
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cs-field-group">
                    <label htmlFor="start-position" className="cs-field-label">
                      <Clock size={12} /> Start Position
                    </label>
                    <select
                      id="start-position"
                      className="cs-compact-select"
                      value={startPosition}
                      onChange={(e) => setStartPosition(e.target.value)}
                    >
                      {START_POSITIONS.map((pos) => (
                        <option key={pos.id} value={pos.id}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* AI & Audience Voting Split Row */}
              <div className="cs-bottom-split">
                <div className="cs-card cs-bottom-ai-card">
                  <div className="cs-card-header">
                    <Sparkles size={14} className="cs-header-icon" />
                    <span>AI Co-Pilot Verbosity</span>
                  </div>
                  <div className="cs-verbosity-grid">
                    {VERBOSITY_OPTIONS.map(({ val, icon: IconComp, label, desc }) => (
                      <button
                        key={val}
                        type="button"
                        id={`verbosity-${val}`}
                        className={`cs-verbosity-card ${aiVerbosity === val ? 'active' : ''}`}
                        onClick={() => setAiVerbosity(val)}
                      >
                        <IconComp size={16} className="cs-verbosity-icon" />
                        <span className="cs-verbosity-name">{label}</span>
                        <span className="cs-verbosity-desc">{desc}</span>
                        {aiVerbosity === val && (
                          <div className="cs-check-badge cs-check-badge-sm">
                            <Check size={9} color="#fff" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cs-card cs-bottom-voting-card">
                  <div className="cs-voting-box">
                    <div>
                      <div className="cs-card-header" style={{ marginBottom: '0.2rem' }}>
                        <Vote size={14} className="cs-header-icon" />
                        <span>Audience Voting</span>
                      </div>
                      <p className="cs-voting-hint">Let viewers vote on choices</p>
                    </div>
                    <button
                      type="button"
                      id="voting-toggle-btn"
                      className={`cs-switch ${votingEnabled ? 'on' : 'off'}`}
                      onClick={() => setVotingEnabled(!votingEnabled)}
                      aria-label="Toggle audience voting"
                    >
                      <div className="cs-switch-knob" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: WATCH SPACE PREVIEW */}
            <div className="cs-right-panel">
              <div className="cs-preview-container">
                <div className="cs-preview-title-row">
                  <Eye size={18} className="cs-preview-header-icon" />
                  <div>
                    <h4 className="cs-preview-heading">Watch Space Preview</h4>
                    <span className="cs-preview-sub">Here's how your room will launch.</span>
                  </div>
                </div>

                <div className="cs-preview-artwork-box">
                  <img
                    src={selectedTitle.backdropUrl || selectedTitle.poster}
                    alt={selectedTitle.title}
                    className="cs-preview-artwork-img"
                  />
                  <div className="cs-preview-artwork-gradient" />
                  <div className="cs-preview-artwork-badges">
                    <span className="cs-preview-pill">
                      {mediaChoice === 'movie' ? '🍿 Full Feature' : '🎬 Trailer'}
                    </span>
                    {mediaChoice === 'movie' && (
                      <span className="cs-preview-pill">
                        {selectedServerObj.icon} {selectedServerObj.name}
                      </span>
                    )}
                  </div>
                  <div className="cs-preview-artwork-info">
                    <h5 className="cs-preview-movie-title">{selectedTitle.title}</h5>
                    <span className="cs-preview-movie-meta">
                      {selectedTitle.year} • {formatDurationOrSeasons(selectedTitle)} • ⭐ {selectedTitle.vote_average ? selectedTitle.vote_average.toFixed(1) : '8.3'}
                    </span>
                  </div>
                </div>

                <div className="cs-preview-summary-list">
                  <div className="cs-preview-row">
                    <span className="cs-preview-key">💬 Room Name</span>
                    <span className="cs-preview-val cs-truncate">{roomName || 'Untitled Watch Space'}</span>
                  </div>
                  <div className="cs-preview-row">
                    <span className="cs-preview-key">🔒 Privacy</span>
                    <span className="cs-preview-val">
                      {isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                  <div className="cs-preview-row">
                    <span className="cs-preview-key">👥 Max Participants</span>
                    <span className="cs-preview-val">{maxParticipants} people</span>
                  </div>
                  <div className="cs-preview-row">
                    <span className="cs-preview-key">🕒 Start Position</span>
                    <span className="cs-preview-val">{selectedPositionObj.label}</span>
                  </div>
                  <div className="cs-preview-row">
                    <span className="cs-preview-key">🤖 AI Co-Pilot</span>
                    <span className="cs-preview-val">{aiVerbosity}</span>
                  </div>
                </div>

                <button
                  type="button"
                  id="create-space-btn"
                  className="cs-primary-cta"
                  disabled={!roomName.trim() || creating}
                  onClick={handleCreate}
                >
                  {creating ? (
                    <>
                      <Loader size={18} className="spin-icon" />
                      <span>Creating Watch Space…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Create Watch Space</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Launch Screen Reference Redesign ── */}
      {step === STEP_LAUNCH && createdSpace && (
        <div className="cs-launch-container">
          {/* Dynamic Hero Backdrop */}
          {(createdSpace.titleId?.backdropUrl || selectedTitle?.backdropUrl) && (
            <div
              className="cs-cinematic-bg-hero"
              style={{ backgroundImage: `url(${createdSpace.titleId?.backdropUrl || selectedTitle?.backdropUrl})` }}
            />
          )}

          {/* Success Header */}
          <div className="cs-launch-header">
            <div className="cs-launch-check-circle">
              <Check size={32} color="#fff" />
            </div>
            <h1 className="cs-launch-title-text">
              Watch Space <span className="cs-red-accent">Created!</span>
            </h1>
            <p className="cs-launch-subtitle-text">
              Your watch space is ready. Share the invite code or link with your friends and start watching together!
            </p>
          </div>

          {/* Watch Space Summary Card */}
          <div className="cs-launch-summary-card">
            <img
              src={createdSpace.titleId?.poster || selectedTitle?.poster || FALLBACK_CATALOG[0].poster}
              alt={createdSpace.titleId?.title || selectedTitle?.title}
              className="cs-launch-card-poster"
            />
            <div className="cs-launch-card-info">
              <h2 className="cs-launch-movie-heading">
                {createdSpace.titleId?.title || selectedTitle?.title}
              </h2>
              <h4 className="cs-launch-room-subheading">
                {createdSpace.settings?.roomName || roomName}
              </h4>

              {/* Metadata Pills */}
              <div className="cs-launch-pills-row">
                <span className="cs-launch-pill">
                  {(createdSpace.titleId?.type || selectedTitle?.type) === 'tv' ? '📺 TV Series' : '🎬 Movie'}
                </span>
                <span className="cs-launch-pill">
                  <Users size={12} /> {createdSpace.settings?.maxParticipants || maxParticipants} max
                </span>
                <span className="cs-launch-pill">
                  {createdSpace.settings?.isPrivate ? <Lock size={12} /> : <Unlock size={12} />}
                  {createdSpace.settings?.isPrivate ? ' Private' : ' Public'}
                </span>
                <span className="cs-launch-pill">
                  <MessageSquare size={12} /> {(createdSpace.settings?.aiVerbosity || aiVerbosity).charAt(0).toUpperCase() + (createdSpace.settings?.aiVerbosity || aiVerbosity).slice(1)}
                </span>
              </div>

              {/* Overview Description */}
              <p className="cs-launch-overview">
                {createdSpace.titleId?.description || selectedTitle?.description || 'A gripping experience to watch together with live synchronization and AI co-pilot.'}
              </p>

              {/* Genre Tags */}
              <div className="cs-launch-genres-row">
                {(createdSpace.titleId?.genres || selectedTitle?.genres || ['Drama', 'Thriller']).slice(0, 4).map((g) => (
                  <span key={g} className="cs-genre-pill">{g}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Invite Code & Link Grid */}
          <div className="cs-launch-invite-grid">
            {/* Left Card: INVITE CODE */}
            <div className="cs-launch-invite-card code-card">
              <div className="cs-invite-card-header">
                <div className="cs-invite-icon-circle key-icon">
                  <Key size={14} color="#e50914" />
                </div>
                <div>
                  <h4 className="cs-invite-card-title">INVITE CODE</h4>
                  <p className="cs-invite-card-sub">Share this code with your friends</p>
                </div>
              </div>

              <div className="cs-invite-code-boxes">
                {(createdSpace.inviteCode || '4QSSVK').split('').map((ch, i) => (
                  <div key={i} className="cs-code-char-box">
                    {ch}
                  </div>
                ))}
                <button
                  type="button"
                  id="copy-invite-code-btn"
                  className="cs-code-copy-btn"
                  onClick={() => copyText(createdSpace.inviteCode, 'code')}
                  aria-label="Copy invite code"
                  title="Copy code"
                >
                  {copied === 'code' ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Right Card: INVITE LINK */}
            <div className="cs-launch-invite-card link-card">
              <div className="cs-invite-card-header">
                <div className="cs-invite-icon-circle link-icon">
                  <ExternalLink size={14} color="#aaa" />
                </div>
                <div>
                  <h4 className="cs-invite-card-title">INVITE LINK</h4>
                  <p className="cs-invite-card-sub">Share this link to invite friends directly</p>
                </div>
              </div>

              <div className="cs-invite-link-row">
                <input
                  type="text"
                  readOnly
                  value={createdSpace.inviteLink || `${window.location.origin}/join?code=${createdSpace.inviteCode}`}
                  className="cs-invite-link-input"
                />
                <button
                  type="button"
                  id="copy-invite-link-btn"
                  className="cs-link-btn"
                  onClick={() => copyText(createdSpace.inviteLink || `${window.location.origin}/join?code=${createdSpace.inviteCode}`, 'link')}
                  aria-label="Copy invite link"
                  title="Copy link"
                >
                  {copied === 'link' ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                </button>
                <a
                  href={createdSpace.inviteLink || `${window.location.origin}/join?code=${createdSpace.inviteCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cs-link-btn"
                  aria-label="Open invite link"
                  title="Open link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Feature Cards Grid */}
          <div className="cs-launch-features-grid">
            <div className="cs-feature-card">
              <div className="cs-feature-icon-box purple">
                <Users size={16} color="#c084fc" />
              </div>
              <div>
                <strong className="cs-feature-name">Invite Friends</strong>
                <span className="cs-feature-desc">Share the code or link with your friends</span>
              </div>
            </div>

            <div className="cs-feature-card">
              <div className="cs-feature-icon-box green">
                <Play size={16} color="#4ade80" fill="#4ade80" />
              </div>
              <div>
                <strong className="cs-feature-name">Start Watching</strong>
                <span className="cs-feature-desc">Click below to enter the watch room</span>
              </div>
            </div>

            <div className="cs-feature-card">
              <div className="cs-feature-icon-box blue">
                <MessageSquare size={16} color="#60a5fa" />
              </div>
              <div>
                <strong className="cs-feature-name">Chat Together</strong>
                <span className="cs-feature-desc">Chat, react and enjoy in real-time</span>
              </div>
            </div>

            <div className="cs-feature-card">
              <div className="cs-feature-icon-box gold">
                <Sparkles size={16} color="#facc15" />
              </div>
              <div>
                <strong className="cs-feature-name">AI Co-Pilot</strong>
                <span className="cs-feature-desc">Get insights, trivia and fun facts while watching</span>
              </div>
            </div>
          </div>

          {/* Primary CTA: Enter Watch Room */}
          <div className="cs-launch-cta-wrap">
            <button
              type="button"
              id="enter-room-btn"
              className="cs-launch-primary-cta"
              onClick={() => navigate(`/space/${createdSpace._id}`)}
            >
              <Play size={18} fill="#fff" color="#fff" />
              <span>Enter Watch Room</span>
            </button>
          </div>
        </div>
      )}

      {/* Optional Details Modal */}
      {detailsModalTitle && (
        <div className="cs-modal-overlay" onClick={() => setDetailsModalTitle(null)}>
          <div className="cs-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <h3>{detailsModalTitle.title}</h3>
              <button className="cs-modal-close" onClick={() => setDetailsModalTitle(null)}>✕</button>
            </div>
            <div className="cs-modal-body">
              <img src={detailsModalTitle.backdropUrl || detailsModalTitle.poster} alt="" className="cs-modal-backdrop" />
              <p>{detailsModalTitle.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Sticky Selected Title Bar — Always visible when title is selected in Step 1 */}
      {selectedTitle && step === STEP_PICK_TITLE && (
        <div className="cs-mobile-selected-bar">
          <div className="cs-mobile-selected-info">
            <img src={selectedTitle.poster} alt={selectedTitle.title} className="cs-mobile-thumb" />
            <div className="cs-mobile-text">
              <span className="cs-mobile-title">{selectedTitle.title}</span>
              <span className="cs-mobile-sub">{selectedTitle.year} • {formatDurationOrSeasons(selectedTitle)}</span>
            </div>
          </div>
          <button
            type="button"
            id="mobile-continue-btn"
            className="cs-mobile-continue-btn"
            onClick={() => setStep(STEP_SETTINGS)}
          >
            <span>MAKE WATCH PARTY</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Catalog Card Component matching reference design ──
const CatalogCard = ({ item, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      className={`cs-catalog-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="cs-card-poster-wrap">
        <img src={item.poster} alt={item.title} className="cs-card-poster-img" loading="lazy" />
        <button type="button" className={`cs-card-add-btn ${isSelected ? 'selected' : ''}`}>
          {isSelected ? <Check size={14} color="#fff" /> : <Plus size={14} color="#fff" />}
        </button>
      </div>
      <div className="cs-card-info">
        <div className="cs-card-title-text">{item.title}</div>
        <div className="cs-card-meta-line">
          <span>{item.year}</span>
          <span className="cs-meta-dot">•</span>
          <span>{formatDurationOrSeasons(item)}</span>
        </div>
        <div className="cs-card-rating">
          <Star size={12} fill="#eab308" color="#eab308" />
          <span>{item.vote_average ? item.vote_average.toFixed(1) : '8.3'}</span>
        </div>
      </div>
    </button>
  );
};

// ── Reusable Media Carousel Row with Left/Right Scroll Controls ──
const MediaCarouselRow = ({ title, icon: Icon, iconClass, items, selectedTitleId, onSelectTitle }) => {
  const rowRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScroll = React.useCallback(() => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = rowRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, items]);

  const scrollByAmount = (direction) => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="cs-catalog-section">
      <div className="cs-row-header">
        <h3 className="cs-row-title">
          {Icon && <Icon size={18} className={`cs-row-title-icon ${iconClass || ''}`} />}
          <span>{title}</span>
        </h3>
      </div>

      <div className="cs-carousel-wrapper">
        <button
          type="button"
          className={`cs-carousel-arrow left ${!canScrollLeft ? 'hidden' : ''}`}
          onClick={() => scrollByAmount('left')}
          aria-label="Scroll Left"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="cs-cards-row" ref={rowRef}>
          {items.map((item) => (
            <CatalogCard
              key={item._id || item.id}
              item={item}
              isSelected={String(selectedTitleId) === String(item._id || item.id)}
              onSelect={() => onSelectTitle(item)}
            />
          ))}
        </div>

        <button
          type="button"
          className={`cs-carousel-arrow right ${!canScrollRight ? 'hidden' : ''}`}
          onClick={() => scrollByAmount('right')}
          aria-label="Scroll Right"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default CreateWatchSpace;
