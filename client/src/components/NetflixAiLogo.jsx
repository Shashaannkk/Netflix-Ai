import React from 'react';

export const NetflixAiLogo = ({ height = 36, className = '' }) => {
  return (
    <div className={`netflix-ai-logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <img
        src="/netflix-ai-logo.png"
        alt="NETFLIX AI"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
        onError={(e) => {
          // If image file is not found, fallback to styled SVG text logo
          e.target.style.display = 'none';
          if (e.target.nextSibling) {
            e.target.nextSibling.style.display = 'flex';
          }
        }}
      />
      <div
        className="netflix-ai-fallback-logo"
        style={{
          display: 'none',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 900,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '-0.5px'
        }}
      >
        <span style={{ color: '#e50914', fontSize: '1.4rem' }}>NETFLIX</span>
        <span
          style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '1.2rem',
            padding: '1px 5px',
            borderRadius: '4px',
            border: '1px solid rgba(168, 85, 247, 0.4)'
          }}
        >
          AI
        </span>
      </div>
    </div>
  );
};

export default NetflixAiLogo;
