import Title from '../models/Title.js';
import UserInteraction from '../models/UserInteraction.js';
import User from '../models/User.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  HYBRID RECOMMENDATION ENGINE (Part 9)
 *
 *  Combines Content-Based Signals (genre affinity, age rating, recency)
 *  and Collaborative Filtering Signals (co-watched users, peer ratings)
 *  to generate a personalized, ranked recommendation rail.
 * ──────────────────────────────────────────────────────────────────────────────
 */

export const generateHybridRecommendations = async (userId, limit = 10) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) return [];

    // 1. Fetch user's interaction history
    const userInteractions = await UserInteraction.find({ userId }).lean();
    const watchedTitleIds = new Set(userInteractions.map((i) => i.titleId.toString()));

    // Extract user genre preferences (explicit + implicit)
    const genreCounts = {};
    (user.preferences?.favoriteGenres || []).forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 3; // Boost explicit favorites
    });
    userInteractions.forEach((interaction) => {
      (interaction.genreAffinity || []).forEach((g) => {
        genreCounts[g] = (genreCounts[g] || 0) + (interaction.rating || 2);
      });
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    // 2. Identify co-watched peers for Collaborative Filtering
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

    // Map peer ratings per title
    const peerTitleScores = {};
    peerInteractions.forEach((pi) => {
      const tId = pi.titleId.toString();
      if (!peerTitleScores[tId]) {
        peerTitleScores[tId] = { totalRating: 0, count: 0, completions: 0 };
      }
      peerTitleScores[tId].totalRating += pi.rating || 3;
      peerTitleScores[tId].count += 1;
      if (pi.completed) peerTitleScores[tId].completions += 1;
    });

    // 3. Fetch all published candidate titles
    const candidateTitles = await Title.find({ isPublished: true })
      .select('-timeline')
      .lean();

    // 4. Calculate Hybrid Score per title
    const scoredTitles = candidateTitles.map((title) => {
      const tId = title._id.toString();

      // Content-Based Score (0 - 100)
      let contentScore = 50; // base score
      if (title.genres && Array.isArray(title.genres)) {
        const genreMatches = title.genres.filter((g) => topGenres.includes(g));
        contentScore += genreMatches.length * 20;
      }
      if (title.releaseYear && title.releaseYear >= 2020) contentScore += 10;

      // Collaborative Filtering Score (0 - 100)
      let colabScore = 30; // base score
      const peerData = peerTitleScores[tId];
      if (peerData && peerData.count > 0) {
        const avgRating = peerData.totalRating / peerData.count;
        colabScore += avgRating * 12 + peerData.completions * 5;
      }

      // Hybrid combination (50% content + 50% collaborative)
      let hybridScore = Math.round(0.5 * contentScore + 0.5 * colabScore);
      hybridScore = Math.min(99, Math.max(75, hybridScore)); // normalize match % (75% - 99%)

      // Generate explanation tag
      let matchReason = 'Recommended for You';
      if (title.genres && title.genres.some((g) => topGenres.includes(g))) {
        const matchedG = title.genres.find((g) => topGenres.includes(g));
        matchReason = `Because you like ${matchedG}`;
      } else if (peerData && peerData.count > 0) {
        matchReason = 'Popular with your Watch Space crew';
      }

      const isWatched = watchedTitleIds.has(tId);

      return {
        ...title,
        matchScore: `${hybridScore}% Match`,
        matchPercentage: hybridScore,
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
