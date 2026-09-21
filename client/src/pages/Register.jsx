import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export const Register = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer'); // 'viewer' | 'host'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await register({
        displayName,
        email,
        password,
        role
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="netflix-auth-page">
      <header className="auth-header">
        <Link to="/" className="netflix-logo-link">
          <svg
            className="netflix-brand-svg"
            style={{ height: '42px' }}
            viewBox="0 0 111 30"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M105.062 14.28L111 30c-1.75-.25-3.499-.563-5.28-.845l-3.345-8.686-3.437 7.969c-1.687-.282-3.344-.376-5.031-.595l6.042-13.75-5.656-14.156h5.062l3.313 8.843 3.375-8.843h4.969l-5.95 14.343h.001zm-22.406 6.25v7.625c-1.625-.094-3.219-.188-4.813-.25V0h4.813v12.281h6.75v4.5h-6.75v3.75h.001zm-10.438-1.5c0 1.25.063 2.5.125 3.75-1.531-.031-3.094-.063-4.625-.063-.094-1.25-.156-2.5-.156-3.75V4.5h-4.375V0h13.563v4.5h-4.531v14.531h-.001zm-15.656-6.75v8.594c-1.531 0-3.094-.031-4.656-.031V0h4.656v7.719h6.75v4.5h-6.75v.063h.001zm-10.438 8.437c-1.562 0-3.125 0-4.656-.031V0h4.656v20.719h.001zm-14.437.031V0h4.719l6.594 14.375V0h4.594v20.781c-1.625 0-3.219-.031-4.844-.062l-6.344-13.906v13.937h-4.719zm-16.594.25c-1.625 0-3.25.031-4.875.063V0h4.875v20.969h.001z"
            />
          </svg>
        </Link>
      </header>

      <div className="auth-content-wrap">
        <div className="netflix-auth-card">
          <h1 className="auth-card-title">Create Account</h1>

          {errorMsg && (
            <div style={{
              background: '#e87c03',
              color: '#fff',
              padding: '0.8rem 1rem',
              borderRadius: '4px',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="netflix-input-group">
              <input
                type="text"
                placeholder="Display Name"
                className="netflix-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="netflix-input-group">
              <input
                type="email"
                placeholder="Email address"
                className="netflix-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="netflix-input-group">
              <input
                type="password"
                placeholder="Create Password (min 6 characters)"
                className="netflix-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Role Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '0.4rem' }}>
                Account Purpose:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRole('viewer')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '4px',
                    border: role === 'viewer' ? '2px solid var(--netflix-red)' : '1px solid #444',
                    background: role === 'viewer' ? 'rgba(229, 9, 20, 0.15)' : '#262626',
                    color: '#fff',
                    fontSize: '0.85rem',
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
                    padding: '0.6rem',
                    borderRadius: '4px',
                    border: role === 'host' ? '2px solid var(--netflix-red)' : '1px solid #444',
                    background: role === 'host' ? 'rgba(229, 9, 20, 0.15)' : '#262626',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Space Host
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-netflix-submit"
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-card-switch">
            <span>Already have an account?</span>
            <Link to="/login">Sign in now.</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
