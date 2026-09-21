import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Film, Users, Shield, LogIn, UserPlus } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';

export const Navbar = () => {
  return (
    <header className="navbar">
      <Link to="/" className="nav-brand">
        <span className="brand-title">NETFLIX</span>
        <span className="brand-badge">AI SPACES</span>
      </Link>

      <nav className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Film size={17} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/space" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users size={17} />
          <span>Watch Space</span>
        </NavLink>

        <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Shield size={17} />
          <span>Admin</span>
        </NavLink>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ConnectionStatus />

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/login" className="btn btn-outline" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            <LogIn size={15} />
            <span>Sign In</span>
          </Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            <UserPlus size={15} />
            <span>Sign Up</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
