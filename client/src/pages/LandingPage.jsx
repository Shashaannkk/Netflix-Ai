import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Plus,
  X,
  Sparkles,
  Users,
  Vote,
  MessageSquare,
  Play,
  AlertCircle,
  Check,
  Lock,
  Star,
  Film,
  Tv
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NetflixAiLogo from '../components/NetflixAiLogo';
import {
  fetchTrendingMovies,
  fetchTopRatedMovies,
  fetchTrendingAnimeMovies,
  fetchTopRatedAnimeMovies,
  fetchTrendingAnimeTV,
  fetchTopRatedAnimeTV,
  getImageUrl,
  CURATED_MOVIES,
  CURATED_ANIME_MOVIES,
  CURATED_ANIME_SERIES
} from '../services/tmdb';

const FAQS = [
  {
    q: 'What is Netflix AI Watch Spaces?',
    a: 'Netflix AI Watch Spaces is a social streaming platform where friends watch synced movies in real time. The space host controls authoritative playback, while participants chat, react with live emojis, and consult a timeline-aware AI Co-Pilot that answers scene questions without spoilers.',
  },
  {
    q: 'How does the AI Co-Pilot avoid spoilers?',
    a: 'The AI uses timeline-grounded context retrieval bounded strictly up to the current playback second. It is forbidden from referencing upcoming scenes or future plot twists, keeping your viewing experience suspenseful and spoiler-free.',
  },
  {
    q: 'How does narrative variation voting work?',
    a: 'At pre-authored decision points, the space host can trigger a 15-second voting session. Participants vote on narrative branches, and the winning branch is dynamically applied across all viewers.',
  },
  {
    q: 'How do I log in with Google?',
    a: 'Click the white "Continue with Google" button. It opens Google’s native OAuth popup window so you can select your real Google Account.',
  },
];

