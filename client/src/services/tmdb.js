import { SERVER_8_CANONICAL_SOURCE } from './movieServers';

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
    videoAssetUrl: SERVER_8_CANONICAL_SOURCE,
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
    videoAssetUrl: SERVER_8_CANONICAL_SOURCE,
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
    videoAssetUrl: SERVER_8_CANONICAL_SOURCE,
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
    videoAssetUrl: SERVER_8_CANONICAL_SOURCE,
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
    videoAssetUrl: SERVER_8_CANONICAL_SOURCE,
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
    videoAssetUrl: SERVER_8_CANONICAL_SOURCE,
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

export const CURATED_ANIME_MOVIES = [
  {
    id: 372058,
    title: 'Your Name.',
    name: 'Your Name.',
    overview: 'High schoolers Mitsuha and Taki are complete strangers living separate lives. But tonight, they suddenly swap places.',
    poster_path: '/q71t1ikWPh.jpg',
    backdrop_path: '/vL5LR6WGlHDiomG2jKJq1RToVw.jpg',
    vote_average: 8.5,
    release_date: '2016-08-26',
    media_type: 'movie',
    trailer_key: 'xU47nhruN-k'
  },
  {
    id: 129,
    title: 'Spirited Away',
    name: 'Spirited Away',
    overview: 'A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon courage.',
    poster_path: '/39wmItEPh1JuOVccjFiBviFjwo3.jpg',
    backdrop_path: '/Ab8mtWfvwyETHYlU2Bx4D93h9p3.jpg',
    vote_average: 8.5,
    release_date: '2001-07-20',
    media_type: 'movie',
    trailer_key: 'ByXuk9QqQkk'
  },
  {
    id: 635302,
    title: 'Demon Slayer: Mugen Train',
    name: 'Demon Slayer: Mugen Train',
    overview: 'Tanjiro Kamado and his friends join Flame Hashira Kyojuro Rengoku aboard the Mugen Train to investigate a series of mysterious disappearances.',
    poster_path: '/h8Rb9gBr48ODKxYvHYeMMmVEiKN.jpg',
    backdrop_path: '/n6bUvigpRFqSwmPp1m2YR4L0LTo.jpg',
    vote_average: 8.3,
    release_date: '2020-10-16',
    media_type: 'movie',
    trailer_key: 'ATJYac_dORw'
  },
  {
    id: 916224,
    title: 'Suzume',
    name: 'Suzume',
    overview: 'A 17-year-old girl named Suzume helps a mysterious young man close doors from the outer side that are releasing disasters all over Japan.',
    poster_path: '/vJU3FwqQCftUzPy2J5ZJqjR56tF.jpg',
    backdrop_path: '/b1Y8SUal2P4KWZ7xD4Y8VG4p2d1.jpg',
    vote_average: 7.9,
    release_date: '2022-11-11',
    media_type: 'movie',
    trailer_key: '5pvh-BstDyo'
  },
  {
    id: 128,
    title: 'Princess Mononoke',
    name: 'Princess Mononoke',
    overview: 'Ashitaka, a prince infected by a demon curse, sets out to find a cure and finds himself in the middle of a war between forest gods and humanity.',
    poster_path: '/c24sv2weTHPsmDa7jE2qYCGqPvw.jpg',
    backdrop_path: '/44Im2yfRiYWjLzFWG6zUKi3xUVE.jpg',
    vote_average: 8.3,
    release_date: '1997-07-12',
    media_type: 'movie',
    trailer_key: '4OiMOHRDs14'
  },
  {
    id: 4935,
    title: "Howl's Moving Castle",
    name: "Howl's Moving Castle",
    overview: 'When Sophie is cursed with an old body by a spiteful witch, her only chance of breaking the spell lies with a self-indulgent wizard.',
    poster_path: '/ye9h80MspgJgK4616238h177LTo.jpg',
    backdrop_path: '/7T654k2j2gK4616238h177LTo.jpg',
    vote_average: 8.4,
    release_date: '2004-11-20',
    media_type: 'movie',
    trailer_key: 'iwROgK94zcM'
  }
];

