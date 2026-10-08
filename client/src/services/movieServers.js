/**
 * Shared Movie Server & Provider Registry
 * Authoritative 8-Server Architecture used by both normal Movie Player (CinebyModal)
 * and Watch Together AI Spaces (WatchSpace / NetflixVideoPlayer).
 */

export const getBackendMediaUrl = (path = '/api/media/watch-together-demo.mp4') => {
  if (typeof window !== 'undefined') {
    const envUrl = import.meta.env.VITE_API_BASE_URL;

    if (
      envUrl &&
      !envUrl.includes('localhost') &&
      !envUrl.includes('127.0.0.1')
    ) {
      const serverOrigin = envUrl.replace(/\/api\/?$/, '');
      return `${serverOrigin}${path}`;
    }

    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:5000${path}`;
    }

    return `${window.location.origin}${path}`;
  }

  return `http://localhost:5000${path}`;
};

/**
 * Server 8 — Original direct HTML5 demo source.
 * DO NOT use this for Server 9.
 */
export const SERVER_8_CANONICAL_SOURCE =
  getBackendMediaUrl('/api/media/watch-together-demo.mp4');

/**
 * Server 9 — Watch Together Kantara source.
 * This is intentionally separate from Server 8.
 */
export const SERVER_9_KANTARA_SOURCE =
  getBackendMediaUrl('/media/kantara-chapter-1.mp4');

/**
 * Watch Together configuration.
 *
 * This remains the original demo configuration so existing
 * Server 8 functionality is not accidentally changed.
 */
export const WATCH_TOGETHER_DEMO_CONFIG = {
  title: 'Watch Together Demo — Tears of Steel',
  movieIdentifier: 'watch-together-demo',
  tmdbId: 964980,

  // Server 8 remains the canonical source for the original demo.
  authorizedVideoSource: SERVER_8_CANONICAL_SOURCE,

  availableAudioLanguages: [
    { code: 'en', label: 'English (Original)' },
    { code: 'hi', label: 'Hindi (Dubbed)' }
  ],

  availableSubtitles: [
    { code: 'off', label: 'Off' },
    { code: 'en', label: 'English Subtitles' }
  ],

  availableQualities: ['1080p (Full HD)'],

  availableRates: [
    0.5,
    0.75,
    1,
    1.25,
    1.5,
    1.75,
    2
  ],

  defaultLanguage: 'en',
  defaultSubtitle: 'off',
  defaultQuality: '1080p (Full HD)',
  defaultSpeed: 1
};

/**
 * Authoritative Movie Server Registry
 */
export const MOVIE_SERVERS = [
  {
    id: 1,
    name: 'Server 1',
    label: 'Server 1 (Full HD 1080p)',
    provider: 'Vidsrc.me Engine',
    badge: 'Working Default',
    icon: '🚀',
    bullets: [
      'Full HD 1080p',
      'TMDB ID Direct Link',
      'Vidsrc.me'
    ]
  },

  {
    id: 2,
    name: 'Server 2',
    label: 'Server 2 (4K Ultra HD)',
    provider: 'AutoEmbed Engine',
    badge: '4K Mirror',
    icon: '⚡',
    bullets: [
      '4K Ultra HD',
      'AutoEmbed Provider',
      'Fast Mirror'
    ]
  },

  {
    id: 3,
    name: 'Server 3',
    label: 'Server 3 (Fast Mirror)',
    provider: 'Vidsrc.to Engine',
    badge: 'High Speed',
    icon: '🌐',
    bullets: [
      'Vidsrc.to Provider',
      'Fast Loading',
      'Global Mirror'
    ]
  },

  {
    id: 4,
    name: 'Server 4',
    label: 'Server 4 (AI Stream)',
    provider: '2Embed Engine',
    badge: 'Multi-Sub',
    icon: '🛡️',
    bullets: [
      '2Embed Provider',
      'Multi-Language Subtitles',
      'Stable'
    ]
  },

  {
    id: 5,
    name: 'Server 5',
    label: 'Server 5 (2Embed Stream)',
    provider: 'VidBinge Engine',
    badge: 'Backup HD',
    icon: '🎬',
    bullets: [
      'VidBinge Provider',
      'HD Stream',
      'Low Latency'
    ]
  },

  {
    id: 6,
    name: 'Server 6',
    label: 'Server 6 (Vidsrc Engine)',
    provider: 'Vidsrc.me Engine',
    badge: 'Direct Stream',
    icon: '📡',
    bullets: [
      'Vidsrc.me Provider',
      'TMDB ID Direct Link',
      'Reliable'
    ]
  },

  {
    id: 7,
    name: 'Server 7',
    label: 'Server 7 (Smashy Backup)',
    provider: 'SmashyStream Engine',
    badge: 'Fallback Mirror',
    icon: '🎥',
    bullets: [
      'SmashyStream Provider',
      'Fallback Mirror',
      'Clean Embed'
    ]
  },

  {
    id: 8,
    name: 'Server 8',
    label: 'Server 8 (Direct HTML5 Sync)',
    provider: 'Direct HTML5 Demo Engine',
    badge: 'Native Sync Demo',
    icon: '🎞️',
    bullets: [
      'HTML5 Direct MP4 Demo',
      'AI Auto-Sync & Drift Engine',
      'Direct Media Test Source'
    ]
  },

  {
    id: 9,
    name: 'Server 9',
    label: 'Server 9 — Watch Together Demo',
    provider: 'Watch Together Synchronized Demo Engine',
    badge: 'SYNC DEMO',
    icon: '✨',
    bullets: [
      'Full Watch Together Synchronization',
      'Host Authoritative Control',
      'Multi-Audio & Subtitles',
      'Drift Correction'
    ]
  }
];

export const SERVERS = MOVIE_SERVERS;

export default MOVIE_SERVERS;

/**
 * Clean & Validate TMDB ID from arbitrary inputs
 * (object, string, internal ID)
 *
 * Returns a valid numeric ID, IMDb string, or null if invalid.
 */
export const cleanTmdbId = (rawId) => {
  if (!rawId) return null;

  if (
    typeof rawId === 'number' &&
    Number.isInteger(rawId) &&
    rawId > 0
  ) {
    return rawId;
  }

  if (typeof rawId === 'object' && rawId !== null) {
    if (rawId.tmdbId) {
      const res = cleanTmdbId(rawId.tmdbId);
      if (res) return res;
    }

    if (rawId.id) {
      const res = cleanTmdbId(rawId.id);
      if (res) return res;
    }
  }

  const str = String(rawId).trim();

  // Pure digits
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // Digits with prefix like tmdb-550
  const digitsMatch = str.match(
    /(?:tmdb|movie|tv)[_-]?(\d+)/i
  );

  if (digitsMatch) {
    return parseInt(digitsMatch[1], 10);
  }

  // IMDb format tt1234567
  if (/^tt\d+$/.test(str)) {
    return str;
  }

  // Invalid non-numeric internal string
  // like tmdb-movie-6abdfc0202974c0e926fdf3c
  return null;
};

/**
 * Generate precise stream URL for any server index 1..9
 */
export const getServerStreamUrl = ({
  tmdbId,
  isTv = false,
  season = 1,
  episode = 1,
  serverNum = 1
}) => {
  const num = Number(serverNum) || 1;

  /**
   * Server 8
   * Original direct HTML5 demo source.
   */
  if (num === 8) {
    return SERVER_8_CANONICAL_SOURCE;
  }

  /**
   * Server 9
   * Watch Together synchronized Kantara source.
   */
  if (num === 9) {
    return SERVER_9_KANTARA_SOURCE;
  }

  const cleanId = cleanTmdbId(tmdbId);

  if (!cleanId) {
    return null; // Signals invalid stream identifier
  }

  if (isTv) {
    switch (num) {
      case 1:
        return `https://vidsrc.me/embed/tv?tmdb=${cleanId}&season=${season}&episode=${episode}`;

      case 2:
        return `https://player.autoembed.cc/embed/tv/${cleanId}/${season}/${episode}`;

      case 3:
        return `https://vidsrc.to/embed/tv/${cleanId}/${season}/${episode}`;

      case 4:
        return `https://www.2embed.cc/embedtv/${cleanId}&s=${season}&e=${episode}`;

      case 5:
        return `https://vidbinge.dev/embed/tv/${cleanId}/${season}/${episode}`;

      case 6:
        return `https://vidsrc.me/embed/tv?tmdb=${cleanId}&season=${season}&episode=${episode}`;

      case 7:
        return `https://embed.smashystream.com/playere.php?tmdb=${cleanId}&season=${season}&episode=${episode}`;

      default:
        return `https://vidsrc.me/embed/tv?tmdb=${cleanId}&season=${season}&episode=${episode}`;
    }
  } else {
    switch (num) {
      case 1:
        return `https://vidsrc.me/embed/movie?tmdb=${cleanId}`;

      case 2:
        return `https://player.autoembed.cc/embed/movie/${cleanId}`;

      case 3:
        return `https://vidsrc.to/embed/movie/${cleanId}`;

      case 4:
        return `https://www.2embed.cc/embed/${cleanId}`;

      case 5:
        return `https://vidbinge.dev/embed/movie/${cleanId}`;

      case 6:
        return `https://vidsrc.me/embed/movie?tmdb=${cleanId}`;

      case 7:
        return `https://embed.smashystream.com/playere.php?tmdb=${cleanId}`;

      default:
        return `https://vidsrc.me/embed/movie?tmdb=${cleanId}`;
    }
  }
};

/**
 * Helper to check if a URL is an actual YouTube URL
 */
export const isYouTubeUrl = (url) => {
  if (!url || typeof url !== 'string') return false;

  return Boolean(
    url.includes('youtube.com') ||
    url.includes('youtube-nocookie.com') ||
    url.includes('youtu.be')
  );
};

/**
 * Extract 11-character YouTube video ID
 * from a valid YouTube URL
 */
export const getYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;

  if (!isYouTubeUrl(url)) return null;

  const vMatch = url.match(
    /[?&]v=([a-zA-Z0-9_-]{11})/
  );

  if (vMatch) {
    return vMatch[1];
  }

  const beMatch = url.match(
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  );

  if (beMatch) {
    return beMatch[1];
  }

  const embedMatch = url.match(
    /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/
  );

  if (embedMatch) {
    return embedMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
};

/**
 * Check if a URL is an obsolete or broken sample media URL
 * (e.g. Google Cloud sample URLs)
 */
export const isObsoleteSampleUrl = (url) => {
  if (!url || typeof url !== 'string') return false;

  return (
    url.includes(
      'commondatastorage.googleapis.com/gtv-videos-bucket/sample/'
    ) ||
    url.includes(
      'storage.googleapis.com/gtv-videos-bucket/sample/'
    )
  );
};

/**
 * Classify stream source type:
 * 'DIRECT_MEDIA' | 'YOUTUBE' | 'EMBED_PROVIDER' | 'INVALID'
 */
export const classifySource = (url) => {
  if (
    !url ||
    typeof url !== 'string' ||
    url.trim() === '' ||
    url === 'null' ||
    url === 'undefined'
  ) {
    return 'INVALID';
  }

  const cleanUrl = url.trim();

  // Reject malformed internal tmdb-movie string
  if (
    cleanUrl.includes('tmdb-movie-') ||
    cleanUrl.includes('tmdb=null') ||
    cleanUrl.includes('tmdb=undefined')
  ) {
    return 'INVALID';
  }

  // YouTube
  if (isYouTubeUrl(cleanUrl)) {
    const ytId = getYouTubeVideoId(cleanUrl);

    return ytId ? 'YOUTUBE' : 'INVALID';
  }

  // Direct HTML5 Media
  // (.mp4, .mkv, .webm, .m3u8, /media/, or local asset source)
  if (
    cleanUrl === SERVER_8_CANONICAL_SOURCE ||
    cleanUrl === SERVER_9_KANTARA_SOURCE ||
    cleanUrl.includes('Kantara') ||
    cleanUrl.includes('kantara') ||
    cleanUrl.includes('/media/') ||
    cleanUrl.endsWith('.mkv') ||
    cleanUrl.includes('.mkv?') ||
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.includes('.mp4?') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.m3u8') ||
    cleanUrl.includes('vjs.zencdn.net') ||
    cleanUrl.includes('googleapis.com') ||
    cleanUrl.includes('w3.org')
  ) {
    return 'DIRECT_MEDIA';
  }

  // Third-Party Provider (Servers 1-7)
  if (
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://')
  ) {
    return 'EMBED_PROVIDER';
  }

  return 'INVALID';
};

/**
 * Single authoritative player mode decision:
 * 'native' | 'provider' | 'invalid'
 */
export const getPlayerMode = (url, serverNum = null) => {
  const num = Number(serverNum);

  /**
   * Servers 8 and 9 are always native HTML5 players.
   */
  if (num === 8 || num === 9) {
    return 'native';
  }

  if (
    url &&
    (
      url === SERVER_8_CANONICAL_SOURCE ||
      url === SERVER_9_KANTARA_SOURCE ||
      url.includes('/api/media/') ||
      url.includes('/media/') ||
      url.includes('kantara')
    )
  ) {
    return 'native';
  }

  const type = classifySource(url);

  if (type === 'DIRECT_MEDIA') {
    return 'native';
  }

  if (
    type === 'EMBED_PROVIDER' ||
    type === 'YOUTUBE'
  ) {
    return 'provider';
  }

  return 'invalid';
};

/**
 * Helper to check if a URL is an iframe embed provider
 * (Servers 1-7 or YouTube embeds)
 */
export const isEmbedProviderUrl = (url) => {
  return getPlayerMode(url) === 'provider';
};