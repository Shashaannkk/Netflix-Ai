/**
 * Shared Movie Server & Provider Registry
 * Authoritative 8-Server Architecture used by both normal Movie Player (CinebyModal)
 * and Watch Together AI Spaces (WatchSpace / NetflixVideoPlayer).
 */

export const MOVIE_SERVERS = [
  {
    id: 1,
    name: 'Server 1',
    label: 'Server 1 (Full HD 1080p)',
    provider: 'Vidsrc.pro Engine',
    badge: 'Working Default',
    icon: '🚀',
    bullets: ['Full HD 1080p', 'Working Default Engine', 'Vidsrc.pro']
  },
  {
    id: 2,
    name: 'Server 2',
    label: 'Server 2 (4K Ultra HD)',
    provider: 'AutoEmbed Engine',
    badge: '4K Mirror',
    icon: '⚡',
    bullets: ['4K Ultra HD', 'AutoEmbed Provider', 'Fast Mirror']
  },
  {
    id: 3,
    name: 'Server 3',
    label: 'Server 3 (Fast Mirror)',
    provider: 'Vidsrc.to Engine',
    badge: 'High Speed',
    icon: '🌐',
    bullets: ['Vidsrc.to Provider', 'Fast Loading', 'Global Mirror']
  },
  {
    id: 4,
    name: 'Server 4',
    label: 'Server 4 (AI Stream)',
    provider: '2Embed Engine',
    badge: 'Multi-Sub',
    icon: '🛡️',
    bullets: ['2Embed Provider', 'Multi-Language Subtitles', 'Stable']
  },
  {
    id: 5,
    name: 'Server 5',
    label: 'Server 5 (2Embed Stream)',
    provider: 'VidBinge Engine',
    badge: 'Backup HD',
    icon: '🎬',
    bullets: ['VidBinge Provider', 'HD Stream', 'Low Latency']
  },
  {
    id: 6,
    name: 'Server 6',
    label: 'Server 6 (Vidsrc Engine)',
    provider: 'Vidsrc.me Engine',
    badge: 'Direct Stream',
    icon: '📡',
    bullets: ['Vidsrc.me Provider', 'TMDB ID Direct Link', 'Reliable']
  },
  {
    id: 7,
    name: 'Server 7',
    label: 'Server 7 (Smashy Backup)',
    provider: 'SmashyStream Engine',
    badge: 'Fallback Mirror',
    icon: '🎥',
    bullets: ['SmashyStream Provider', 'Fallback Mirror', 'Clean Embed']
  },
  {
    id: 8,
    name: 'Server 8',
    label: 'Server 8 (Demo Video Player)',
    provider: 'Demo MP4 Engine',
    badge: 'HTML5 Direct',
    icon: '🎞️',
    bullets: ['HTML5 Direct MP4', 'Tears of Steel Sample', 'Custom Sync Engine']
  }
];

export const SERVERS = MOVIE_SERVERS;
export default MOVIE_SERVERS;

/**
 * Generate precise stream URL for any server index 1..8
 */
export const getServerStreamUrl = ({ tmdbId = 550, isTv = false, season = 1, episode = 1, serverNum = 1 }) => {
  const cleanId = tmdbId || 550;
  const num = Number(serverNum) || 1;

  if (isTv) {
    switch (num) {
      case 1: return `https://vidsrc.pro/embed/tv/${cleanId}/${season}/${episode}`;
      case 2: return `https://player.autoembed.cc/embed/tv/${cleanId}/${season}/${episode}`;
      case 3: return `https://vidsrc.to/embed/tv/${cleanId}/${season}/${episode}`;
      case 4: return `https://www.2embed.cc/embedtv/${cleanId}&s=${season}&e=${episode}`;
      case 5: return `https://vidbinge.dev/embed/tv/${cleanId}/${season}/${episode}`;
      case 6: return `https://vidsrc.me/embed/tv?tmdb=${cleanId}&season=${season}&episode=${episode}`;
      case 7: return `https://embed.smashystream.com/playere.php?tmdb=${cleanId}&season=${season}&episode=${episode}`;
      case 8: return `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4`;
      default: return `https://vidsrc.pro/embed/tv/${cleanId}/${season}/${episode}`;
    }
  } else {
    switch (num) {
      case 1: return `https://vidsrc.pro/embed/movie/${cleanId}`;
      case 2: return `https://player.autoembed.cc/embed/movie/${cleanId}`;
      case 3: return `https://vidsrc.to/embed/movie/${cleanId}`;
      case 4: return `https://www.2embed.cc/embed/${cleanId}`;
      case 5: return `https://vidbinge.dev/embed/movie/${cleanId}`;
      case 6: return `https://vidsrc.me/embed/movie?tmdb=${cleanId}`;
      case 7: return `https://embed.smashystream.com/playere.php?tmdb=${cleanId}`;
      case 8: return `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4`;
      default: return `https://vidsrc.pro/embed/movie/${cleanId}`;
    }
  }
};

/**
 * Helper to check if a URL is an iframe embed provider (Servers 1-7 or YouTube embeds)
 */
export const isEmbedProviderUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return Boolean(
    url.includes('vidsrc') ||
    url.includes('autoembed') ||
    url.includes('2embed') ||
    url.includes('vidbinge') ||
    url.includes('smashystream') ||
    url.includes('youtube') ||
    url.includes('youtu.be') ||
    url.includes('embed') ||
    (!url.endsWith('.mp4') && !url.endsWith('.webm'))
  );
};