export const CURATED_ANIME_SERIES = [
  {
    id: 1429,
    name: 'Attack on Titan',
    title: 'Attack on Titan',
    overview: 'After his hometown is destroyed and his mother is killed, Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.',
    poster_path: '/hTP1DtLGFamjW259YuvvjD9XMh3.jpg',
    backdrop_path: '/2me72V9Hk1f4961559y.jpg',
    vote_average: 8.7,
    first_air_date: '2013-04-07',
    media_type: 'tv',
    trailer_key: 'MGRm4IycvXM'
  },
  {
    id: 85937,
    name: 'Demon Slayer: Kimetsu no Yaiba',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    overview: 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.',
    poster_path: '/xUfVStWhxUfVStWhxUfVStWh.jpg',
    backdrop_path: '/nTvM42b8Yv2736yH871Z.jpg',
    vote_average: 8.7,
    first_air_date: '2019-04-06',
    media_type: 'tv',
    trailer_key: 'VQGCKyvzIM4'
  },
  {
    id: 95479,
    name: 'Jujutsu Kaisen',
    title: 'Jujutsu Kaisen',
    overview: 'A boy fights... for "the right death." Hardship, regret, shame: the negative feelings that humans feel become Curses in everyday life.',
    poster_path: '/eDA4559y181h798.jpg',
    backdrop_path: '/j3Z2gK4616238h177LTo.jpg',
    vote_average: 8.6,
    first_air_date: '2020-10-03',
    media_type: 'tv',
    trailer_key: 'pkneV15D7c4'
  },
  {
    id: 37854,
    name: 'One Piece',
    title: 'One Piece',
    overview: 'Monkey D. Luffy sets off on an epic voyage to find the legendary treasure One Piece and become King of the Pirates.',
    poster_path: '/cMD9Ygz11NJJzA2YmuvE2929.jpg',
    backdrop_path: '/2rm281827h9Yv2736yH871Z.jpg',
    vote_average: 8.7,
    first_air_date: '1999-10-20',
    media_type: 'tv',
    trailer_key: 'MCb13lbK6W0'
  },
  {
    id: 118489,
    name: 'Solo Leveling',
    title: 'Solo Leveling',
    overview: 'They say whatever doesn’t kill you makes you stronger, but that’s not the case for the world’s weakest hunter Sung Jinwoo.',
    poster_path: '/181h798xUfVStWhxUfVStWh.jpg',
    backdrop_path: '/981827h9Yv2736yH871Z.jpg',
    vote_average: 8.5,
    first_air_date: '2024-01-07',
    media_type: 'tv',
    trailer_key: '9h_L5xK3Kqw'
  },
  {
    id: 13916,
    name: 'Death Note',
    title: 'Death Note',
    overview: 'Light Yagami is an intelligent high school student who finds a notebook that grants the user the ability to kill anyone whose name and face they know.',
    poster_path: '/iC6718h798xUfVStWhxUfVStWh.jpg',
    backdrop_path: '/t981827h9Yv2736yH871Z.jpg',
    vote_average: 8.6,
    first_air_date: '2006-10-04',
    media_type: 'tv',
    trailer_key: 'NlJZ-YgAt-c'
  }
];

export const fetchTrendingAnimeMovies = async () => {
  const data = await fetchFromTMDB('/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc');
  if (data?.results?.length) return data.results;
  return CURATED_ANIME_MOVIES;
};

export const fetchTopRatedAnimeMovies = async () => {
  const data = await fetchFromTMDB('/discover/movie?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100');
  if (data?.results?.length) return data.results;
  return CURATED_ANIME_MOVIES;
};

export const fetchTrendingAnimeTV = async () => {
  const data = await fetchFromTMDB('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc');
  if (data?.results?.length) return data.results;
  return CURATED_ANIME_SERIES;
};

export const fetchTopRatedAnimeTV = async () => {
  const data = await fetchFromTMDB('/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100');
  if (data?.results?.length) return data.results;
  return CURATED_ANIME_SERIES;
};


