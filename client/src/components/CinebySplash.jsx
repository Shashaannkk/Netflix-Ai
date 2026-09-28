import React, { useEffect, useState } from 'react';
import CinebyLogo from './CinebyLogo';

export const CinebySplash = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setFadeOut(true), 200);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 600);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25 + 15);
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className={`cb-splash ${fadeOut ? 'cb-splash-fade-out' : ''}`}>
      <div className="cb-splash-content">
        <CinebyLogo height={54} />
        
        <div className="cb-splash-tagline">
          Netflix AI • Unlimited Movies, Series & Synced Watch Spaces
        </div>

        <div className="cb-splash-bar">
          <div className="cb-splash-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default CinebySplash;
