const TMDB_API_KEYS = [
  import.meta.env.VITE_TMDB_API_KEY,
  '484366b7235bc8db84aba0f9e3b1bec6',
  '3fd2be6f0c70a2a598f084dd27548773',
  '8414042854378f4b0d015c92c8137359'
].filter(Boolean);
const BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

// High quality fallback catalog for offline or rate-limit scenarios
export const CURATED_MOVIES = [
  {
    id: 550,
    title: 'Fight Club',
    overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/hZkgoQY85KGWFToRyMzpGUzYyL1.jpg',
    vote_average: 8.4,
    release_date: '1999-10-15',
    media_type: 'movie',
    trailer_key: 'qtRKDV93s2s',
    videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    genres: ['Drama', 'Thriller']
  },
  {
    id: 157336,
    title: 'Interstellar',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: '/xJHokMbljvjADYdit5fK5VQsX2P.jpg',
    vote_average: 8.4,
    release_date: '2014-11-05',
    media_type: 'movie',
    trailer_key: 'zSWdZVtXT7E',
    videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    genres: ['Adventure', 'Drama', 'Science Fiction']
  },
  {
    id: 27205,
    title: 'Inception',
    overview: 'Cobb, a skilled thief who steals valuable secrets from deep within the subconscious during the dream state, is offered a chance at redemption.',
    poster_path: '/ljs28TShoGJm2Z1JuUQj89v29mh.jpg',
    backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHAiE9.jpg',
    vote_average: 8.36,
    release_date: '2010-07-15',
    media_type: 'movie',
    trailer_key: 'YoHD9XEInc0',
    videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    genres: ['Action', 'Science Fiction', 'Adventure']
  },
  {
    id: 299536,
    title: 'Avengers: Infinity War',
    overview: 'As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows.',
    poster_path: '/7WsyChLLEzcqIFv2VwMvy2JvWus.jpg',
    backdrop_path: '/mGJuB4srZk22wF2Z1gCh5neYrS0.jpg',
    vote_average: 8.3,
    release_date: '2018-04-25',
    media_type: 'movie',
    trailer_key: '6ZfuNTqbHE8',
    videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    genres: ['Action', 'Adventure', 'Science Fiction']
  },
  {
    id: 155,
    title: 'The Dark Knight',
    overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_path: '/nMK2819TyqLn2B8ydfZ3GsKMmwh.jpg',
    vote_average: 8.5,
    release_date: '2008-07-16',
    media_type: 'movie',
    trailer_key: 'EXeTwQWrcwY',
    videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    genres: ['Drama', 'Action', 'Crime', 'Thriller']
  },
  {
    id: 671,
    title: "Harry Potter and the Philosopher's Stone",
    overview: 'Harry Potter has lived under the stairs at his aunt and uncle’s house his whole life. But on his 11th birthday, he learns he’s a powerful wizard.',
    poster_path: '/wuMc08IPKEatf9rnMNXvFFxqYyW.jpg',
    backdrop_path: '/hziih1KxQ1K045Y4p2UvE45v1X1.jpg',
    vote_average: 7.9,
    release_date: '2001-11-16',
    media_type: 'movie',
    trailer_key: 'VyHV0BRmydw',
    videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    genres: ['Adventure', 'Fantasy']
  }
];

export const fetchFromTMDB = async (endpoint) => {
  for (const key of TMDB_API_KEYS) {
    try {
      const connector = endpoint.includes('?') ? '&' : '?';
      const url = `${BASE_URL}${endpoint}${connector}api_key=${key}`;
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`[TMDB Key Retry] ${endpoint}:`, err.message);
    }
  }
  return null;
};

export const getImageUrl = (path, isBackdrop = false) => {
  if (!path) {
    return isBackdrop
      ? 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop';
  }
  if (path.startsWith('http')) return path;
  return `${isBackdrop ? TMDB_BACKDROP_BASE : TMDB_IMAGE_BASE}${path}`;
};

export const fetchTrendingMovies = async () => {
  const data = await fetchFromTMDB('/trending/movie/week');
  if (data?.results?.length) return data.results;
  return CURATED_MOVIES;
};

export const fetchTrendingTV = async () => {
  const data = await fetchFromTMDB('/trending/tv/week');
  if (data?.results?.length) return data.results;
  return [
    {
      id: 1399,
      name: 'Game of Thrones',
      title: 'Game of Thrones',
      overview: 'Seven noble families fight for control of the mythical land of Westeros.',
      poster_path: '/1XS1oqL89vEDgZ1ygr1j81GGlBL.jpg',
      backdrop_path: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
      vote_average: 8.4,
      first_air_date: '2011-04-17',
      media_type: 'tv',
      trailer_key: 'KPLWWIOCOOQ'
    },
    {
      id: 66732,
      name: 'Stranger Things',
      title: 'Stranger Things',
      overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
      poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
      backdrop_path: '/56v2Kj2EfZmO2g1vTz2W88Y124d.jpg',
      vote_average: 8.6,
      first_air_date: '2016-07-15',
      media_type: 'tv',
      trailer_key: 'b9EkMc79ZSU'
    },
    {
      id: 94605,
      name: 'Arcane',
      title: 'Arcane',
      overview: 'Amid the mythological city of Piltover and the underground of Zaun, two sisters fight on rival sides of a war between magic and technology.',
      poster_path: '/fqld2v21y2w2Bv22F6lG2H1234.jpg',
      backdrop_path: '/rk281827h9Yv2736yH871Z.jpg',
      vote_average: 8.7,
      first_air_date: '2021-11-06',
      media_type: 'tv',
      trailer_key: 'fXmAurh012s'
    }
  ];
};

