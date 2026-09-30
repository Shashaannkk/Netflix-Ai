import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Users, Film, LogOut, Settings, LogIn, Play, X, Star, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CinebyLogo from './CinebyLogo';
import { searchMedia, getImageUrl } from '../services/tmdb';

export const CinebyNavbar = ({ onSelectMedia }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle live query search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDrop(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMedia(searchQuery);
      setSearchResults(results.slice(0, 7));
      setIsSearching(false);
      setShowSearchDrop(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search and profile dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDrop(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const handleSelectResult = (item) => {
    setShowSearchDrop(false);
    setSearchQuery('');
    if (onSelectMedia) {
      onSelectMedia(item);
    } else {
      navigate(`/?mediaId=${item.id}&type=${item.media_type || 'movie'}`);
    }
  };

  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'N';
  const avatarUrl = user?.avatarUrl || 'https://assets.nflxext.com/ffe/siteui/vma/netflix-avatar.png';

  return (
    <header className={`cb-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="cb-nav-container">
        {/* Left Section: Logo & Links */}
        <div className="cb-nav-left">
          <Link to="/" className="cb-logo-link" title="Netflix AI - Stream Free Movies & TV Shows">
            <CinebyLogo height={34} />
          </Link>

          <ul className={`cb-nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <li>
              <NavLink to="/" end className={({ isActive }) => `cb-nav-link ${isActive ? 'active' : ''}`}>
                Browse
              </NavLink>
            </li>
            <li>
              <NavLink to="/movies" className={({ isActive }) => `cb-nav-link ${isActive ? 'active' : ''}`}>
                Movies
              </NavLink>
            </li>
            <li>
              <NavLink to="/tv-shows" className={({ isActive }) => `cb-nav-link ${isActive ? 'active' : ''}`}>
                Series
              </NavLink>
            </li>
            <li>
              <NavLink to="/top-imdb" className={({ isActive }) => `cb-nav-link ${isActive ? 'active' : ''}`}>
                Top IMDb
              </NavLink>
            </li>
            <li>
              <NavLink to="/create-space" className={({ isActive }) => `cb-nav-link cb-nav-link-badge ${isActive ? 'active' : ''}`}>
                Watch Spaces
                <span className="cb-nav-ai-pill">AI</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Right Section: Search & Auth */}
        <div className="cb-nav-right">
          {/* Live Search Bar */}
          <div className="cb-search-wrapper" ref={searchRef}>
            <form onSubmit={(e) => e.preventDefault()} className="cb-search-form">
              <Search size={17} className="cb-search-icon" />
              <input
                type="text"
                className="cb-search-input"
                placeholder="Titles, people, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowSearchDrop(true)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="cb-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Instant Search Results Dropdown */}
            {showSearchDrop && (
              <div className="cb-search-dropdown">
                {isSearching ? (
                  <div className="cb-search-status">Searching TMDB...</div>
                ) : searchResults.length > 0 ? (
                  <div className="cb-search-list">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="cb-search-item"
                        onClick={() => handleSelectResult(item)}
                      >
                        <img
                          src={getImageUrl(item.poster_path)}
                          alt={item.title || item.name}
                          className="cb-search-thumb"
                        />
                        <div className="cb-search-info">
                          <div className="cb-search-title">{item.title || item.name}</div>
                          <div className="cb-search-meta">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Star size={12} fill="#e50914" color="#e50914" /> {item.vote_average ? item.vote_average.toFixed(1) : '8.0'}</span>
                            <span>&bull;</span>
                            <span>{(item.release_date || item.first_air_date || '2026').substring(0, 4)}</span>
                            <span>&bull;</span>
                            <span className="cb-search-tag">{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="cb-search-status">No titles found for "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>

          {/* User Auth Menu or Login Button */}
          {isAuthenticated ? (
            <div
              className="cb-profile-menu"
              ref={profileRef}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              {!imgError ? (
                <img
                  src={avatarUrl}
                  alt={user?.displayName || 'User Profile'}
                  className="cb-avatar-img"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="cb-avatar-fallback">
                  {userInitial}
                </div>
              )}

              <div className={`cb-profile-dropdown ${isProfileOpen ? 'open' : ''}`}>
                <div className="cb-profile-user-info">
                  <div className="cb-user-name">{user?.displayName}</div>
                  <div className="cb-user-email">{user?.email}</div>
                </div>

                <div className="cb-dropdown-divider" />

                <Link to="/#watch-activity" className="cb-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                  <Film size={16} />
                  <span>My Watch Activity</span>
                </Link>
                <Link to="/create-space" className="cb-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                  <Users size={16} />
                  <span>Create Watch Space</span>
                </Link>
                <Link to="/join" className="cb-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                  <Play size={16} />
                  <span>Join Watch Room</span>
                </Link>
                <Link to="/browse" className="cb-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                  <Film size={16} />
                  <span>Browse Catalog</span>
                </Link>

                {user?.role === 'admin' && (
                  <Link to="/admin" className="cb-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                    <Settings size={16} />
                    <span>Studio Ingestion CMS</span>
                  </Link>
                )}

                <div className="cb-dropdown-divider" />

                <button onClick={handleLogout} className="cb-dropdown-item cb-dropdown-logout">
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="cb-btn-signin">
              <LogIn size={15} />
              <span>Sign In</span>
            </Link>
          )}

          {/* Hamburger toggle */}
          <button
            className="cb-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default CinebyNavbar;