export const fetchTrailerCandidates = async (id, type = 'movie') => {
  const data = await fetchFromTMDB(`/${type}/${id}/videos`);
  if (data?.results?.length) {
    const youtubeVideos = data.results.filter((v) => v.site === 'YouTube' && v.key && v.key.trim() !== '');

    const officialTrailers = youtubeVideos.filter(
      (v) => v.type === 'Trailer' && (v.official || (v.name && v.name.toLowerCase().includes('official')))
    );

    const otherTrailers = youtubeVideos.filter(
      (v) => v.type === 'Trailer' && !officialTrailers.includes(v)
    );

    const teasersAndClips = youtubeVideos.filter(
      (v) => (v.type === 'Teaser' || v.type === 'Clip') && !officialTrailers.includes(v) && !otherTrailers.includes(v)
    );

    const remaining = youtubeVideos.filter(
      (v) => !officialTrailers.includes(v) && !otherTrailers.includes(v) && !teasersAndClips.includes(v)
    );

    const candidates = [...officialTrailers, ...otherTrailers, ...teasersAndClips, ...remaining]
      .map((v) => v.key)
      .filter((key, idx, arr) => arr.indexOf(key) === idx);

    if (candidates.length > 0) return candidates;
  }

  const curated = CURATED_MOVIES.find((m) => m.id === Number(id));
  if (curated?.trailer_key) return [curated.trailer_key];

  return ['YoHD9XEInc0', 'qtRKDV93s2s', 'zSWdZVtXT7E', '6ZfuNTqbHE8', 'b9EkMc79ZSU'];
};

export const fetchTrailerKey = async (idOrMedia, type = 'movie') => {
  let targetId = typeof idOrMedia === 'object' ? (idOrMedia.tmdbId || idOrMedia.id) : idOrMedia;
  let titleName = typeof idOrMedia === 'object' ? (idOrMedia.title || idOrMedia.name) : (typeof idOrMedia === 'string' && isNaN(Number(idOrMedia)) ? idOrMedia : null);
  const numericId = typeof targetId === 'number' ? targetId : (!isNaN(Number(targetId)) ? Number(targetId) : null);

  if (numericId) {
    const candidates = await fetchTrailerCandidates(numericId, type);
    if (candidates && candidates.length) return candidates[0];
  }

  if (titleName) {
    const searchRes = await searchMediaFiltered(titleName, 'all');
    if (searchRes && searchRes.length > 0 && searchRes[0].id) {
      const match = searchRes[0];
      const matchType = match.media_type || (match.first_air_date ? 'tv' : type);
      const candidates = await fetchTrailerCandidates(match.id, matchType);
      if (candidates && candidates.length) return candidates[0];
    }
  }

  return 'YoHD9XEInc0';
};

export const fetchMediaDetails = async (idOrMedia, type = 'movie') => {
  if (!idOrMedia) return null;

  let targetId = typeof idOrMedia === 'object' ? (idOrMedia.tmdbId || idOrMedia.id) : idOrMedia;
  let titleName = typeof idOrMedia === 'object' ? (idOrMedia.title || idOrMedia.name) : (typeof idOrMedia === 'string' && isNaN(Number(idOrMedia)) ? idOrMedia : null);
  if (typeof idOrMedia === 'object' && idOrMedia.media_type) {
    type = idOrMedia.media_type;
  }

  const numericId = typeof targetId === 'number' ? targetId : (!isNaN(Number(targetId)) ? Number(targetId) : null);

  if (numericId) {
    const data = await fetchFromTMDB(`/${type}/${numericId}`);
    if (data) {
      const videoKey = await fetchTrailerKey(numericId, type);
      return {
        ...(typeof idOrMedia === 'object' ? idOrMedia : {}),
        ...data,
        tmdbId: numericId,
        id: numericId,
        trailer_key: videoKey,
        media_type: type,
      };
    }
  }

  if (titleName) {
    const searchResults = await searchMediaFiltered(titleName, 'all');
    if (searchResults && searchResults.length > 0) {
      const match = searchResults[0];
      const matchType = match.media_type || (match.first_air_date ? 'tv' : type);
      const videoKey = await fetchTrailerKey(match.id, matchType);
      return {
        ...match,
        ...(typeof idOrMedia === 'object' ? idOrMedia : {}),
        id: match.id,
        tmdbId: match.id,
        trailer_key: videoKey,
        media_type: matchType,
      };
    }
  }

  const curated = CURATED_MOVIES.find(
    (m) => m.id === numericId || (titleName && m.title.toLowerCase() === titleName.toLowerCase())
  );
  if (curated) return { ...(typeof idOrMedia === 'object' ? idOrMedia : {}), ...curated };

  if (typeof idOrMedia === 'object' && idOrMedia !== null) {
    return idOrMedia;
  }

  return null;
};