export const fetchPopularMovies = async () => {
  const data = await fetchFromTMDB('/movie/popular');
  if (data?.results?.length) return data.results;
  return CURATED_MOVIES;
};

export const fetchPopularTV = async () => {
  const data = await fetchFromTMDB('/tv/popular');
  if (data?.results?.length) return data.results;
  return await fetchTrendingTV();
};

export const fetchTopRatedMovies = async () => {
  const data = await fetchFromTMDB('/movie/top_rated');
  if (data?.results?.length) return data.results;
  return CURATED_MOVIES;
};

export const fetchUpcomingMovies = async () => {
  const data = await fetchFromTMDB('/movie/upcoming');
  if (data?.results?.length) return data.results;
  return CURATED_MOVIES;
};

export const fetchTrailerKey = async (id, type = 'movie') => {
  const data = await fetchFromTMDB(`/${type}/${id}/videos`);
  if (data?.results?.length) {
    const officialTrailer = data.results.find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.name && v.name.toLowerCase().includes('official')
    ) || data.results.find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    ) || data.results.find(
      (v) => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip')
    ) || data.results[0];

    if (officialTrailer?.key) return officialTrailer.key;
  }
  // Check curated list fallback
  const curated = CURATED_MOVIES.find((m) => m.id === Number(id));
  if (curated?.trailer_key) return curated.trailer_key;
  // Default fallback popular trailers
  return 'YoHD9XEInc0'; // Inception official trailer
};

export const fetchMediaDetails = async (id, type = 'movie') => {
  const data = await fetchFromTMDB(`/${type}/${id}`);
  if (data) {
    const videoKey = await fetchTrailerKey(id, type);
    return { ...data, trailer_key: videoKey, media_type: type };
  }
  const curated = CURATED_MOVIES.find((m) => m.id === Number(id));
  if (curated) return curated;
  return null;
};

export const searchMedia = async (query) => {
  if (!query || query.trim() === '') return [];
  const data = await fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
  if (data?.results?.length) {
    return data.results.filter(
      (item) => item.media_type === 'movie' || item.media_type === 'tv'
    );
  }
  return CURATED_MOVIES.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase())
  );
};

export const fetchMediaCredits = async (id, type = 'movie') => {
  const data = await fetchFromTMDB(`/${type}/${id}/credits`);
  if (data?.cast?.length) {
    return {
      cast: data.cast.slice(0, 10).map((c) => ({ name: c.name, character: c.character, profile_path: c.profile_path })),
      crew: (data.crew || []).filter((c) => c.job === 'Director').map((c) => c.name),
    };
  }
  return {
    cast: [
      { name: 'Leonardo DiCaprio', character: 'Dominick Cobb' },
      { name: 'Joseph Gordon-Levitt', character: 'Arthur' },
      { name: 'Elliot Page', character: 'Ariadne' },
      { name: 'Tom Hardy', character: 'Eames' },
    ],
    crew: ['Christopher Nolan'],
  };
};

export const fetchSimilarMedia = async (id, type = 'movie') => {
  const data = await fetchFromTMDB(`/${type}/${id}/recommendations`);
  if (data?.results?.length) return data.results.slice(0, 9);
  const dataSimilar = await fetchFromTMDB(`/${type}/${id}/similar`);
  if (dataSimilar?.results?.length) return dataSimilar.results.slice(0, 9);
  return CURATED_MOVIES.filter((m) => String(m.id) !== String(id)).slice(0, 6);
};

export const fetchSeasonEpisodes = async (tvId, seasonNumber = 1) => {
  const data = await fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}`);
  if (data?.episodes?.length) {
    return data.episodes.map((ep) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      name: ep.name,
      overview: ep.overview || 'Episode synopsis preview available upon streaming.',
      runtime: ep.runtime || 45,
      still_path: ep.still_path,
      vote_average: ep.vote_average ? ep.vote_average.toFixed(1) : '8.2',
    }));
  }
  // Curated fallback episodes
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `ep-${i + 1}`,
    episode_number: i + 1,
    name: `Episode ${i + 1}: Chapter ${i + 1}`,
    overview: `An unexpected revelation forces the team to confront their secrets as the stakes escalate.`,
    runtime: 48,
    still_path: null,
    vote_average: (8.0 + (i % 5) * 0.2).toFixed(1),
  }));
};

export const fetchMovieCollection = async (collectionId) => {
  if (!collectionId) return [];
  const data = await fetchFromTMDB(`/collection/${collectionId}`);
  if (data?.parts?.length) {
    return data.parts.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
  }
  return [];
};
