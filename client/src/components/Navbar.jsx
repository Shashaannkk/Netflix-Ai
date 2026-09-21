import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Search, Bell, ChevronDown, Users, Film, User, LogOut, Settings } from 'lucide-react';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`netflix-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-left">
        <Link to="/" className="netflix-logo-link" title="Netflix AI Watch Spaces">
          {/* Authentic Netflix Logo SVG */}
          <svg
            className="netflix-brand-svg"
            viewBox="0 0 111 30"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M105.062 14.28L111 30c-1.75-.25-3.499-.563-5.28-.845l-3.345-8.686-3.437 7.969c-1.687-.282-3.344-.376-5.031-.595l6.042-13.75-5.656-14.156h5.062l3.313 8.843 3.375-8.843h4.969l-5.95 14.343h.001zm-22.406 6.25v7.625c-1.625-.094-3.219-.188-4.813-.25V0h4.813v12.281h6.75v4.5h-6.75v3.75h.001zm-10.438-1.5c0 1.25.063 2.5.125 3.75-1.531-.031-3.094-.063-4.625-.063-.094-1.25-.156-2.5-.156-3.75V4.5h-4.375V0h13.563v4.5h-4.531v14.531h-.001zm-15.656-6.75v8.594c-1.531 0-3.094-.031-4.656-.031V0h4.656v7.719h6.75v4.5h-6.75v.063h.001zm-10.438 8.437c-1.562 0-3.125 0-4.656-.031V0h4.656v20.719h.001zm-14.437.031V0h4.719l6.594 14.375V0h4.594v20.781c-1.625 0-3.219-.031-4.844-.062l-6.344-13.906v13.937h-4.719zm-16.594.25c-1.625 0-3.25.031-4.875.063V0h4.875v20.969h.001z"
            />
          </svg>
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
            <NavLink to="/space" className={({ isActive }) => `netflix-nav-link ${isActive ? 'active' : ''}`}>
              Watch Spaces
              <span className="netflix-nav-badge">AI</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard" className="netflix-nav-link">
              My List
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

        {/* Netflix User Profile Avatar & Dropdown */}
        <div className="nav-profile-menu">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
            alt="Profile Avatar"
            className="nav-avatar-img"
          />
          <ChevronDown size={14} className="profile-dropdown-caret" />

          <div className="profile-dropdown">
            <Link to="/space" className="profile-dropdown-item">
              <Users size={16} />
              <span>Launch Watch Space</span>
            </Link>
            <Link to="/dashboard" className="profile-dropdown-item">
              <Film size={16} />
              <span>Browse Catalog</span>
            </Link>
            <Link to="/admin" className="profile-dropdown-item">
              <Settings size={16} />
              <span>Studio Ingestion CMS</span>
            </Link>

            <div className="profile-dropdown-divider" />

            <Link to="/login" className="profile-dropdown-item">
              <User size={16} />
              <span>Switch Profile</span>
            </Link>
            <Link to="/login" className="profile-dropdown-item">
              <LogOut size={16} />
              <span>Sign out of Netflix</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