export const searchMedia = async (query) => {
  return searchMediaFiltered(query, 'all');
};

export const fetchFilteredCategory = async (filter = 'all') => {
  try {
    if (filter === 'bollywood') {
      const data = await fetchFromTMDB('/discover/movie?with_original_language=hi&sort_by=popularity.desc');
      if (data?.results?.length) {
        return data.results.map((item) => ({ ...item, media_type: 'movie' })).slice(0, 7);
      }
      return CURATED_MOVIES.slice(0, 5);
    }
    if (filter === 'hollywood') {
      const data = await fetchFromTMDB('/discover/movie?with_original_language=en&sort_by=popularity.desc');
      if (data?.results?.length) {
        return data.results.map((item) => ({ ...item, media_type: 'movie' })).slice(0, 7);
      }
      return CURATED_MOVIES.slice(0, 5);
    }
    if (filter === 'anime') {
      const data = await fetchFromTMDB('/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc');
      if (data?.results?.length) {
        return data.results.map((item) => ({ ...item, media_type: 'movie' })).slice(0, 7);
      }
      return CURATED_ANIME_MOVIES.slice(0, 5);
    }
    if (filter === 'series') {
      const data = await fetchTrendingTV();
      return (data || []).map((item) => ({ ...item, media_type: 'tv' })).slice(0, 7);
    }
    if (filter === 'movies') {
      const data = await fetchTrendingMovies();
      return (data || []).map((item) => ({ ...item, media_type: 'movie' })).slice(0, 7);
    }
    return [];
  } catch (err) {
    console.warn('[TMDB] Filtered category fetch error:', err);
    return [];
  }
};

export const searchMediaFiltered = async (query, filter = 'all') => {
  if (!query || query.trim() === '') {
    return fetchFilteredCategory(filter);
  }

  let results = [];
  try {
    if (filter === 'bollywood') {
      const data = await fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}&language=hi-IN`);
      results = data?.results || [];
    } else {
      const data = await fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
      results = data?.results || [];
    }
  } catch (err) {
    console.warn('[TMDB Search Error]:', err.message);
  }

  if (!results || !results.length) {
    results = CURATED_MOVIES.filter((m) =>
      m.title.toLowerCase().includes(query.toLowerCase())
    );
  }

  return results.filter((item) => {
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    if (type !== 'movie' && type !== 'tv') return false;

    const lang = (item.original_language || item.language || '').toLowerCase();
    const titleText = (item.title || item.name || '').toLowerCase();
    const isAnimeGenre =
      item.genre_ids?.includes(16) ||
      item.genres?.some((g) => (g.name || g || '').toLowerCase().includes('animation'));

    if (filter === 'hollywood') {
      return lang === 'en' || (!lang && !titleText.includes('hindi'));
    }
    if (filter === 'bollywood') {
      return lang === 'hi' || lang === 'ta' || lang === 'te' || titleText.includes('hindi') || titleText.includes('bollywood');
    }
    if (filter === 'series') {
      return type === 'tv' || Boolean(item.first_air_date);
    }
    if (filter === 'anime') {
      return isAnimeGenre || lang === 'ja';
    }
    if (filter === 'movies') {
      return type === 'movie' || Boolean(item.release_date);
    }
    return true;
  });
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