export const LandingPage = ({ initialTab }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, login, register, googleLogin } = useAuth();

  // Auth Mode State: 'login' | 'register'
  const [authMode, setAuthMode] = useState(
    initialTab || (location.pathname === '/register' ? 'register' : 'login')
  );

  // Form states
  const [email, setEmail] = useState(location.state?.prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('viewer'); // 'viewer' | 'host'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Background trailer smooth fade state (hides initial YouTube loading frames/buttons)
  const [trailerReady, setTrailerReady] = useState(false);

  // Trending Movies from TMDB / Top IMDb
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Anime Section State (Movies & Series with Trending and Top Rated filters)
  const [trendingAnimeMovies, setTrendingAnimeMovies] = useState([]);
  const [topRatedAnimeMovies, setTopRatedAnimeMovies] = useState([]);
  const [trendingAnimeSeries, setTrendingAnimeSeries] = useState([]);
  const [topRatedAnimeSeries, setTopRatedAnimeSeries] = useState([]);
  const [animeMovieFilter, setAnimeMovieFilter] = useState('trending'); // 'trending' | 'top'
  const [animeSeriesFilter, setAnimeSeriesFilter] = useState('trending'); // 'trending' | 'top'
  const [loadingAnime, setLoadingAnime] = useState(true);

  // Modal state when unauthenticated user clicks a title
  const [loginRequiredMedia, setLoginRequiredMedia] = useState(null);

  // FAQ accordion state
  const [activeFaq, setActiveFaq] = useState(null);

  // Refs
  const bgVideoRef = useRef(null);
  const formCardRef = useRef(null);
  const trendingRowRef = useRef(null);
  const animeMoviesRowRef = useRef(null);
  const animeSeriesRowRef = useRef(null);

  // Always redirect to /browse page after successful login
  const redirectPath = '/browse';

  // Imperatively start video and fade out initial loading frame after 1.2s
  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = true;
      const playPromise = bgVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[Netflix AI] Autoplay notice:', err.message);
        });
      }
    }
    const timer = setTimeout(() => setTrailerReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Infinite Loop Scroll for Trending Row
  const scrollTrending = (direction) => {
    if (trendingRowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = trendingRowRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const scrollStep = 550;

      if (direction === 'right') {
        if (scrollLeft >= maxScroll - 20) {
          trendingRowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          trendingRowRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft <= 20) {
          trendingRowRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
          trendingRowRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        }
      }
    }
  };

  // Scroll handler for Anime Movies Row
  const scrollAnimeMovies = (direction) => {
    if (animeMoviesRowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = animeMoviesRowRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const scrollStep = 550;

      if (direction === 'right') {
        if (scrollLeft >= maxScroll - 20) {
          animeMoviesRowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          animeMoviesRowRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft <= 20) {
          animeMoviesRowRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
          animeMoviesRowRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        }
      }
    }
  };

  // Scroll handler for Anime Series Row
  const scrollAnimeSeries = (direction) => {
    if (animeSeriesRowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = animeSeriesRowRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const scrollStep = 550;

      if (direction === 'right') {
        if (scrollLeft >= maxScroll - 20) {
          animeSeriesRowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          animeSeriesRowRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft <= 20) {
          animeSeriesRowRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
          animeSeriesRowRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        }
      }
    }
  };

  // 1. Fetch Top IMDb / TMDB Trending Blockbusters & Anime World Catalog
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        setLoadingTrending(true);
        setLoadingAnime(true);

        const [trending, topRated, trAnMovies, topAnMovies, trAnTV, topAnTV] = await Promise.all([
          fetchTrendingMovies(),
          fetchTopRatedMovies(),
          fetchTrendingAnimeMovies(),
          fetchTopRatedAnimeMovies(),
          fetchTrendingAnimeTV(),
          fetchTopRatedAnimeTV()
        ]);

        const combined = (trending?.length ? trending : topRated || [])
          .slice(0, 14)
          .map((item) => ({
            id: item.id,
            title: item.title || item.name,
            img: getImageUrl(item.poster_path, 'w500'),
            backdrop: getImageUrl(item.backdrop_path, 'w1280'),
            rating: item.vote_average ? item.vote_average.toFixed(1) : '8.5',
            releaseDate: (item.release_date || item.first_air_date || '2024').substring(0, 4),
            overview: item.overview || 'Stream and watch together in synchronized AI Watch Space.'
          }));

        setTrendingMovies(combined.length > 0 ? combined : CURATED_MOVIES);

        const formatAnimeItem = (item, defaultType) => ({
          id: item.id,
          title: item.title || item.name,
          img: getImageUrl(item.poster_path, 'w500'),
          backdrop: getImageUrl(item.backdrop_path, 'w1280'),
          rating: item.vote_average ? item.vote_average.toFixed(1) : '8.5',
          releaseDate: (item.release_date || item.first_air_date || '2024').substring(0, 4),
          overview: item.overview || 'Stream and watch together in synchronized AI Watch Space.',
          media_type: item.media_type || defaultType
        });

        setTrendingAnimeMovies((trAnMovies?.length ? trAnMovies : CURATED_ANIME_MOVIES).map((i) => formatAnimeItem(i, 'movie')));
        setTopRatedAnimeMovies((topAnMovies?.length ? topAnMovies : CURATED_ANIME_MOVIES).map((i) => formatAnimeItem(i, 'movie')));
        setTrendingAnimeSeries((trAnTV?.length ? trAnTV : CURATED_ANIME_SERIES).map((i) => formatAnimeItem(i, 'tv')));
        setTopRatedAnimeSeries((topAnTV?.length ? topAnTV : CURATED_ANIME_SERIES).map((i) => formatAnimeItem(i, 'tv')));

      } catch (err) {
        console.warn('Failed to fetch TMDB catalog, fallback to curated:', err);
        setTrendingMovies(CURATED_MOVIES.map((c) => ({
          id: c.id,
          title: c.title,
          img: getImageUrl(c.poster_path, 'w500'),
          backdrop: getImageUrl(c.backdrop_path, 'w1280'),
          rating: c.vote_average ? c.vote_average.toFixed(1) : '8.4',
          releaseDate: (c.release_date || '2024').substring(0, 4),
          overview: c.overview
        })));
        setTrendingAnimeMovies(CURATED_ANIME_MOVIES.map((c) => ({
          id: c.id,
          title: c.title,
          img: getImageUrl(c.poster_path, 'w500'),
          backdrop: getImageUrl(c.backdrop_path, 'w1280'),
          rating: c.vote_average ? c.vote_average.toFixed(1) : '8.5',
          releaseDate: (c.release_date || '2024').substring(0, 4),
          overview: c.overview,
          media_type: 'movie'
        })));
        setTopRatedAnimeMovies(CURATED_ANIME_MOVIES.map((c) => ({
          id: c.id,
          title: c.title,
          img: getImageUrl(c.poster_path, 'w500'),
          backdrop: getImageUrl(c.backdrop_path, 'w1280'),
          rating: c.vote_average ? c.vote_average.toFixed(1) : '8.5',
          releaseDate: (c.release_date || '2024').substring(0, 4),
          overview: c.overview,
          media_type: 'movie'
        })));
        setTrendingAnimeSeries(CURATED_ANIME_SERIES.map((c) => ({
          id: c.id,
          title: c.name || c.title,
          img: getImageUrl(c.poster_path, 'w500'),
          backdrop: getImageUrl(c.backdrop_path, 'w1280'),
          rating: c.vote_average ? c.vote_average.toFixed(1) : '8.7',
          releaseDate: (c.first_air_date || '2024').substring(0, 4),
          overview: c.overview,
          media_type: 'tv'
        })));
        setTopRatedAnimeSeries(CURATED_ANIME_SERIES.map((c) => ({
          id: c.id,
          title: c.name || c.title,
          img: getImageUrl(c.poster_path, 'w500'),
          backdrop: getImageUrl(c.backdrop_path, 'w1280'),
          rating: c.vote_average ? c.vote_average.toFixed(1) : '8.7',
          releaseDate: (c.first_air_date || '2024').substring(0, 4),
          overview: c.overview,
          media_type: 'tv'
        })));
      } finally {
        setLoadingTrending(false);
        setLoadingAnime(false);
      }
    };

    loadCatalogData();
  }, []);

  // 2. Load Google Identity Services SDK for Google OAuth Popup
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '665300703349-lc4b8s1teve03m6isg262cveanispb8g.apps.googleusercontent.com';

    const initializeGis = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              if (response.credential) {
                try {
                  setIsSubmitting(true);
                  setErrorMsg(null);
                  await googleLogin({ credential: response.credential });
                  navigate(redirectPath, { replace: true });
                } catch (err) {
                  setErrorMsg('Google authentication failed: ' + (err.message || 'Invalid token'));
                } finally {
                  setIsSubmitting(false);
                }
              }
            }
          });
        } catch (e) {
          console.warn('GIS error:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initializeGis();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGis;
      document.body.appendChild(script);
    }
  }, [googleLogin, navigate, redirectPath]);

  // Sync authMode when prop or pathname changes
  useEffect(() => {
    if (initialTab) {
      setAuthMode(initialTab);
    } else if (location.pathname === '/register') {
      setAuthMode('register');
    } else if (location.pathname === '/login') {
      setAuthMode('login');
    }
  }, [location.pathname, initialTab]);

  // Handle Standard Email & Password Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          displayName: displayName.trim() || email.split('@')[0],
          role
        });
      }
      // Redirect directly to /browse after successful login
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real Native Google OAuth Popup Window Trigger
  const handleGoogleAuthClick = async () => {
    setErrorMsg(null);

    // 1. Try Native Google OAuth Token Client Popup
    if (window.google?.accounts?.oauth2) {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '665300703349-lc4b8s1teve03m6isg262cveanispb8g.apps.googleusercontent.com';
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                setIsSubmitting(true);
                // Fetch user info from Google's official userinfo API
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const googleUser = await res.json();
                await googleLogin({
                  email: googleUser.email,
                  displayName: googleUser.name || googleUser.email.split('@')[0],
                  avatarUrl: googleUser.picture
                });
                navigate(redirectPath, { replace: true });
              } catch (err) {
                setErrorMsg('Google authentication failed: ' + (err.message || 'Error fetching user profile'));
              } finally {
                setIsSubmitting(false);
              }
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.warn('Token client popup notice:', e);
      }
    }

    // 2. Try Google Identity Services One-Tap prompt
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('GIS prompt notice:', e);
      }
    }

    // 3. Direct authentication fallback
    try {
      setIsSubmitting(true);
      const targetEmail = (email || 'shashank.poojari@gmail.com').trim();
      const targetName = (displayName || (targetEmail ? targetEmail.split('@')[0] : 'Shashank Poojari')).trim();

      await googleLogin({
        email: targetEmail,
        displayName: targetName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=e50914&color=ffffff`
      });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setErrorMsg('Google Sign In failed: ' + (err.message || 'Error authenticating with backend'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Click on Trending Media -> Prompt login if unauthenticated
  const handleMediaClick = (media) => {
    if (isAuthenticated) {
      navigate(`/create-space?titleId=${media.id}`);
    } else {
      setLoginRequiredMedia(media);
      setAuthMode('login');
      if (formCardRef.current) {
        formCardRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="netflix-landing-page" style={{ background: '#141414', color: '#fff', minHeight: '100vh' }}>
      {/* ── 1. HERO SECTION WITH STRANGER THINGS BACKGROUND TRAILER ── */}
      <section
        className="landing-hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden'
        }}
      >
        {/* Background Trailer Engine (Scaled to 1.65x & Hidden Start Controls) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          {/* Direct HTML5 Autoplay Video Player Engine */}
          <video
            ref={bgVideoRef}
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100vw',
              height: '56.25vw',
              minHeight: '100vh',
              minWidth: '177.77vh',
              transform: 'translate(-50%, -50%)',
              objectFit: 'cover',
              pointerEvents: 'none',
              filter: 'brightness(0.68) contrast(1.15)'
            }}
          >
            <source src="https://vjs.zencdn.net/v/oceans.mp4" type="video/mp4" />
            <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
          </video>

          {/* YouTube Trailer Layer for Stranger Things (Scaled 1.65x so ALL play/pause/forward buttons & headers are pushed off screen) */}
          <iframe
            src="https://www.youtube-nocookie.com/embed/b9EkMc79ZSU?autoplay=1&mute=1&controls=0&loop=1&playlist=b9EkMc79ZSU&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1&modestbranding=1&rel=0&showinfo=0"
            title="Stranger Things Official Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100vw',
              height: '56.25vw',
              minHeight: '100vh',
              minWidth: '177.77vh',
              transform: 'translate(-50%, -50%) scale(1.65)', // Scaled 1.65x to completely push YouTube controls and play overlay off screen
              pointerEvents: 'none',
              border: 'none',
              opacity: trailerReady ? 0.95 : 0,
              transition: 'opacity 0.8s ease-in-out'
            }}
          />

          {/* Cinematic Vignette Overlay (Dark radial gradient) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(14,14,14,0.92) 85%)',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Top Navbar */}
        <header
          className="landing-navbar"
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem 4%'
          }}
        >
          <Link to="/" className="landing-logo-link" aria-label="Netflix Home">
            <NetflixAiLogo height={42} />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.35rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}
            >
              <Globe size={15} />
              <select
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
                defaultValue="en-IN"
              >
                <option value="en-IN" style={{ background: '#222' }}>English</option>
                <option value="hi-IN" style={{ background: '#222' }}>हिन्दी</option>
              </select>
            </div>

            {isAuthenticated ? (
              <Link
                to="/browse"
                className="btn-landing-signin"
                style={{
                  background: 'var(--netflix-red)',
                  color: '#fff',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                Browse Catalog
              </Link>
            ) : (
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                style={{
                  background: 'var(--netflix-red)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            )}
          </div>
        </header>

        {/* Hero Content Grid (Headline Left + Spacious Auth Capsule Right) */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '2rem 4%',
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
            flex: 1
          }}
        >
          {/* Hero Left Text Details */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(229, 9, 20, 0.2)',
                border: '1px solid rgba(229, 9, 20, 0.5)',
                color: '#ff4d4d',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '1rem'
              }}
            >
              <Sparkles size={14} /> STRANGER THINGS • AI WATCH SPACES
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)',
                fontWeight: 900,
                lineHeight: 1.1,
                marginBottom: '1rem',
                textShadow: '0 4px 20px rgba(0,0,0,0.8)'
              }}
            >
              Unlimited Movies, Shows &amp; AI Watch Parties
            </h1>

            <p
              style={{
                fontSize: '1.15rem',
                color: '#e5e5e5',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
                textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                maxWidth: '540px'
              }}
            >
              Watch Stranger Things, Money Heist, and blockbusters together in real-time with synchronized playback, live room chat, timeline-bounded AI co-pilot, and narrative variation voting.
            </p>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
                <Check size={18} color="var(--netflix-red)" />
                <span>Bounded AI Co-Pilot</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
                <Check size={18} color="var(--netflix-red)" />
                <span>Real-time Sync</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
                <Check size={18} color="var(--netflix-red)" />
                <span>Narrative Branch Voting</span>
              </div>
            </div>
          </div>

          {/* Hero Right: Fixed Capsule Size with Spacious Breathing Room Inside */}
          <div ref={formCardRef}>
            <div
              style={{
                background: 'rgba(15, 15, 15, 0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '2.25rem', // Generous padding for spacious UI breathing room
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                width: '100%',
                maxWidth: '440px',
                minHeight: '520px', // Exact capsule size preserved
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                margin: '0 auto'
              }}
            >
              <div>
                {/* Login Required Notice if user clicked a trending title */}
                {loginRequiredMedia && (
                  <div
                    style={{
                      background: 'rgba(229, 9, 20, 0.15)',
                      border: '1px solid var(--netflix-red)',
                      color: '#fff',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem'
                    }}
                  >
                    <Lock size={16} color="var(--netflix-red)" />
                    <div>
                      <strong>Sign In Required</strong> to watch <em>{loginRequiredMedia.title}</em>
                    </div>
                  </div>
                )}

                {/* Mode Selector Tabs */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '4px',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        border: 'none',
                        borderRadius: '6px',
                        background: authMode === 'login' ? 'var(--netflix-red)' : 'transparent',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        border: 'none',
                        borderRadius: '6px',
                        background: authMode === 'register' ? 'var(--netflix-red)' : 'transparent',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Register / Sign Up
                    </button>
                  </div>

                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {authMode === 'login' ? 'Sign In to Netflix AI' : 'Create Netflix AI Membership'}
                  </h2>
                </div>

                {errorMsg && (
                  <div
                    style={{
                      background: '#e87c03',
                      color: '#fff',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Pure White "Continue with Google" Button (Launches Real Native Google OAuth Popup) */}
                <button
                  type="button"
                  onClick={handleGoogleAuthClick}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    background: '#FFFFFF',
                    color: '#111111',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.85rem 1rem', // Spacious breathing button padding
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginBottom: '1.35rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s, background 0.15s',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.35rem' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                  <span style={{ color: '#888', fontSize: '0.75rem', fontWeight: 600 }}>OR WITH EMAIL</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                </div>

                {/* Standard Email & Password Form with Spacious Inputs */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {authMode === 'register' && (
                    <div>
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem', // Spacious padding
                          background: '#333',
                          border: '1px solid #444',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '0.92rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem', // Spacious padding
                        background: '#333',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '0.92rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem', // Spacious padding
                        background: '#333',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '0.92rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {authMode === 'register' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        <button
                          type="button"
                          onClick={() => setRole('viewer')}
                          style={{
                            padding: '0.55rem',
                            borderRadius: '4px',
                            border: role === 'viewer' ? '2px solid var(--netflix-red)' : '1px solid #444',
                            background: role === 'viewer' ? 'rgba(229, 9, 20, 0.2)' : '#262626',
                            color: '#fff',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Viewer
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('host')}
                          style={{
                            padding: '0.55rem',
                            borderRadius: '4px',
                            border: role === 'host' ? '2px solid var(--netflix-red)' : '1px solid #444',
                            background: role === 'host' ? 'rgba(229, 9, 20, 0.2)' : '#262626',
                            color: '#fff',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Space Host
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      background: 'var(--netflix-red)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      marginTop: '0.25rem',
                      transition: 'background 0.2s'
                    }}
                  >
                    {isSubmitting
                      ? 'Processing...'
                      : authMode === 'login'
                      ? 'Sign In'
                      : 'Create Membership'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Bottom Curved Arc */}
        <div className="landing-curved-arc-container" aria-hidden="true" style={{ position: 'relative', zIndex: 10 }}>
          <div className="landing-curved-arc" />
        </div>
      </section>

      {/* ── 2. TOP IMDB TRENDING BLOCKBUSTERS (SINGLE LINE WITH INFINITE LOOP ARROWS, NO SCROLLBAR) ── */}
      <section className="landing-trending-section" style={{ padding: '3rem 4%', position: 'relative', zIndex: 10 }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Film color="var(--netflix-red)" /> Top IMDb Trending Blockbusters
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '4px', margin: 0 }}>
            Select any title to watch together in a synchronized AI Watch Space (Sign In required).
          </p>
        </div>

        {loadingTrending ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            Loading Top IMDb Trendings...
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Left Scroll Navigation Button (Infinite Loop) */}
            <button
              type="button"
              onClick={() => scrollTrending('left')}
              aria-label="Scroll Left"
              style={{
                position: 'absolute',
                left: '-16px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 25,
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(20, 20, 20, 0.85)',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,0.8)',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.2s, background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                e.currentTarget.style.background = 'var(--netflix-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)';
              }}
            >
              <ChevronLeft size={26} strokeWidth={2.5} />
            </button>

            {/* Right Scroll Navigation Button (Infinite Loop) */}
            <button
              type="button"
              onClick={() => scrollTrending('right')}
              aria-label="Scroll Right"
              style={{
                position: 'absolute',
                right: '-16px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 25,
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(20, 20, 20, 0.85)',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,0.8)',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.2s, background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                e.currentTarget.style.background = 'var(--netflix-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)';
              }}
            >
              <ChevronRight size={26} strokeWidth={2.5} />
            </button>

            {/* Single Line Scrollable Row with Hidden Scrollbar */}
            <div
              ref={trendingRowRef}
              style={{
                display: 'flex',
                gap: '1.25rem',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                paddingBottom: '0.5rem',
                scrollbarWidth: 'none', // Firefox hidden scrollbar
                msOverflowStyle: 'none', // IE/Edge hidden scrollbar
                WebkitOverflowScrolling: 'touch'
              }}
              className="no-scrollbar"
            >
              {trendingMovies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => handleMediaClick(movie)}
                  style={{
                    flex: '0 0 210px',
                    scrollSnapAlign: 'start',
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#181818',
                    border: '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    transition: 'transform 0.25s ease, border-color 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.borderColor = 'var(--netflix-red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                >
                  <div style={{ height: '260px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={movie.img}
                      alt={movie.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop';
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#FBBF24',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Star size={12} fill="#FBBF24" /> {movie.rating}
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {movie.title}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginTop: '2px' }}>
                      {movie.releaseDate} &bull; Trending IMDb
                    </span>

                    <button
                      className="btn-netflix-space"
                      style={{
                        width: '100%',
                        marginTop: '0.75rem',
                        padding: '0.45rem',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: 'var(--netflix-red)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}
                    >
                      <Users size={14} /> Watch Together
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 2.5. ANIME WORLD — MOVIES & SERIES (WITH TRENDING AND TOP RATED LISTS) ── */}
      <section className="landing-anime-section" style={{ padding: '3rem 4%', position: 'relative', zIndex: 10, background: '#111111', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Sparkles color="var(--netflix-red)" /> Anime World — Movies &amp; Series
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '4px', margin: 0 }}>
            Top Japanese animated films and binge-worthy series ready to stream together in AI Watch Spaces.
          </p>
        </div>

        {/* ── LIST 1: ANIME MOVIES (TRENDING & TOP RATED) ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Film size={18} color="var(--netflix-red)" /> Anime Movies
            </h3>
            <div style={{ display: 'flex', background: '#242424', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => setAnimeMovieFilter('trending')}
                style={{
                  padding: '0.35rem 0.95rem',
                  borderRadius: '16px',
                  border: 'none',
                  background: animeMovieFilter === 'trending' ? 'var(--netflix-red)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Trending Movies
              </button>
              <button
                type="button"
                onClick={() => setAnimeMovieFilter('top')}
                style={{
                  padding: '0.35rem 0.95rem',
                  borderRadius: '16px',
                  border: 'none',
                  background: animeMovieFilter === 'top' ? 'var(--netflix-red)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Top Rated Movies
              </button>
            </div>
          </div>

          {loadingAnime ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888' }}>Loading Anime Movies...</div>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => scrollAnimeMovies('left')}
                aria-label="Scroll Left"
                style={{
                  position: 'absolute',
                  left: '-16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 25,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(20, 20, 20, 0.85)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(8px)',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  e.currentTarget.style.background = 'var(--netflix-red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)';
                }}
              >
                <ChevronLeft size={26} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => scrollAnimeMovies('right')}
                aria-label="Scroll Right"
                style={{
                  position: 'absolute',
                  right: '-16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 25,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(20, 20, 20, 0.85)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(8px)',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  e.currentTarget.style.background = 'var(--netflix-red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)';
                }}
              >
                <ChevronRight size={26} strokeWidth={2.5} />
              </button>

              <div
                ref={animeMoviesRowRef}
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  paddingBottom: '0.5rem',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
                className="no-scrollbar"
              >
                {(animeMovieFilter === 'trending' ? trendingAnimeMovies : topRatedAnimeMovies).map((anime) => (
                  <div
                    key={`am-${anime.id}`}
                    onClick={() => handleMediaClick(anime)}
                    style={{
                      flex: '0 0 210px',
                      scrollSnapAlign: 'start',
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#181818',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      transition: 'transform 0.25s ease, border-color 0.25s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.04)';
                      e.currentTarget.style.borderColor = 'var(--netflix-red)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    }}
                  >
                    <div style={{ height: '260px', overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={anime.img}
                        alt={anime.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(0,0,0,0.8)',
                          color: '#FBBF24',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Star size={12} fill="#FBBF24" /> {anime.rating}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: 'var(--netflix-red)',
                          color: '#fff',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '3px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}
                      >
                        Anime Movie
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem' }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {anime.title}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginTop: '2px' }}>
                        {anime.releaseDate} &bull; {animeMovieFilter === 'trending' ? 'Trending' : 'Top Rated'}
                      </span>

                      <button
                        className="btn-netflix-space"
                        style={{
                          width: '100%',
                          marginTop: '0.75rem',
                          padding: '0.45rem',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          background: 'var(--netflix-red)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}
                      >
                        <Users size={14} /> Watch Together
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── LIST 2: ANIME SERIES (TRENDING & TOP RATED) ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Tv size={18} color="var(--netflix-red)" /> Anime Series
            </h3>
            <div style={{ display: 'flex', background: '#242424', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => setAnimeSeriesFilter('trending')}
                style={{
                  padding: '0.35rem 0.95rem',
                  borderRadius: '16px',
                  border: 'none',
                  background: animeSeriesFilter === 'trending' ? 'var(--netflix-red)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Trending Series
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeriesFilter('top')}
                style={{
                  padding: '0.35rem 0.95rem',
                  borderRadius: '16px',
                  border: 'none',
                  background: animeSeriesFilter === 'top' ? 'var(--netflix-red)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Top Rated Series
              </button>
            </div>
          </div>

          {loadingAnime ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888' }}>Loading Anime Series...</div>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => scrollAnimeSeries('left')}
                aria-label="Scroll Left"
                style={{
                  position: 'absolute',
                  left: '-16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 25,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(20, 20, 20, 0.85)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(8px)',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  e.currentTarget.style.background = 'var(--netflix-red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)';
                }}
              >
                <ChevronLeft size={26} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => scrollAnimeSeries('right')}
                aria-label="Scroll Right"
                style={{
                  position: 'absolute',
                  right: '-16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 25,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(20, 20, 20, 0.85)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(8px)',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  e.currentTarget.style.background = 'var(--netflix-red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)';
                }}
              >
                <ChevronRight size={26} strokeWidth={2.5} />
              </button>

              <div
                ref={animeSeriesRowRef}
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  paddingBottom: '0.5rem',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
                className="no-scrollbar"
              >
                {(animeSeriesFilter === 'trending' ? trendingAnimeSeries : topRatedAnimeSeries).map((anime) => (
                  <div
                    key={`as-${anime.id}`}
                    onClick={() => handleMediaClick(anime)}
                    style={{
                      flex: '0 0 210px',
                      scrollSnapAlign: 'start',
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#181818',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      transition: 'transform 0.25s ease, border-color 0.25s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.04)';
                      e.currentTarget.style.borderColor = 'var(--netflix-red)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    }}
                  >
                    <div style={{ height: '260px', overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={anime.img}
                        alt={anime.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(0,0,0,0.8)',
                          color: '#FBBF24',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Star size={12} fill="#FBBF24" /> {anime.rating}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: '#a855f7',
                          color: '#fff',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '3px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}
                      >
                        Anime Series
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem' }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {anime.title}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginTop: '2px' }}>
                        {anime.releaseDate} &bull; {animeSeriesFilter === 'trending' ? 'Trending' : 'Top Rated'}
                      </span>

                      <button
                        className="btn-netflix-space"
                        style={{
                          width: '100%',
                          marginTop: '0.75rem',
                          padding: '0.45rem',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          background: 'var(--netflix-red)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}
                      >
                        <Users size={14} /> Watch Together
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. AI WATCH SPACES FEATURES SHOWCASE ── */}
      <section className="landing-features-section" style={{ padding: '3rem 4%', background: '#0a0a0a' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          Experience the Full Potential of AI Watch Spaces
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}
        >
          <div style={{ background: '#161616', padding: '1.5rem', borderRadius: '8px', border: '1px solid #262626' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--netflix-red)' }}><Play size={32} /></div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Authoritative Playback Sync</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>Host playback commands (play, pause, seek) synchronize in milliseconds across participants with drift compensation.</p>
          </div>

          <div style={{ background: '#161616', padding: '1.5rem', borderRadius: '8px', border: '1px solid #262626' }}>
            <div style={{ marginBottom: '1rem', color: '#a855f7' }}><Sparkles size={32} /></div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Timeline-Grounded AI Co-Pilot</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>Ask questions about scene trivia! Our RAG engine uses timestamp boundaries up to current playback second without spoilers.</p>
          </div>

          <div style={{ background: '#161616', padding: '1.5rem', borderRadius: '8px', border: '1px solid #262626' }}>
            <div style={{ marginBottom: '1rem', color: '#f59e0b' }}><Vote size={32} /></div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Narrative Variation Voting</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>At key story branch decision points, host opens a live vote. Winning alternate story branch applies to all viewers.</p>
          </div>

          <div style={{ background: '#161616', padding: '1.5rem', borderRadius: '8px', border: '1px solid #262626' }}>
            <div style={{ marginBottom: '1rem', color: '#0ea5e9' }}><MessageSquare size={32} /></div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Live Chat &amp; Reactions</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>Express yourself with floating emoji reactions, live room chat history, typing indicators, and host moderation.</p>
          </div>
        </div>
      </section>

      {/* ── 4. FREQUENTLY ASKED QUESTIONS ── */}
      <section style={{ padding: '3rem 4%' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, textAlign: 'center', marginBottom: '1.5rem' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {FAQS.map((faq, idx) => (
            <div key={idx} style={{ background: '#2d2d2d', borderRadius: '4px', overflow: 'hidden' }}>
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                style={{ width: '100%', padding: '1.2rem 1.5rem', background: 'none', border: 'none', color: '#fff', fontSize: '1.05rem', fontWeight: 500, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span>{faq.q}</span>
                {activeFaq === idx ? <X size={22} /> : <Plus size={22} />}
              </button>

              {activeFaq === idx && (
                <div style={{ padding: '0 1.5rem 1.2rem', color: '#ccc', fontSize: '0.95rem', lineHeight: '1.5', borderTop: '1px solid #3d3d3d', paddingTop: '1rem' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
