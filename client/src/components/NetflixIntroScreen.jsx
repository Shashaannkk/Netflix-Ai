import React, { useEffect, useState, useRef } from 'react';

/**
 * NetflixIntroScreen — Authentic Netflix AI Sound & Visual Splash Intro Component
 * Renders the iconic red cinematic logo animation prior to movie/video playback.
 */
export const NetflixIntroScreen = ({ onComplete, title = 'NETFLIX AI' }) => {
  const [fading, setFading] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Web Audio API synth sound effect for authentic "TA-DUM" boom!
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      }
    } catch {}

    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1800);

    const endTimer = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 2300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, []);

  return (
    <div
      className={`netflix-intro-screen ${fading ? 'fade-out' : ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 999,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.5s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div className="netflix-intro-logo-container">
        <svg
          viewBox="0 0 110 160"
          className="netflix-intro-n-svg"
          style={{ width: '90px', height: '130px' }}
        >
          {/* Left Ribbon */}
          <rect x="10" y="10" width="26" height="140" fill="#E50914" />
          {/* Right Ribbon */}
          <rect x="74" y="10" width="26" height="140" fill="#E50914" />
          {/* Diagonal Ribbon Overlay */}
          <path
            d="M10 10 L74 150 L100 150 L36 10 Z"
            fill="#B81D24"
            style={{ filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.8))' }}
          />
        </svg>

        <div className="netflix-intro-text">NETFLIX AI</div>
      </div>

      <style>{`
        .netflix-intro-logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.2rem;
          animation: netflixZoom 2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
        }

        .netflix-intro-n-svg {
          filter: drop-shadow(0 0 25px rgba(229, 9, 20, 0.8));
          animation: nGlow 1.8s ease-in-out infinite alternate;
        }

        .netflix-intro-text {
          font-family: 'Bebas Neue', 'Outfit', sans-serif;
          font-size: 2.2rem;
          letter-spacing: 6px;
          color: #E50914;
          font-weight: 900;
          text-shadow: 0 0 20px rgba(229, 9, 20, 0.9), 0 0 40px rgba(229, 9, 20, 0.5);
          animation: textPulse 1.8s ease-in-out infinite alternate;
        }

        @keyframes netflixZoom {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          30% {
            transform: scale(1.05);
            opacity: 1;
          }
          70% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0.9;
          }
        }

        @keyframes nGlow {
          0% { filter: drop-shadow(0 0 15px rgba(229, 9, 20, 0.6)); }
          100% { filter: drop-shadow(0 0 35px rgba(229, 9, 20, 0.95)); }
        }

        @keyframes textPulse {
          0% { opacity: 0.85; }
          100% { opacity: 1; text-shadow: 0 0 25px rgba(229,9,20,1); }
        }
      `}</style>
    </div>
  );
};

export default NetflixIntroScreen;
