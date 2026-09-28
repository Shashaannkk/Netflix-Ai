import React from 'react';

export const CinebyLogo = ({ height = 32, showText = true, className = '' }) => {
  return (
    <div className={`cineby-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
      {/* Netflix AI Red N Icon */}
      <div
        className="cineby-logo-icon"
        style={{
          width: `${height}px`,
          height: `${height}px`,
          borderRadius: `${Math.round(height * 0.25)}px`,
          background: 'linear-gradient(135deg, #E50914 0%, #B81D24 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(229, 9, 20, 0.6)',
          transition: 'transform 0.25s ease',
          flexShrink: 0
        }}
      >
        <span style={{ color: '#fff', fontWeight: 900, fontSize: `${height * 0.65}px`, fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>
          N
        </span>
      </div>

      {/* Netflix AI Brand Name */}
      {showText && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: `${Math.max(18, height * 0.75)}px`,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              fontFamily: "'Bebas Neue', 'Outfit', sans-serif",
              color: '#E50914',
              textTransform: 'uppercase',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            NETFLIX
          </span>
          <span
            style={{
              fontSize: `${Math.max(11, height * 0.38)}px`,
              fontWeight: 800,
              letterSpacing: '0.08em',
              background: 'linear-gradient(135deg, #E50914 0%, #B81D24 100%)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 8px rgba(229, 9, 20, 0.4)'
            }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
};

export default CinebyLogo;


