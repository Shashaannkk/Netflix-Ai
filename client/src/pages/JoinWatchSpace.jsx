import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  Lock,
  Unlock,
  Play,
  Loader,
  AlertCircle,
  ArrowRight,
  Check,
  Sparkles,
  Clock,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWatchSpace } from '../context/WatchSpaceContext';
import { resolveInviteCode, joinSpace } from '../services/watchSpaceApi';

// ── Utility ────────────────────────────────────────────────────────────────
const formatDuration = (sec) => {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const JoinWatchSpace = () => {
  const { isAuthenticated, user } = useAuth();
  const { setSpace } = useWatchSpace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Code entry state ────────────────────────────────────────────────────────
  const [code, setCode]               = useState('');
  const [resolving, setResolving]     = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const [preview, setPreview]         = useState(null); // space preview from API

  // ── Join state ──────────────────────────────────────────────────────────────
  const [joining, setJoining]         = useState(false);
  const [joinError, setJoinError]     = useState(null);

  // Individual character refs for OTP-style input
  const inputsRef = useRef([]);

  // ── Parse ?code= from URL on mount ─────────────────────────────────────────
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      const cleaned = urlCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      setCode(cleaned);
      if (cleaned.length === 6) {
        handleResolve(cleaned);
      }
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OTP input handler ───────────────────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    const char = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const chars = code.split('').concat(Array(6).fill('')).slice(0, 6);
    chars[idx] = char;
    const newCode = chars.join('');
    setCode(newCode);
    setPreview(null);
    setResolveError(null);

    if (char && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
    if (newCode.replace(/\s/g, '').length === 6) {
      handleResolve(newCode);
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      const chars = code.split('').concat(Array(6).fill('')).slice(0, 6);
      if (!chars[idx] && idx > 0) {
        chars[idx - 1] = '';
        setCode(chars.join(''));
        inputsRef.current[idx - 1]?.focus();
      } else {
        chars[idx] = '';
        setCode(chars.join(''));
      }
      setPreview(null);
      setResolveError(null);
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(pasted.padEnd(6, '').slice(0, 6));
    if (pasted.length === 6) handleResolve(pasted);
  };

  // ── Resolve code ────────────────────────────────────────────────────────────
  const handleResolve = async (codeToResolve) => {
    const clean = (codeToResolve || code).replace(/\s/g, '');
    if (clean.length !== 6) return;

    setResolving(true);
    setResolveError(null);
    setPreview(null);

    try {
      const res = await resolveInviteCode(clean);
      setPreview(res.data.preview);
    } catch (err) {
      setResolveError(err.message || 'Invalid invite code.');
    } finally {
      setResolving(false);
    }
  };

  // ── Join ────────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!preview) return;

    if (!isAuthenticated) {
      navigate(`/login?redirect=/join?code=${code}`);
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      const res = await joinSpace(preview.spaceId);
      const space = res.data.space;
      setSpace(space);
      navigate(`/space/${space._id}`);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const codeChars = code.split('').concat(Array(6).fill('')).slice(0, 6);

  return (
    <div className="join-space-page">
      {/* Cinematic background glow */}
      <div className="join-space-bg-glow" />

      <div className="join-space-card">
        {/* Logo / Brand */}
        <div className="join-space-brand">
          <div className="join-brand-icon">
            <Users size={22} />
          </div>
          <span>Join Watch Space</span>
        </div>

        <p className="join-space-subtext">
          Enter the 6-character invite code shared by the host
        </p>

        {/* OTP Code Input */}
        <div className="join-otp-wrap">
          {codeChars.map((ch, idx) => (
            <input
              key={idx}
              id={`otp-${idx}`}
              ref={(el) => { inputsRef.current[idx] = el; }}
              className={`join-otp-input ${resolveError ? 'error' : ''} ${preview ? 'success' : ''}`}
              type="text"
              inputMode="text"
              maxLength={1}
              value={ch}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              onPaste={idx === 0 ? handleOtpPaste : undefined}
              onFocus={(e) => e.target.select()}
              autoFocus={idx === 0}
              autoComplete="off"
            />
          ))}
        </div>

        {/* Resolve status */}
        {resolving && (
          <div className="join-status-row">
            <Loader size={14} className="spin-icon" />
            <span>Looking up invite code…</span>
          </div>
        )}

        {resolveError && (
          <div className="join-error-banner">
            <AlertCircle size={15} />
            <span>{resolveError}</span>
          </div>
        )}

        {/* ── Space Preview Card ── */}
        {preview && !resolveError && (
          <div className="join-preview-card">
            {/* Title poster */}
            <div className="join-preview-header">
              {preview.title?.poster ? (
                <img
                  src={preview.title.poster}
                  alt={preview.title?.name}
                  className="join-preview-poster"
                />
              ) : (
                <div className="join-preview-poster-placeholder">
                  <Play size={20} />
                </div>
              )}

              <div className="join-preview-meta">
                <div className="join-preview-movie">{preview.title?.name}</div>
                <div className="join-preview-room">{preview.roomName}</div>

                <div className="join-preview-chips">
                  {preview.title?.genres?.slice(0, 2).map((g) => (
                    <span key={g} className="cs-genre-chip">{g}</span>
                  ))}
                  {preview.title?.ageRating && (
                    <span className="cs-age-badge">{preview.title.ageRating}</span>
                  )}
                  {preview.title?.durationSeconds && (
                    <span className="join-chip">
                      <Clock size={10} /> {formatDuration(preview.title.durationSeconds)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="join-preview-divider" />

            {/* Host & capacity */}
            <div className="join-preview-details">
              <div className="join-detail-row">
                <span className="join-detail-label">Host</span>
                <span className="join-detail-value">
                  <span className="join-host-avatar">
                    {preview.host?.displayName?.[0]?.toUpperCase()}
                  </span>
                  {preview.host?.displayName}
                </span>
              </div>
              <div className="join-detail-row">
                <span className="join-detail-label">Capacity</span>
                <span className="join-detail-value">
                  <Users size={12} />
                  {preview.currentCount} / {preview.maxParticipants}
                </span>
              </div>
              <div className="join-detail-row">
                <span className="join-detail-label">Privacy</span>
                <span className="join-detail-value">
                  {preview.isPrivate ? <><Lock size={12} /> Private</> : <><Unlock size={12} /> Public</>}
                </span>
              </div>
              <div className="join-detail-row">
                <span className="join-detail-label">Status</span>
                <span className={`join-status-badge ${preview.status}`}>
                  {preview.status === 'live' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#e50914', fontWeight: 700 }}>
                      <Radio size={12} /> LIVE
                    </span>
                  ) : preview.status === 'scheduled' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontWeight: 700 }}>
                      <Clock size={12} /> Scheduled
                    </span>
                  ) : (
                    'Ended'
                  )}
                </span>
              </div>
            </div>

            {/* Auth warning if not logged in */}
            {!isAuthenticated && (
              <div className="join-auth-warning">
                <AlertCircle size={14} />
                <span>
                  You need to{' '}
                  <Link to={`/login?redirect=/join?code=${code}`} className="join-auth-link">
                    sign in
                  </Link>{' '}
                  before joining
                </span>
              </div>
            )}

            {joinError && (
              <div className="join-error-banner" style={{ marginTop: '0.75rem' }}>
                <AlertCircle size={15} />
                <span>{joinError}</span>
              </div>
            )}

            {/* Join button */}
            <button
              id="confirm-join-btn"
              className="btn-netflix-play join-confirm-btn"
              disabled={joining || preview.status === 'ended'}
              onClick={handleJoin}
            >
              {joining ? (
                <><Loader size={16} className="spin-icon" /> Joining…</>
              ) : (
                <>{isAuthenticated ? <Play size={16} fill="currentColor" /> : <ArrowRight size={16} />}
                <span>{isAuthenticated ? 'Join Watch Space' : 'Sign In to Join'}</span></>
              )}
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="join-divider">
          <span>or explore active spaces</span>
        </div>

        {/* Trending AI Watch Spaces Showcase */}
        <div className="join-featured-spaces" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
            <Sparkles size={16} color="var(--netflix-red)" />
            <span>Trending AI Watch Spaces</span>
          </div>

          <div className="join-trending-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { id: 'ts-1', code: 'NX-7788', title: 'Tears of Steel (AI Director Cut)', host: 'Alex (AI Host)', count: '4/10', status: 'LIVE' },
              { id: 'ts-2', code: 'NX-9922', title: 'Stranger Things (S4 Rewatch)', host: 'Elena (AI Co-pilot)', count: '7/15', status: 'LIVE' },
              { id: 'ts-3', code: 'NX-3344', title: 'Interstellar (Sci-Fi Trivia Room)', host: 'Dr. Brand (AI)', count: '9/20', status: 'Scheduled' },
            ].map((space) => (
              <div
                key={space.id}
                className="join-space-item"
                onClick={() => {
                  setCode(space.code);
                  handleResolve(space.code);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{space.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '2px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>Host: {space.host}</span>
                    <span>&bull;</span>
                    <span><Users size={11} /> {space.count}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(229, 9, 20, 0.2)', color: 'var(--netflix-red)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                    {space.status}
                  </span>
                  <ChevronRight size={16} color="#888" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create new space CTA */}
        <Link to="/create-space" className="join-create-link" style={{ marginTop: '1.25rem' }}>
          <Sparkles size={14} />
          <span>Create your own Watch Space</span>
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
};

export default JoinWatchSpace;
