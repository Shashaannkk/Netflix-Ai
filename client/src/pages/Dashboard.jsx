import React from 'react';
import { Film, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  return (
    <div className="placeholder-container">
      <Film className="placeholder-icon" />
      <h1 className="placeholder-title">Media Catalog & Spaces Hub</h1>
      <p className="placeholder-subtitle">
        Browse movies, view AI recommendations, join active rooms with invite codes, or launch your own Watch Space.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Link to="/space" className="btn btn-primary">
          <PlayCircle size={18} />
          <span>Launch Demo Space</span>
        </Link>
      </div>
      <span className="placeholder-tag">Part 2: Content Catalog & Spaces Hub</span>
    </div>
  );
};

export default Dashboard;
