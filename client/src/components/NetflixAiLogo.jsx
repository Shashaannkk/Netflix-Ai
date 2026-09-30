import React from 'react';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  CANONICAL NETFLIX AI BRAND LOGO
 *  Standardized across Home, Browse, Movies, TV, Watch Spaces, Create Space, etc.
 * ──────────────────────────────────────────────────────────────────────────────
 */
export const NetflixAiLogo = ({ height = 34, className = '', onClick }) => {
  const numericHeight = typeof height === 'number' ? height : parseInt(height, 10) || 34;

  return (
    <div
      className={`netflix-ai-canonical-logo ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.max(6, Math.round(numericHeight * 0.2))}px`,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Sleek Netflix Curved N Badge */}
      <div
        className="nflx-ai-logo-icon"
        style={{
          width: `${numericHeight}px`,
          height: `${numericHeight}px`,
          borderRadius: `${Math.round(numericHeight * 0.22)}px`,
          background: 'linear-gradient(135deg, #E50914 0%, #B81D24 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 14px rgba(229, 9, 20, 0.5)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: `${Math.round(numericHeight * 0.62)}px`,
            fontFamily: "'Bebas Neue', 'Inter', system-ui, sans-serif",
            lineHeight: 1,
            letterSpacing: '0px',
          }}
        >
          N
        </span>
      </div>

      {/* NETFLIX AI Brand Typography */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: `${Math.max(4, Math.round(numericHeight * 0.15))}px` }}>
        <span
          style={{
            color: '#E50914',
            fontSize: `${Math.max(16, Math.round(numericHeight * 0.72))}px`,
            fontWeight: 900,
            fontFamily: "'Bebas Neue', 'Outfit', 'Inter', sans-serif",
            letterSpacing: '-0.2px',
            textTransform: 'uppercase',
            lineHeight: 1,
            textShadow: '0 2px 10px rgba(0,0,0,0.6)',
          }}
        >
          NETFLIX
        </span>
        <span
          style={{
            fontSize: `${Math.max(10, Math.round(numericHeight * 0.38))}px`,
            fontWeight: 800,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #E50914 0%, #a855f7 100%)',
            color: '#FFFFFF',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(229, 9, 20, 0.4)',
            lineHeight: 1,
          }}
        >
          AI
        </span>
      </div>
    </div>
  );
};

export default NetflixAiLogo;
