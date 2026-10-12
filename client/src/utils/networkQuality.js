/**
 * networkQuality.js
 * Network speed detection and dynamic trailer quality adaptation.
 * If user network speed is best (fast 4G / broadband), sets max quality (1080p/4K highres).
 */

import { useState, useEffect } from 'react';

/**
 * Evaluates current network bandwidth and latency.
 * Returns quality level: 'best' | 'good' | 'fair' | 'low'
 */
export const detectNetworkQuality = () => {
  if (typeof navigator === 'undefined') {
    return 'best';
  }

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (conn) {
    if (conn.saveData) {
      return 'low';
    }

    const effectiveType = conn.effectiveType; // '4g', '3g', '2g', 'slow-2g'
    const downlink = typeof conn.downlink === 'number' ? conn.downlink : 10; // Mbps
    const rtt = typeof conn.rtt === 'number' ? conn.rtt : 50; // ms

    // Best: 4G with >= 4.5 Mbps downlink or low latency (< 120ms) -> Max Quality (1080p / 4K)
    if (effectiveType === '4g' && (downlink >= 4.5 || rtt < 120)) {
      return 'best';
    }

    // Good: 4G or downlink >= 2 Mbps -> 720p HD
    if (effectiveType === '4g' || downlink >= 2) {
      return 'good';
    }

    // Fair: 3G or downlink >= 0.8 Mbps -> 480p
    if (effectiveType === '3g' || downlink >= 0.8) {
      return 'fair';
    }

    return 'low';
  }

  // Default to best quality when NetworkInformation API is not present
  return 'best';
};

/**
 * Maps quality level to YouTube embed vq parameter and player quality string
 */
export const getYouTubeQualityConfig = (qualityLevel) => {
  switch (qualityLevel) {
    case 'best':
      return {
        vq: 'highres', // YouTube max available (1080p / 1440p / 2160p)
        ytQuality: 'hd1080',
        label: '1080p Full HD (Max)',
        badge: '⚡ Ultra-Fast Network • Max Quality',
        color: '#22c55e',
      };
    case 'good':
      return {
        vq: 'hd720',
        ytQuality: 'hd720',
        label: '720p HD',
        badge: '⚡ Fast Network • HD Quality',
        color: '#38bdf8',
      };
    case 'fair':
      return {
        vq: 'large',
        ytQuality: 'large',
        label: '480p Standard',
        badge: '⚡ Moderate Network • Optimized',
        color: '#f59e0b',
      };
    case 'low':
    default:
      return {
        vq: 'medium',
        ytQuality: 'medium',
        label: '360p Data Saver',
        badge: '⚡ Low Bandwidth • Data Saver',
        color: '#e50914',
      };
  }
};

/**
 * Dispatches postMessage to a YouTube iframe to apply target playback quality
 */
export const applyYouTubeQualityToIframe = (iframeEl, quality = 'highres') => {
  if (!iframeEl || !iframeEl.contentWindow) return;

  const targetQuality = quality === 'best' || quality === 'highres' ? 'hd1080' : quality;

  try {
    const win = iframeEl.contentWindow;
    win.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'setPlaybackQuality',
        args: [targetQuality],
      }),
      '*'
    );
    win.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'setPlaybackQualityRange',
        args: [targetQuality, targetQuality],
      }),
      '*'
    );
  } catch (err) {
    console.warn('[NetworkQuality] Failed to postMessage quality to iframe:', err?.message);
  }
};

/**
 * Custom React Hook for listening to live network quality changes
 */
export const useNetworkQuality = () => {
  const [qualityLevel, setQualityLevel] = useState(detectNetworkQuality);
  const [config, setConfig] = useState(() => getYouTubeQualityConfig(qualityLevel));

  useEffect(() => {
    const updateQuality = () => {
      const nextLevel = detectNetworkQuality();
      setQualityLevel(nextLevel);
      setConfig(getYouTubeQualityConfig(nextLevel));
    };

    updateQuality();

    const conn = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', updateQuality);
    }
    window.addEventListener('online', updateQuality);

    return () => {
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', updateQuality);
      }
      window.removeEventListener('online', updateQuality);
    };
  }, []);

  return {
    qualityLevel,
    isBestQuality: qualityLevel === 'best',
    ...config,
  };
};

export default useNetworkQuality;
