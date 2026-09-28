import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, Users, Film, LogOut, Settings, LogIn, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NetflixAiLogo from './NetflixAiLogo';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const profileRef = React.useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'N';
  const avatarUrl = user?.avatarUrl || 'https://assets.nflxext.com/ffe/siteui/vma/netflix-avatar.png';

  return (
    <header className={`netflix-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-left">
        <Link to="/" className="netflix-logo-link" title="Netflix AI Watch Spaces">
          <NetflixAiLogo height={32} />
        </Link>

        <ul className="netflix-nav-items">
          <li>
            <NavLink to="/" className={({ isActive }) => `netflix-nav-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard" className="netflix-nav-link">
              TV Shows
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard" className="netflix-nav-link">
              Movies
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard" className="netflix-nav-link">
              New & Popular
            </NavLink>
          </li>
          <li>
            <NavLink to="/create-space" className={({ isActive }) => `netflix-nav-link ${isActive ? 'active' : ''}`}>
              Watch Spaces
              <span className="netflix-nav-badge">AI</span>
            </NavLink>
          </li>
        </ul>
      </div>

      <div className="nav-right">
        <button className="nav-icon-btn" title="Search titles, people, genres">
          <Search size={20} />
        </button>

        <button className="nav-icon-btn" title="Notifications">
          <Bell size={20} />
        </button>

        {/* Dynamic Auth State: Profile Dropdown or Sign In */}
        {isAuthenticated ? (
          <div
            className="nav-profile-menu"
            ref={profileRef}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            {!imgError ? (
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="nav-avatar-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="cb-avatar-fallback">
                {userInitial}
              </div>
            )}
            <ChevronDown size={14} className="profile-dropdown-caret" />

            <div className={`profile-dropdown ${isProfileOpen ? 'open' : ''}`} style={{ display: isProfileOpen ? 'block' : undefined }}>
              <div style={{ padding: '0.4rem 1.2rem 0.6rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                  {user?.displayName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: user?.role === 'admin' ? 'var(--netflix-red)' : user?.role === 'host' ? '#a855f7' : '#333',
                    color: '#fff'
                  }}>
                    {user?.role}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>{user?.email}</span>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              <Link to="/create-space" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                <Users size={16} />
                <span>Create Watch Space</span>
              </Link>
              <Link to="/join" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                <Play size={16} />
                <span>Join a Space</span>
              </Link>
              <Link to="/dashboard" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                <Film size={16} />
                <span>Browse Catalog</span>
              </Link>

              {user?.role === 'admin' && (
                <Link to="/admin" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                  <Settings size={16} />
                  <span>Studio Ingestion CMS</span>
                </Link>
              )}

              <div className="profile-dropdown-divider" />

              <button
                onClick={handleLogout}
                className="profile-dropdown-item"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <LogOut size={16} />
                <span>Sign out of Netflix</span>
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn-netflix-space"
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;
