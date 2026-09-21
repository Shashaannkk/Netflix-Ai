import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to prefill test accounts
  const prefill = (testEmail, testRole) => {
    setEmail(testEmail);
    setPassword('password123');
  };

  return (
    <div className="netflix-auth-page">
      {/* Auth Header with Netflix Brand Logo */}
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

      {/* Centered Netflix Sign In Card */}
      <div className="auth-content-wrap">
        <div className="netflix-auth-card">
          <h1 className="auth-card-title">Sign In</h1>

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
                placeholder="Password"
                className="netflix-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-netflix-submit"
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Quick Demo Test Accounts */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
              <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', fontWeight: 600 }}>
                QUICK-FILL TEST ACCOUNTS:
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => prefill('viewer1@netflix.ai', 'viewer')}
                  style={{
                    background: '#262626',
                    color: '#ccc',
                    border: '1px solid #444',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Viewer
                </button>
                <button
                  type="button"
                  onClick={() => prefill('host1@netflix.ai', 'host')}
                  style={{
                    background: '#262626',
                    color: '#ccc',
                    border: '1px solid #444',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Space Host
                </button>
                <button
                  type="button"
                  onClick={() => prefill('admin1@netflix.ai', 'admin')}
                  style={{
                    background: '#262626',
                    color: '#ccc',
                    border: '1px solid #444',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Admin
                </button>
              </div>
            </div>
          </form>

          <div className="auth-card-switch">
            <span>New to Netflix?</span>
            <Link to="/register">Sign up now.</Link>
          </div>

          <p className="auth-recaptcha-notice">
            This page is protected by Google reCAPTCHA to ensure you're not a bot.{' '}
            <a href="#learnmore" style={{ color: '#0071eb', textDecoration: 'none' }}>Learn more.</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
