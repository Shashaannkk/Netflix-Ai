import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/dashboard');
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

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="netflix-input-group">
              <input
                type="text"
                placeholder="Choose Username"
                className="netflix-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
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
                placeholder="Create a password"
                className="netflix-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-netflix-submit">
              Sign Up
            </button>
          </form>

          <div className="auth-card-switch">
            <span>Already have an account?</span>
            <Link to="/login">Sign in now.</Link>
          </div>

          <p className="auth-recaptcha-notice">
            By signing up, you agree to Netflix Terms of Use and Privacy Statement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
