import React, { useState, useEffect } from 'react';
import {
  Clock,
  Film,
  Star,
  Trash2,
  Play,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Filter,
  Tag,
  AlertTriangle,
  Loader,
  RefreshCw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardApi,
  recordInteractionApi,
  deleteInteractionApi,
  clearWatchHistoryApi,
} from '../services/api';
import CinebyNavbar from '../components/CinebyNavbar';
import CinebyModal from '../components/CinebyModal';
import Footer from '../components/Footer';

export const WatchActivity = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [watchHistory, setWatchHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'movie' | 'tv' | 'anime'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'in-progress'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'rating' | 'duration'

  // Modals & Rating
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [userRating, setUserRating] = useState(5);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getDashboardApi();
      if (res.data) {
        setWatchHistory(res.data.watchHistory || []);
        setRecommendations(res.data.recommendations || []);
      }
    } catch (err) {
      console.error('[WatchActivity] Error fetching history:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteItem = async (interactionId, e) => {
    e.stopPropagation();
    try {
      setDeletingId(interactionId);
      await deleteInteractionApi(interactionId);
      setWatchHistory((prev) => prev.filter((item) => item._id !== interactionId));
    } catch (err) {
      console.error('[WatchActivity] Delete error:', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      setLoading(true);
      await clearWatchHistoryApi();
      setWatchHistory([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('[WatchActivity] Clear history error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRateTitle = async (titleId, ratingValue) => {
    try {
      await recordInteractionApi({
        titleId,
        rating: ratingValue,
        completed: true,
      });
      setRatingTarget(null);
      fetchHistory(); // refresh history & recommendations
    } catch (err) {
      console.error('[WatchActivity] Rating error:', err.message);
    }
  };

  const handleOpenWatchSpace = (item) => {
    const titleObj = item.titleId || {};
    const titleName = titleObj.title || item.titleName || 'Netflix AI Title';
    const poster = titleObj.poster || item.poster || '';
    const backdrop = titleObj.backdropUrl || item.backdropUrl || '';
    navigate(
      `/create-space?titleId=${titleObj._id || item.titleId}&title=${encodeURIComponent(titleName)}&backdrop=${encodeURIComponent(backdrop)}&poster=${encodeURIComponent(poster)}`
    );
  };

  // Compute User Telemetry & Recommendation Stats
  const totalItems = watchHistory.length;
  const totalWatchedSeconds = watchHistory.reduce((acc, i) => acc + (i.watchedSeconds || 0), 0);
  const totalHours = (totalWatchedSeconds / 3600).toFixed(1);
  const completedCount = watchHistory.filter((i) => i.completed).length;

  // Genre distribution
  const genreCounts = {};
  watchHistory.forEach((i) => {
    const genres = i.genreAffinity?.length ? i.genreAffinity : i.titleId?.genres || [];
    genres.forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sci-Fi';

  // Duration Preference Band calculation
  const durationBands = { Short: 0, Medium: 0, Long: 0 };
  watchHistory.forEach((i) => {
    const dur = i.durationSeconds || i.titleId?.durationSeconds || 5400;
    if (dur < 2100) durationBands.Short += 1;
    else if (dur <= 6000) durationBands.Medium += 1;
    else durationBands.Long += 1;
  });
  const topBand = Object.entries(durationBands).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Medium';
  const durationBandLabel = topBand === 'Short' ? '<35 mins' : topBand === 'Medium' ? '45-90 mins' : '120+ mins';

  // Average User Rating
  const ratedItems = watchHistory.filter((i) => i.rating);
  const avgRating = ratedItems.length
    ? (ratedItems.reduce((acc, i) => acc + i.rating, 0) / ratedItems.length).toFixed(1)
    : '5.0';

  // Filter & Sort history items
  const filteredHistory = watchHistory
    .filter((item) => {
      const titleObj = item.titleId || {};
      const name = (titleObj.title || item.titleName || '').toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase());

      const mediaType = item.mediaType || (titleObj.genres?.includes('Anime') ? 'anime' : 'movie');
      const matchesCategory =
        categoryFilter === 'all'
          ? true
          : categoryFilter === 'anime'
          ? mediaType === 'anime' || titleObj.genres?.includes('Anime')
          : mediaType === categoryFilter;

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'completed'
          ? item.completed
          : !item.completed;

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'duration') return (b.watchedSeconds || 0) - (a.watchedSeconds || 0);
      return 0;
    });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <CinebyNavbar onSelectMedia={(media) => setSelectedMedia(media)} />

      {/* Header Banner */}
      <div
        style={{
          paddingTop: '100px',
          paddingBottom: '2.5rem',
          background: 'linear-gradient(180deg, rgba(229, 9, 20, 0.15) 0%, rgba(10, 10, 10, 1) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--netflix-red)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                <Clock size={16} /> Viewing Telemetry & AI Preferences
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>
                My Watch Activity & History
              </h1>
              <p style={{ color: '#aaa', fontSize: '0.95rem', marginTop: '0.4rem', maxWidth: '650px' }}>
                Your complete watch history directly shapes the Hybrid AI Recommendation algorithm based on content length, tags, genres, and ratings.
              </p>
            </div>

            {watchHistory.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Trash2 size={16} /> Clear All History
              </button>
            )}
          </div>

          {/* User Telemetry & Preference Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Total Titles Watched</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginTop: '0.2rem' }}>{totalItems} Titles</div>
              <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={13} /> {completedCount} fully completed
              </div>
            </div>

            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Total Watch Time</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--netflix-red)', marginTop: '0.2rem' }}>{totalHours} Hours</div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.3rem' }}>
                {(totalWatchedSeconds / 60).toFixed(0)} minutes logged
              </div>
            </div>

            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Top Preferred Genre</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#a855f7', marginTop: '0.2rem' }}>{topGenre}</div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.3rem' }}>
                Derived from affinity score
              </div>
            </div>

            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Preferred Content Length</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.2rem' }}>{durationBandLabel}</div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.3rem' }}>
                Avg Rating: <strong style={{ color: '#fff' }}>{avgRating}★</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Recommendation Telemetry Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(229, 9, 20, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '1px solid rgba(229, 9, 20, 0.25)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--netflix-red)', padding: '0.75rem', borderRadius: '12px' }}>
              <Sparkles size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                AI Recommendation Engine Enabled
              </div>
              <div style={{ fontSize: '0.82rem', color: '#ccc', marginTop: '0.2rem' }}>
                Your history is parsed for <strong>Genre Affinity</strong>, <strong>Tags/Keywords</strong>, and <strong>Duration Preference ({durationBandLabel})</strong> to generate 98%+ match recommendations.
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchHistory()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: '#1f1f1f',
              border: '1px solid #333',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Recalculate Engine
          </button>
        </div>

        {/* Filter & Search Bar Controls */}
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.75rem',
            background: '#121212',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#777' }} />
            <input
              type="text"
              placeholder="Search history by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                background: '#1c1c1c',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                background: '#1c1c1c',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Categories</option>
              <option value="movie">Movies</option>
              <option value="tv">Series</option>
              <option value="anime">Anime</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                background: '#1c1c1c',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                background: '#1c1c1c',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="recent">Sort by Most Recent</option>
              <option value="rating">Sort by Rating</option>
              <option value="duration">Sort by Watch Duration</option>
            </select>
          </div>
        </div>

        {/* Watch History Items Display */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <Loader size={36} className="spin-icon" color="var(--netflix-red)" />
            <p style={{ color: '#aaa', marginTop: '1rem', fontSize: '0.9rem' }}>Loading Watch History Telemetry...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: '#121212',
              borderRadius: '16px',
              border: '1px dashed rgba(255,255,255,0.15)',
            }}
          >
            <Film size={48} color="#555" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>No Watch History Found</h3>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.4rem', maxWidth: '420px', margin: '0.4rem auto 1.5rem' }}>
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No titles match your current search and filter settings.'
                : 'Stream titles or launch a Watch Space to log viewing activity and train your recommendation algorithm!'}
            </p>
            <Link to="/browse" className="cb-btn cb-btn-play" style={{ display: 'inline-flex', padding: '0.6rem 1.4rem' }}>
              <Play size={16} fill="currentColor" /> Browse Catalog
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {filteredHistory.map((item) => {
                const titleObj = item.titleId || {};
                const titleName = titleObj.title || item.titleName || 'Watched Title';
                const poster = titleObj.poster || item.poster || titleObj.backdropUrl || item.backdropUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop';
                const durationSec = item.durationSeconds || titleObj.durationSeconds || 5400;
                const watchedSec = item.watchedSeconds || 0;

                const actualMinsWatched = Math.floor(watchedSec / 60);
                const totalMins = Math.floor(durationSec / 60);
                const remainingMins = Math.max(0, totalMins - actualMinsWatched);
                const progressPct = item.completed
                  ? 100
                  : (durationSec > 0 ? Math.min(99, Math.max(1, Math.round((watchedSec / durationSec) * 100))) : 0);

                const genres = item.genreAffinity?.length ? item.genreAffinity : titleObj.genres || ['Movie'];

                const mediaPayload = {
                  ...titleObj,
                  id: titleObj.tmdbId || titleObj.id || titleObj._id || item.titleId,
                  tmdbId: titleObj.tmdbId || titleObj.id,
                  title: titleName,
                  name: titleName,
                  poster_path: titleObj.poster || item.poster,
                  backdrop_path: titleObj.backdropUrl || item.backdropUrl,
                  resumeTime: watchedSec,
                  watchedSeconds: watchedSec,
                  durationSeconds: durationSec,
                  completed: item.completed,
                  media_type: item.mediaType || (titleObj.genres?.includes('Anime') ? 'anime' : (titleObj.first_air_date ? 'tv' : 'movie')),
                };

                return (
                  <div
                    key={item._id}
                    style={{
                      background: '#141414',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      position: 'relative',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Thumbnail & Badges */}
                      <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                        <img
                          src={poster}
                          alt={titleName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(20,20,20,1) 100%)',
                          }}
                        />

                        {/* Status pill */}
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            background: item.completed ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                            color: '#fff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          {item.completed ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {item.completed ? 'Completed (100%)' : `${progressPct}% Watched (${remainingMins}m left)`}
                        </span>

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteItem(item._id, e)}
                          disabled={deletingId === item._id}
                          title="Remove from history"
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.65)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          {deletingId === item._id ? <Loader size={14} className="spin-icon" /> : <Trash2 size={14} />}
                        </button>

                        {/* Progress Bar */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.2)' }}>
                          <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--netflix-red)' }} />
                        </div>
                      </div>

                      {/* Content Details */}
                      <div style={{ padding: '1rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem', lineClamp: 1 }}>
                          {titleName}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.6rem' }}>
                          <span>{actualMinsWatched}m watched / {totalMins}m total</span>
                          <span>&bull;</span>
                          <span style={{ color: '#22c55e', fontWeight: 700 }}>
                            {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Genre & Tag Chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                          {genres.slice(0, 3).map((g, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                background: '#222',
                                border: '1px solid #333',
                                fontSize: '0.68rem',
                                color: '#ddd',
                                fontWeight: 600,
                              }}
                            >
                              {g}
                            </span>
                          ))}
                        </div>

                        {/* User Rating Display & Train Action */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c1c1c', padding: '0.45rem 0.75rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 600 }}>Your Rating:</div>
                          <div
                            onClick={() => setRatingTarget(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}
                            title="Click to rate & train AI recommendation"
                          >
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={13}
                                fill={s <= (item.rating || 0) ? '#f59e0b' : 'none'}
                                color={s <= (item.rating || 0) ? '#f59e0b' : '#555'}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 1rem 1rem' }}>
                      <button
                        className="cb-btn cb-btn-play"
                        onClick={() => setSelectedMedia(mediaPayload)}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
                      >
                        <Play size={14} fill="currentColor" /> {watchedSec > 0 && !item.completed ? `Resume (${actualMinsWatched}m)` : 'Play / Details'}
                      </button>

                      <button
                        className="cb-btn cb-btn-space"
                        onClick={() => handleOpenWatchSpace(item)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                        title="Watch in Watch Space"
                      >
                        <Users size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Detail & Trailer Modal */}
      {selectedMedia && (
        <CinebyModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onWatchTogether={(item) => {
            setSelectedMedia(null);
            handleOpenWatchSpace({ titleId: item });
          }}
        />
      )}

      {/* Interactive Rating Modal */}
      {ratingTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              background: '#181818',
              border: '1px solid var(--netflix-red)',
              borderRadius: '12px',
              padding: '1.75rem',
              maxWidth: '400px',
              width: '90%',
              color: '#fff',
              textAlign: 'center',
            }}
          >
            <Star size={32} color="#f59e0b" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Rate Title & Train AI Algorithm</h3>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.25rem' }}>
              Rating <strong>{ratingTarget.titleId?.title || ratingTarget.titleName}</strong> refines your genre affinity vector and duration length match scores.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                  }}
                >
                  <Star size={26} fill={star <= userRating ? '#f59e0b' : 'none'} color={star <= userRating ? '#f59e0b' : '#444'} />
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="cb-btn cb-btn-secondary"
                style={{ flex: 1, padding: '0.6rem' }}
                onClick={() => setRatingTarget(null)}
              >
                Cancel
              </button>
              <button
                className="cb-btn cb-btn-play"
                style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                onClick={() => handleRateTitle(ratingTarget.titleId?._id || ratingTarget.titleId, userRating)}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              background: '#181818',
              border: '1px solid #ef4444',
              borderRadius: '12px',
              padding: '1.75rem',
              maxWidth: '420px',
              width: '90%',
              color: '#fff',
              textAlign: 'center',
            }}
          >
            <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Clear Entire Watch History?</h3>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              This action will permanently delete all your logged watch activity, duration telemetry, and ratings. Your personalized recommendations will reset to default signals.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="cb-btn cb-btn-secondary"
                style={{ flex: 1, padding: '0.6rem' }}
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '8px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Yes, Clear All History
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default WatchActivity;
