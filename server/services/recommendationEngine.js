import Title from '../models/Title.js';
import UserInteraction from '../models/UserInteraction.js';
import User from '../models/User.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  HYBRID ADVANCED RECOMMENDATION ENGINE
 *
 *  Computes personalized content recommendations using multi-dimensional signals:
 *   1. Genre Affinity (Explicit user preferences + Implicit watch history ratings)
 *   2. Tag & Keyword Overlap (Extracted from history & title tags)
 *   3. Duration / Content Length Preference Band (<30m, 30-60m, 60-120m, >120m)
 *   4. Rating & Completion Weighting (Higher ratings & full completions boost weight)
 *   5. Collaborative Signals (Co-watched peer history & ratings)
 *   6. Dynamic Match Reason Generation ("Because you watch 90-120m Sci-Fi movies")
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Duration Band Helper
const getDurationBand = (durationSeconds) => {
  if (!durationSeconds || durationSeconds <= 0) return 'medium'; // default feature
  const mins = durationSeconds / 60;
  if (mins < 35) return 'short'; // <35m (Anime episode / Sitcom / Short)
  if (mins <= 65) return 'medium-short'; // 35-65m (TV Episode / Drama)
  if (mins <= 130) return 'feature'; // 65-130m (Standard Feature Film)
  return 'epic'; // >130m (Extended / Epic Movie)
};

const DURATION_BAND_LABELS = {
  'short': 'Quick Watches (<35 mins)',
  'medium-short': 'TV Drama Episodes (45-60 mins)',
  'feature': 'Feature Movies (90-120 mins)',
  'epic': 'Epic Cinema (>120 mins)',
};

