import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Users,
  Lock,
  Unlock,
  Sparkles,
  Vote,
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWatchSpace } from '../context/WatchSpaceContext';
import { createSpace, getTitlesForPicker } from '../services/watchSpaceApi';
import {
  fetchTrendingMovies,
  fetchTrendingTV,
  fetchPopularMovies,
  fetchTopRatedMovies,
  getImageUrl
} from '../services/tmdb';

// ── Step constants ──────────────────────────────────────────────────────────
const STEP_PICK_TITLE = 1;
const STEP_SETTINGS   = 2;
const STEP_LAUNCH     = 3;

// ── Utility: format seconds → "1h 23m" ─────────────────────────────────────
const formatDuration = (sec) => {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const FALLBACK_CATALOG = [
  {
    _id: 'm1',
    title: 'Tears of Steel',
    description: 'In a bleak future, a group of warriors and scientists take refuge in an Amsterdam laboratory.',
    durationSeconds: 734,
    genres: ['Sci-Fi', 'Action', 'VFX'],
    ageRating: '16+',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
  },
  {
    _id: 'm2',
    title: 'Big Buck Bunny',
    description: 'A large and lovable rabbit deals with three bullying rodents in a peaceful forest.',
    durationSeconds: 596,
    genres: ['Animation', 'Comedy', 'Family'],
    ageRating: 'U',
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
  },
  {
    _id: 'm3',
    title: 'Cyber Nexus',
    description: 'In a neon-drenched dystopia controlled by rogue synthetic minds, a covert operative uncovers a conspiracy.',
    durationSeconds: 680,
    genres: ['Sci-Fi', 'Cyberpunk', 'Action'],
    ageRating: '16+',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=1920&auto=format&fit=crop',
  },
  {
    _id: 'm4',
    title: 'Neon Odyssey',
    description: 'A gritty noir detective navigates synthetic underworlds to solve a high-profile disappearance.',
    durationSeconds: 720,
    genres: ['Cyberpunk', 'Mystery', 'Noir'],
    ageRating: '18+',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
  },
  {
    _id: 'm5',
    title: 'Cosmic Drift',
    description: 'Stranded on the outer rim of a collapsing wormhole, a crew experiences time dilation.',
    durationSeconds: 810,
    genres: ['Sci-Fi', 'Deep Space', 'Drama'],
    ageRating: '13+',
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1920&auto=format&fit=crop',
  },
  {
    _id: 'm6',
    title: 'Shadow Protocol',
    description: 'An elite counter-intelligence team races against the clock to neutralize an autonomous orbital weapon.',
    durationSeconds: 650,
    genres: ['Action', 'Thriller', 'Espionage'],
    ageRating: '16+',
    poster: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&auto=format&fit=crop',
  },
];

const CreateWatchSpace = () => {
  const { user } = useAuth();
  const { setSpace } = useWatchSpace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Step state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(STEP_PICK_TITLE);

  // ── Title picker ───────────────────────────────────────────────────────────
  const [titles, setTitles]           = useState([]);
  const [titlesLoading, setTitlesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState(null);

  // ── Room settings ──────────────────────────────────────────────────────────
  const [roomName, setRoomName]               = useState('');
  const [isPrivate, setIsPrivate]             = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [aiVerbosity, setAiVerbosity]         = useState('moderate');
  const [votingEnabled, setVotingEnabled]     = useState(true);

  // ── Launch / result ────────────────────────────────────────────────────────
  const [createdSpace, setCreatedSpace] = useState(null);
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState(null);
  const [copied, setCopied]             = useState('');

  // ── Load title catalogue ────────────────────────────────────────────────────
  useEffect(() => {
    const loadTitles = async () => {
      setTitlesLoading(true);
      try {
        const [res, trendingM, trendingT, popularM, topM] = await Promise.all([
          getTitlesForPicker().catch(() => ({ data: { titles: [] } })),
          fetchTrendingMovies().catch(() => []),
          fetchTrendingTV().catch(() => []),
          fetchPopularMovies().catch(() => []),
          fetchTopRatedMovies().catch(() => []),
        ]);

        const dbTitles = res.data?.titles || [];
        
        // Map TMDB items to watch space title format
        const formatTmdb = (item, type = 'movie') => ({
          _id: String(item.id),
          id: String(item.id),
          title: item.title || item.name,
          description: item.overview || 'Stream and watch together in real-time with Netflix AI co-pilot.',
          durationSeconds: 720,
          genres: item.genres || (type === 'tv' ? ['TV Series', 'Popular'] : ['Movie', 'Blockbuster']),
          ageRating: '16+',
          poster: getImageUrl(item.poster_path),
          backdropUrl: getImageUrl(item.backdrop_path || item.poster_path, true),
          videoAssetUrl: item.trailer_key
            ? `https://www.youtube.com/embed/${item.trailer_key}?autoplay=1`
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
        });

        const combinedTmdb = [
          ...(trendingM || []).map((m) => formatTmdb(m, 'movie')),
          ...(trendingT || []).map((t) => formatTmdb(t, 'tv')),
          ...(popularM || []).map((m) => formatTmdb(m, 'movie')),
          ...(topM || []).map((m) => formatTmdb(m, 'movie')),
        ];

        // Deduplicate by title/id
        const seen = new Set();
        const uniqueList = [];
        [...dbTitles, ...combinedTmdb, ...FALLBACK_CATALOG].forEach((t) => {
          const key = String(t._id || t.id || t.title);
          if (!seen.has(key)) {
            seen.add(key);
            uniqueList.push(t);
          }
        });

        setTitles(uniqueList);
      } catch (err) {
        console.error('[CreateWatchSpace] Error loading titles:', err);
        setTitles(FALLBACK_CATALOG);
      } finally {
        setTitlesLoading(false);
      }
    };
    loadTitles();
  }, []);

  // ── Pre-select a title if titleId is in URL ─────────────────────────────────
  useEffect(() => {
    const preselectedId = searchParams.get('titleId');
    const paramTitle = searchParams.get('title');
    const paramTrailer = searchParams.get('trailerKey');
    const paramBackdrop = searchParams.get('backdrop');
    const paramPoster = searchParams.get('poster');

    if (preselectedId) {
      const found = titles.find((t) => String(t._id) === String(preselectedId) || String(t.id) === String(preselectedId));
      if (found) {
        setSelectedTitle(found);
        setStep(STEP_SETTINGS);
      } else if (paramTitle) {
        const customTitle = {
          _id: preselectedId,
          id: preselectedId,
          title: paramTitle,
          description: 'Stream movie & trailer together with live AI co-pilot on Netflix AI.',
          durationSeconds: 720,
          genres: ['Movie', 'Feature'],
          ageRating: '16+',
          poster: paramPoster || FALLBACK_CATALOG[0].poster,
          backdropUrl: paramBackdrop || FALLBACK_CATALOG[0].backdropUrl,
          videoAssetUrl: paramTrailer
            ? (paramTrailer.startsWith('http') ? paramTrailer : `https://www.youtube.com/embed/${paramTrailer}?autoplay=1`)
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
        };
        setSelectedTitle(customTitle);
        setStep(STEP_SETTINGS);
      } else if (titles.length > 0) {
        setSelectedTitle(titles[0]);
        setStep(STEP_SETTINGS);
      }
    }
  }, [searchParams, titles]);

  // ── Auto-fill room name when user / title changes ───────────────────────────
  useEffect(() => {
    if (user && selectedTitle) {
      setRoomName(`${user.displayName}'s ${selectedTitle.title} Watch Space`);
    } else if (user) {
      setRoomName(`${user.displayName}'s Watch Space`);
    }
  }, [user, selectedTitle]);

  // ── Filtered titles ─────────────────────────────────────────────────────────
  const filteredTitles = titles.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.genres || []).some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Create space ─────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!selectedTitle) return;
    setCreating(true);
    setCreateError(null);

    try {
      const res = await createSpace({
        titleId: selectedTitle._id || selectedTitle.id,
        title: selectedTitle.title,
        poster: selectedTitle.poster,
        backdropUrl: selectedTitle.backdropUrl,
        videoAssetUrl: selectedTitle.videoAssetUrl,
        genres: selectedTitle.genres,
        settings: { roomName, isPrivate, maxParticipants, aiVerbosity, votingEnabled },
      });
      const space = res.data.space;
      setCreatedSpace(space);
      setSpace(space);
      setStep(STEP_LAUNCH);
    } catch (err) {
      console.warn('[CreateWatchSpace] Backend offline fallback:', err.message);
      const code = 'NX' + Math.floor(1000 + Math.random() * 9000);
      const demoSpace = {
        _id: `space-${Date.now()}`,
        inviteCode: code,
        inviteLink: `${window.location.origin}/space/space-${Date.now()}`,
        status: 'live',
        hostUserId: user || { _id: 'guest-1', displayName: 'Host User' },
        participantIds: [],
        settings: { roomName, isPrivate, maxParticipants, aiVerbosity, votingEnabled },
        titleId: {
          _id: selectedTitle._id || selectedTitle.id,
          title: selectedTitle.title,
          poster: selectedTitle.poster,
          backdropUrl: selectedTitle.backdropUrl,
          videoAssetUrl: selectedTitle.videoAssetUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        }
      };
      setCreatedSpace(demoSpace);
      setSpace(demoSpace);
      setStep(STEP_LAUNCH);
    } finally {
      setCreating(false);
    }
  }, [selectedTitle, roomName, isPrivate, maxParticipants, aiVerbosity, votingEnabled, setSpace, user]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const enterRoom = () => {
    navigate(`/space/${createdSpace._id}`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="create-space-page">
      {/* ── Header ── */}
      <div className="create-space-header">
        <button
          className="create-space-back-btn"
          onClick={() => (step > 1 && step < STEP_LAUNCH ? setStep(step - 1) : navigate(-1))}
        >
          <ArrowLeft size={20} />
          <span>{step > 1 && step < STEP_LAUNCH ? 'Back' : 'Cancel'}</span>
        </button>

        <div className="create-space-title-bar">
          <Sparkles size={18} className="create-space-ai-icon" />
          <span>Create Watch Space</span>
        </div>

        {/* Step Indicator */}
        <div className="create-space-steps">
          {[
            { n: 1, label: 'Pick Title' },
            { n: 2, label: 'Settings' },
            { n: 3, label: 'Launch' },
          ].map(({ n, label }) => (
            <div key={n} className={`cs-step ${step >= n ? 'active' : ''} ${step > n ? 'done' : ''}`}>
              <div className="cs-step-dot">
                {step > n ? <Check size={10} /> : n}
              </div>
              <span className="cs-step-label">{label}</span>
              {n < 3 && <div className={`cs-step-line ${step > n ? 'done' : ''}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Title Picker ── */}
      {step === STEP_PICK_TITLE && (
        <div className="create-space-body">
          <div className="cs-section-title">
            <h2>Select a Title to Watch</h2>
            <p>Choose from your published catalogue</p>
          </div>

          {/* Search */}
          <div className="cs-search-wrap">
            <Search size={16} className="cs-search-icon" />
            <input
              id="title-search"
              className="cs-search-input"
              type="text"
              placeholder="Search titles or genres…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Grid */}
          {titlesLoading ? (
            <div className="cs-loader-wrap">
              <Loader size={32} className="spin-icon" />
              <span>Loading catalogue…</span>
            </div>
          ) : filteredTitles.length === 0 ? (
            <div className="cs-empty-state">
              <AlertCircle size={40} />
              <p>No published titles found. Ask an admin to publish titles first.</p>
            </div>
          ) : (
            <div className="cs-title-grid">
              {filteredTitles.map((title) => (
                <button
                  key={title._id}
                  id={`title-card-${title._id}`}
                  className={`cs-title-card ${selectedTitle?._id === title._id ? 'selected' : ''}`}
                  onClick={() => setSelectedTitle(title)}
                >
                  <div className="cs-title-card-img-wrap">
                    {title.poster ? (
                      <img src={title.poster} alt={title.title} className="cs-title-card-img" />
                    ) : (
                      <div className="cs-title-card-placeholder">
                        <Play size={24} />
                      </div>
                    )}
                    {selectedTitle?._id === title._id && (
                      <div className="cs-title-card-check">
                        <Check size={20} />
                      </div>
                    )}
                  </div>
                  <div className="cs-title-card-info">
                    <span className="cs-title-card-name">{title.title}</span>
                    <span className="cs-title-card-meta">
                      {formatDuration(title.durationSeconds)}
                      {title.ageRating && <span className="cs-age-badge">{title.ageRating}</span>}
                    </span>
                    <div className="cs-title-card-genres">
                      {(title.genres || []).slice(0, 2).map((g) => (
                        <span key={g} className="cs-genre-chip">{g}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="cs-footer-actions">
            <button
              id="continue-to-settings-btn"
              className="btn-netflix-play cs-continue-btn"
              disabled={!selectedTitle}
              onClick={() => setStep(STEP_SETTINGS)}
            >
              <span>Continue with "{selectedTitle?.title || '…'}"</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Room Settings ── */}
      {step === STEP_SETTINGS && selectedTitle && (
        <div className="create-space-body">
          <div className="cs-section-title">
            <h2>Configure Your Watch Space</h2>
            <p>Watching: <strong style={{ color: 'var(--netflix-red)' }}>{selectedTitle.title}</strong></p>
          </div>

          <div className="cs-settings-grid">
            {/* Room Name */}
            <div className="cs-field">
              <label htmlFor="room-name" className="cs-label">Room Name</label>
              <input
                id="room-name"
                className="cs-input"
                type="text"
                maxLength={80}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Give your space a name…"
              />
            </div>

            {/* Privacy */}
            <div className="cs-field">
              <label className="cs-label">Privacy</label>
              <div className="cs-toggle-row">
                <button
                  id="toggle-private-btn"
                  className={`cs-privacy-toggle ${!isPrivate ? 'active' : ''}`}
                  onClick={() => setIsPrivate(false)}
                >
                  <Unlock size={15} />
                  <span>Public</span>
                  <small>Discoverable</small>
                </button>
                <button
                  id="toggle-public-btn"
                  className={`cs-privacy-toggle ${isPrivate ? 'active' : ''}`}
                  onClick={() => setIsPrivate(true)}
                >
                  <Lock size={15} />
                  <span>Private</span>
                  <small>Invite only</small>
                </button>
              </div>
            </div>

            {/* Max Participants */}
            <div className="cs-field">
              <label htmlFor="max-participants" className="cs-label">
                Max Participants
                <span className="cs-label-value">{maxParticipants}</span>
              </label>
              <input
                id="max-participants"
                type="range"
                className="cs-slider"
                min={2}
                max={50}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
              <div className="cs-slider-labels">
                <span>2</span>
                <span>50</span>
              </div>
            </div>

            {/* AI Verbosity */}
            <div className="cs-field">
              <label className="cs-label">
                <Sparkles size={14} style={{ color: 'var(--netflix-red)' }} />
                AI Co-Pilot Verbosity
              </label>
              <div className="cs-verbosity-row">
                {[
                  { val: 'silent',   icon: <VolumeX size={20} color="#e50914" />, label: 'Silent',   desc: 'Questions only' },
                  { val: 'moderate', icon: <MessageSquare size={20} color="#e50914" />, label: 'Moderate', desc: 'Occasional insights' },
                  { val: 'chatty',   icon: <Bot size={20} color="#e50914" />, label: 'Chatty',   desc: 'Proactive & fun' },
                ].map(({ val, icon, label, desc }) => (
                  <button
                    key={val}
                    id={`verbosity-${val}`}
                    className={`cs-verbosity-btn ${aiVerbosity === val ? 'active' : ''}`}
                    onClick={() => setAiVerbosity(val)}
                  >
                    <span className="cs-verbosity-emoji">{icon}</span>
                    <span className="cs-verbosity-label">{label}</span>
                    <span className="cs-verbosity-desc">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voting */}
            <div className="cs-field cs-field-inline">
              <div>
                <label className="cs-label">
                  <Vote size={14} />
                  Audience Voting
                </label>
                <p className="cs-field-hint">Let viewers vote on narrative variation points</p>
              </div>
              <button
                id="voting-toggle-btn"
                className={`cs-switch ${votingEnabled ? 'on' : 'off'}`}
                onClick={() => setVotingEnabled(!votingEnabled)}
                aria-label="Toggle voting"
              >
                <div className="cs-switch-thumb" />
              </button>
            </div>
          </div>

          {createError && (
            <div className="cs-error-banner">
              <AlertCircle size={16} />
              <span>{createError}</span>
            </div>
          )}

          <div className="cs-footer-actions">
            <button
              id="create-space-btn"
              className="btn-netflix-play cs-continue-btn"
              disabled={!roomName.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? (
                <><Loader size={16} className="spin-icon" /><span>Creating Space…</span></>
              ) : (
                <><Sparkles size={16} /><span>Create Watch Space</span></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Launch Screen ── */}
      {step === STEP_LAUNCH && createdSpace && (
        <div className="create-space-body cs-launch-body">
          <div className="cs-launch-success-ring">
            <div className="cs-launch-check-icon">
              <Check size={40} />
            </div>
          </div>

          <h2 className="cs-launch-title">Watch Space Created!</h2>
          <p className="cs-launch-subtitle">Share the invite code or link with your friends</p>

          {/* Title info */}
          <div className="cs-launch-title-info">
            {createdSpace.titleId?.poster && (
              <img src={createdSpace.titleId.poster} alt={createdSpace.titleId?.title} className="cs-launch-poster" />
            )}
            <div>
              <div className="cs-launch-movie-name">{createdSpace.titleId?.title}</div>
              <div className="cs-launch-room-name">{createdSpace.settings.roomName}</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                <span className="cs-stat-chip">
                  <Users size={12} /> {createdSpace.settings.maxParticipants} max
                </span>
                <span className="cs-stat-chip">
                  {createdSpace.settings.isPrivate ? <Lock size={12} /> : <Unlock size={12} />}
                  {createdSpace.settings.isPrivate ? ' Private' : ' Public'}
                </span>
                <span className="cs-stat-chip">
                  <Sparkles size={12} /> {createdSpace.settings.aiVerbosity}
                </span>
              </div>
            </div>
          </div>

          {/* Invite Code */}
          <div className="cs-invite-section">
            <label className="cs-label" style={{ marginBottom: '0.5rem' }}>Invite Code</label>
            <div className="cs-invite-code-display">
              {createdSpace.inviteCode.split('').map((ch, i) => (
                <span key={i} className="cs-invite-char">{ch}</span>
              ))}
              <button
                id="copy-invite-code-btn"
                className="cs-copy-btn"
                onClick={() => copyText(createdSpace.inviteCode, 'code')}
                title="Copy code"
              >
                {copied === 'code' ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Invite Link */}
          {createdSpace.inviteLink && (
            <div className="cs-invite-section">
              <label className="cs-label" style={{ marginBottom: '0.5rem' }}>Invite Link</label>
              <div className="cs-invite-link-row">
                <span className="cs-invite-link-text">{createdSpace.inviteLink}</span>
                <button
                  id="copy-invite-link-btn"
                  className="cs-copy-btn"
                  onClick={() => copyText(createdSpace.inviteLink, 'link')}
                  title="Copy link"
                >
                  {copied === 'link' ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
                </button>
                <a
                  href={createdSpace.inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cs-copy-btn"
                  title="Open in new tab"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}

          <div className="cs-footer-actions" style={{ marginTop: '2rem' }}>
            <button
              id="enter-room-btn"
              className="btn-netflix-play cs-continue-btn"
              onClick={enterRoom}
            >
              <Play size={18} fill="currentColor" />
              <span>Enter Watch Room</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateWatchSpace;
