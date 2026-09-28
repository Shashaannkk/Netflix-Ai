import React, { useState, useEffect } from 'react';
import {
  Play,
  Info,
  Users,
  Plus,
  ThumbsUp,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
  BarChart3,
  Clock,
  MessageSquare,
  CheckCircle2,
  Star,
  ExternalLink,
  Loader,
  Zap,
  Radio,
  Check,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardApi, recordInteractionApi, getSpaceAnalyticsApi } from '../services/api';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    activeSpaces: [],
    recentlyWatched: [],
    watchHistory: [],
    recommendations: [],
  });

  // Selected space analytics modal state
  const [selectedAnalytics, setSelectedAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [ratingTitleId, setRatingTitleId] = useState(null);
  const [userRating, setUserRating] = useState(5);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboardApi();
      if (res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const openCreateSpace = (titleId) => {
    navigate(titleId ? `/create-space?titleId=${titleId}` : '/create-space');
  };

  const handleRateTitle = async (titleId, ratingValue) => {
    try {
      await recordInteractionApi({
        titleId,
        rating: ratingValue,
        completed: true,
      });
      setRatingTitleId(null);
      fetchDashboard(); // refresh recommendations & history
    } catch (err) {
      console.error('[Dashboard] Error rating title:', err.message);
    }
  };

  const fetchAnalytics = async (spaceId) => {
    try {
      setLoadingAnalytics(true);
      const res = await getSpaceAnalyticsApi(spaceId);
      setSelectedAnalytics(res.data.analytics);
    } catch (err) {
      console.error('[Dashboard] Error fetching space analytics:', err.message);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fallback items if API returned empty initial array
  const activeSpaces = dashboardData.activeSpaces || [];
  const recentlyWatched = dashboardData.recentlyWatched || [];
  const recommendations = dashboardData.recommendations || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--netflix-black)' }}>
      {/* 1. CINEMATIC HERO BILLBOARD */}
      <div
        className="hero-billboard"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop')`,
        }}
      >
        <div className="billboard-vignette" />
        <div className="billboard-bottom-fade" />

        <div className="billboard-content">
          <div className="billboard-badge">
            <span className="netflix-n-badge">N</span>
            <span>AI CO-PILOT FEATURED</span>
          </div>

          <h1 className="billboard-title">CYBER NEXUS</h1>

          <div className="top-10-row">
            <span className="top-10-badge">TOP 10</span>
            <span>#1 in Watch Spaces Today</span>
          </div>

          <p className="billboard-synopsis">
            Experience real-time interactive cinema. Watch with friends, consult the grounded AI Co-Pilot on timeline lore, and vote on pre-approved narrative variations together.
          </p>

          <div className="billboard-actions">
            <button onClick={() => openCreateSpace()} className="btn-netflix-space">
              <Users size={20} />
              <span>Create AI Watch Space</span>
            </button>

            <Link to="/space" className="btn-netflix-play">
              <Play size={22} fill="currentColor" />
              <span>Quick Start</span>
            </Link>

            <button className="btn-netflix-info">
              <Info size={22} />
              <span>More Info</span>
            </button>
          </div>
        </div>

        {/* Mute button */}
        <div className="billboard-meta-right">
          <button
            className="circle-icon-btn"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="billboard-rating-badge">U/A 16+</div>
        </div>
      </div>

      {/* 2. NETFLIX DASHBOARD CONTENT CONTAINER */}
      <div className="netflix-content-container">

        {/* ── ROW A: ACTIVE WATCH SPACES (Quick Rejoin) ── */}
        {activeSpaces.length > 0 && (
          <div className="netflix-row" style={{ marginBottom: '2.5rem' }}>
            <div className="row-header">
              <h2 className="row-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
                <Zap size={20} /> Active Watch Spaces (Quick Rejoin)
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.2rem', padding: '0.5rem 0' }}>
              {activeSpaces.map((space) => (
                <div
                  key={space._id}
                  style={{
                    background: '#181818',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className={`room-status-badge ${space.status === 'live' ? 'badge-live' : 'badge-scheduled'}`}>
                        {space.status === 'live' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Radio size={12} /> LIVE SESSION</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> SCHEDULED</span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 600 }}>
                        Code: <strong style={{ color: '#fff' }}>{space.inviteCode}</strong>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>
                      {space.settings?.roomName || 'Watch Party'}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#aaa' }}>
                      Title: <strong style={{ color: '#ddd' }}>{space.titleId?.title || 'Tears of Steel'}</strong>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                      Host: {space.hostUserId?.displayName || 'Host'} &bull; {(space.participantIds || []).length + 1} Viewers
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn-netflix-play"
                      onClick={() => navigate(`/space/${space._id}`)}
                      style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
                    >
                      <ExternalLink size={16} /> Quick Rejoin
                    </button>
                    <button
                      className="circle-icon-btn"
                      onClick={() => fetchAnalytics(space._id)}
                      title="View Session Analytics"
                    >
                      <BarChart3 size={16} color="#e50914" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ROW B: RECOMMENDED FOR YOU (Hybrid Engine Rail) ── */}
        <div className="netflix-row">
          <div className="row-header">
            <h2 className="row-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--netflix-red)" /> Recommended for You (Hybrid AI Algorithm)
            </h2>
            <span className="row-explore">Personalized Signals &gt;</span>
          </div>

          <div className="row-slider">
            {recommendations.map((movie) => (
              <div key={movie._id || movie.id} className="movie-card">
                <div className="movie-poster-wrapper">
                  <img
                    src={movie.backdropUrl || movie.poster || movie.image || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop'}
                    alt={movie.title}
                    className="movie-poster-img"
                  />
                </div>

                {/* Hover Details Card */}
                <div className="card-hover-details">
                  <div className="hover-action-icons">
                    <div className="hover-btn-group">
                      <Link to="/space" className="circle-icon-btn primary" title="Play">
                        <Play size={16} fill="currentColor" />
                      </Link>
                      <button onClick={() => openCreateSpace(movie._id || movie.id)} className="circle-icon-btn space-btn" title="Create Watch Space">
                        <Users size={15} />
                      </button>
                      <button
                        className="circle-icon-btn"
                        onClick={() => setRatingTitleId(movie._id || movie.id)}
                        title="Rate Movie"
                      >
                        <Star size={14} color="#f59e0b" />
                      </button>
                    </div>

                    <Link to="/space" className="circle-icon-btn" title="More Info">
                      <ChevronRight size={18} />
                    </Link>
                  </div>

                  <div className="hover-meta-info">
                    <span className="match-score">{movie.matchScore || '98% Match'}</span>
                    <span className="age-badge">{movie.ageRating || '16+'}</span>
                    <span>{movie.durationSeconds ? `${Math.floor(movie.durationSeconds / 60)}m` : '1h 52m'}</span>
                    <span className="quality-badge">4K</span>
                  </div>

                  {/* Recommendation Reason Pill */}
                  <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Sparkles size={12} color="#22c55e" /> {movie.matchReason || 'Because you like Sci-Fi'}
                  </div>

                  <div className="hover-tags">
                    {(movie.genres || ['Sci-Fi', 'Action']).map((t, idx) => (
                      <span key={idx}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROW C: RECENTLY WATCHED & HISTORY ── */}
        <div className="netflix-row" style={{ marginTop: '2rem' }}>
          <div className="row-header">
            <h2 className="row-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="#a855f7" /> Recently Watched & History
            </h2>
          </div>

          {recentlyWatched.length === 0 ? (
            <div style={{ background: '#181818', padding: '1.5rem', borderRadius: '8px', color: '#aaa', fontSize: '0.85rem' }}>
              No recent watch history recorded. Create or join a Watch Space to log telemetry!
            </div>
          ) : (
            <div className="row-slider">
              {recentlyWatched.map((item, idx) => {
                const titleObj = item.title || {};
                return (
                  <div key={idx} className="movie-card">
                    <div className="movie-poster-wrapper">
                      <img
                        src={titleObj.backdropUrl || titleObj.poster || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop'}
                        alt={titleObj.title || 'Watched Title'}
                        className="movie-poster-img"
                      />
                    </div>

                    <div className="card-hover-details">
                      <div className="hover-action-icons">
                        <div className="hover-btn-group">
                          <Link to="/space" className="circle-icon-btn primary" title="Resume">
                            <Play size={16} fill="currentColor" />
                          </Link>
                          <button onClick={() => openCreateSpace(titleObj._id)} className="circle-icon-btn space-btn" title="Watch Together">
                            <Users size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="hover-meta-info">
                        <span style={{ color: '#fff', fontWeight: 700 }}>{titleObj.title || 'Tears of Steel'}</span>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '0.3rem' }}>
                        Watched: {item.watchedSeconds ? `${Math.floor(item.watchedSeconds / 60)} mins` : '15 mins'}
                        {item.completed && (
                          <span style={{ color: '#22c55e', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Check size={12} /> Completed
                          </span>
                        )}
                      </div>

                      {item.rating && (
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.2rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Star size={12} fill="#f59e0b" color="#f59e0b" /> ({item.rating}/5)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. RATING INTERACTION MODAL ── */}
      {ratingTitleId && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Rate Title & Train AI Engine</h3>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.25rem' }}>
              Your rating updates your personal genre affinity and trains the collaborative filtering algorithm.
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
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <Star size={24} fill={star <= userRating ? '#f59e0b' : 'none'} color={star <= userRating ? '#f59e0b' : '#444'} />
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="cs-copy-btn"
                style={{ flex: 1, padding: '0.6rem' }}
                onClick={() => setRatingTitleId(null)}
              >
                Cancel
              </button>
              <button
                className="btn-netflix-play"
                style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                onClick={() => handleRateTitle(ratingTitleId, userRating)}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. WATCH SPACE ANALYTICS MODAL ── */}
      {(selectedAnalytics || loadingAnalytics) && (
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
              background: '#141414',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '90%',
              color: '#fff',
            }}
          >
            {loadingAnalytics ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader size={32} className="spin-icon" color="var(--netflix-red)" />
                <p style={{ marginTop: '0.75rem', color: '#aaa' }}>Calculating Watch Space Analytics…</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem', color: '#e50914' }}>
                    <BarChart3 size={20} /> Watch Space Session Telemetry
                  </div>
                  <button
                    onClick={() => setSelectedAnalytics(null)}
                    style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#1c1c1c', padding: '0.85rem', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Session Duration</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{selectedAnalytics.formattedDuration}</div>
                  </div>

                  <div style={{ background: '#1c1c1c', padding: '0.85rem', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Peak Viewers</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e', marginTop: '0.2rem' }}>{selectedAnalytics.peakParticipants} Viewers</div>
                  </div>

                  <div style={{ background: '#1c1c1c', padding: '0.85rem', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>AI Queries Asked</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--netflix-red)', marginTop: '0.2rem' }}>{selectedAnalytics.aiQuestions} Questions</div>
                  </div>

                  <div style={{ background: '#1c1c1c', padding: '0.85rem', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Chat Messages Sent</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a855f7', marginTop: '0.2rem' }}>{selectedAnalytics.chatActivity} Messages</div>
                  </div>
                </div>

                <button
                  className="btn-netflix-play"
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                  onClick={() => setSelectedAnalytics(null)}
                >
                  Close Analytics
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