export const generateHybridRecommendations = async (userId, limit = 10) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) return [];

    // 1. Fetch user's interaction history
    const userInteractions = await UserInteraction.find({ userId }).populate('titleId').lean();
    const watchedTitleIds = new Set(userInteractions.map((i) => i.titleId?._id?.toString() || i.titleId?.toString()));

    // 2. Extract multi-dimensional user preference vectors
    const genreScores = {};
    const tagScores = {};
    const durationBandCounts = { short: 0, 'medium-short': 0, feature: 0, epic: 0 };
    let totalInteractionWeight = 0;

    // Explicit preferences from user profile
    (user.preferences?.favoriteGenres || []).forEach((g) => {
      genreScores[g.toLowerCase()] = (genreScores[g.toLowerCase()] || 0) + 15;
    });

    // Implicit history signals
    userInteractions.forEach((interaction) => {
      // Weight derived from rating (1-5) and completion status
      const userRating = interaction.rating || (interaction.completed ? 4 : 3);
      const completionMultiplier = interaction.completed ? 1.5 : (interaction.watchedSeconds > 300 ? 1.0 : 0.5);
      const interactionWeight = userRating * completionMultiplier;
      totalInteractionWeight += interactionWeight;

      // A. Genre Signals
      const genres = interaction.genreAffinity || interaction.titleId?.genres || [];
      genres.forEach((g) => {
        const lowerG = g.toLowerCase();
        genreScores[lowerG] = (genreScores[lowerG] || 0) + interactionWeight * 4;
      });

      // B. Tag Signals
      const tags = interaction.tags || interaction.titleId?.tags || [];
      tags.forEach((t) => {
        const lowerT = t.toLowerCase();
        tagScores[lowerT] = (tagScores[lowerT] || 0) + interactionWeight * 3;
      });

      // C. Duration Band Signals
      const durSec = interaction.durationSeconds || interaction.titleId?.durationSeconds || 5400;
      const band = getDurationBand(durSec);
      durationBandCounts[band] = (durationBandCounts[band] || 0) + interactionWeight;
    });

    // Top preferred duration band
    const preferredDurationBand = Object.entries(durationBandCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'feature';

    // Sorted top genres and tags
    const topGenres = Object.entries(genreScores)
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g);

    const topTags = Object.entries(tagScores)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    // 3. Collaborative Filtering Signals from Peers
    const coWatchedUserIds = new Set();
    userInteractions.forEach((i) => {
      (i.coWatchedUsers || []).forEach((peerId) => coWatchedUserIds.add(peerId.toString()));
    });

    let peerInteractions = [];
    if (coWatchedUserIds.size > 0) {
      peerInteractions = await UserInteraction.find({
        userId: { $in: Array.from(coWatchedUserIds) },
      }).lean();
    }

    const peerTitleScores = {};
    peerInteractions.forEach((pi) => {
      const tId = pi.titleId?.toString();
      if (!tId) return;
      if (!peerTitleScores[tId]) {
        peerTitleScores[tId] = { totalRating: 0, count: 0, completions: 0 };
      }
      peerTitleScores[tId].totalRating += pi.rating || 4;
      peerTitleScores[tId].count += 1;
      if (pi.completed) peerTitleScores[tId].completions += 1;
    });

    // 4. Fetch candidate titles from Database
    let candidateTitles = await Title.find({ isPublished: true })
      .select('-timeline')
      .lean();

    // Fallback seed titles if DB candidates are sparse
    if (candidateTitles.length < 5) {
      candidateTitles = [
        ...candidateTitles,
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Inception',
          genres: ['Action', 'Sci-Fi', 'Adventure'],
          durationSeconds: 8880,
          releaseYear: 2010,
          poster: 'https://image.tmdb.org/t/p/w500/ljs28TShoGJm2Z1JuUQj89v29mh.jpg',
          backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAiE9.jpg',
          description: 'A thief who steals corporate secrets through dream-sharing technology.',
          isPublished: true,
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Interstellar',
          genres: ['Sci-Fi', 'Adventure', 'Drama'],
          durationSeconds: 10140,
          releaseYear: 2014,
          poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
          backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsX2P.jpg',
          description: 'Explorers travel through a wormhole in space in an attempt to ensure humanity survival.',
          isPublished: true,
        },
        {
          _id: '507f1f77bcf86cd799439013',
          title: 'Cyber Nexus 2099',
          genres: ['Sci-Fi', 'Action', 'Cyberpunk'],
          durationSeconds: 7200,
          releaseYear: 2025,
          poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
          backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
          description: 'A futuristic thriller involving synthetic AI consciousness.',
          isPublished: true,
        },
        {
          _id: '507f1f77bcf86cd799439014',
          title: 'Demon Slayer: Mugen Train',
          genres: ['Anime', 'Action', 'Fantasy'],
          durationSeconds: 7020,
          releaseYear: 2020,
          poster: 'https://image.tmdb.org/t/p/w500/h8Rb9gBr48ODKxYvHYeMMmVEiKN.jpg',
          backdropUrl: 'https://image.tmdb.org/t/p/w1280/n6bUvigpRFqSwmPp1m2YR4L0LTo.jpg',
          description: 'Tanjiro and Flame Hashira Kyojuro Rengoku board the Mugen Train.',
          isPublished: true,
        }
      ];
    }

    // 5. Score candidates using Genre, Tags, Length/Duration, Rating, Peer signals
    const scoredTitles = candidateTitles.map((title) => {
      const tId = title._id.toString();
      const isWatched = watchedTitleIds.has(tId);

      let genreScore = 0;
      let tagScore = 0;
      let durationScore = 0;
      let colabScore = 20; // base peer score

      // A. Genre Match Calculation
      const candidateGenres = (title.genres || []).map((g) => g.toLowerCase());
      candidateGenres.forEach((g) => {
        if (topGenres.includes(g)) {
          const rankIdx = topGenres.indexOf(g);
          genreScore += Math.max(10, 40 - rankIdx * 8);
        }
      });

      // B. Tag Match Calculation
      const candidateTags = (title.tags || []).map((t) => t.toLowerCase());
      candidateTags.forEach((t) => {
        if (topTags.includes(t)) {
          tagScore += 15;
        }
      });

      // C. Duration Band Match Calculation
      const titleDuration = title.durationSeconds || 5400;
      const titleBand = getDurationBand(titleDuration);
      if (titleBand === preferredDurationBand) {
        durationScore += 25; // Bonus for matching preferred content length
      } else {
        durationScore += 10;
      }

      // D. Collaborative Peer Score
      const peerData = peerTitleScores[tId];
      if (peerData && peerData.count > 0) {
        const avgRating = peerData.totalRating / peerData.count;
        colabScore += avgRating * 10 + peerData.completions * 5;
      }

      // E. Total Hybrid Match Score Calculation (0 - 100)
      let totalRaw = genreScore * 0.45 + tagScore * 0.20 + durationScore * 0.20 + colabScore * 0.15;
      if (totalInteractionWeight === 0) {
        // Cold start boost
        totalRaw = 82 + (title.releaseYear && title.releaseYear >= 2020 ? 10 : 5);
      }

      const matchPercentage = Math.min(99, Math.max(78, Math.round(totalRaw)));

      // F. Construct Intelligent Match Reason
      let matchReason = 'Recommended for You';
      const matchedGenre = title.genres?.find((g) => topGenres.includes(g.toLowerCase()));
      const matchedTag = title.tags?.find((t) => topTags.includes(t.toLowerCase()));

      if (matchedGenre && titleBand === preferredDurationBand) {
        matchReason = `Because you watch ${matchedGenre} & ${DURATION_BAND_LABELS[titleBand] || 'movies'}`;
      } else if (matchedGenre) {
        matchReason = `Because you like ${matchedGenre}`;
      } else if (matchedTag) {
        matchReason = `Matches your interest in ${matchedTag}`;
      } else if (peerData && peerData.count > 0) {
        matchReason = 'Popular with your Watch Space crew';
      } else if (titleBand === preferredDurationBand) {
        matchReason = `Matches your preferred ${DURATION_BAND_LABELS[titleBand] || 'length'}`;
      }

      return {
        ...title,
        matchScore: `${matchPercentage}% Match`,
        matchPercentage,
        matchReason,
        isWatched,
      };
    });

    // Sort by hybrid match score descending
    scoredTitles.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return scoredTitles.slice(0, limit);
  } catch (err) {
    console.error('[Recommendation Engine] Error generating recommendations:', err.message);
    return [];
  }
};
