import mongoose from 'mongoose';
import WatchSpace from '../models/WatchSpace.js';
import UserInteraction from '../models/UserInteraction.js';
import ChatMessage from '../models/ChatMessage.js';
import Title from '../models/Title.js';
import { generateHybridRecommendations } from '../services/recommendationEngine.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  DASHBOARD & ANALYTICS CONTROLLER (Part 9)
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ── GET /api/dashboard ────────────────────────────────────────────────────────
// Personal User Dashboard: Active Spaces, Recently Watched, Watch History & Recommendations
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    // 1. Fetch active Watch Spaces for user (Host or Participant)
    const activeSpaces = await WatchSpace.find({
      status: { $in: ['scheduled', 'live'] },
      $or: [{ hostUserId: userId }, { participantIds: userId }],
    })
      .populate('titleId', 'title poster backdropUrl durationSeconds genres')
      .populate('hostUserId', 'displayName email')
      .sort({ updatedAt: -1 })
      .lean();

    // 2. Fetch User Watch History & Recently Watched
    const interactions = await UserInteraction.find({ userId })
      .populate('titleId', 'title poster backdropUrl durationSeconds genres releaseYear ageRating')
      .sort({ updatedAt: -1 })
      .lean();

    const recentlyWatched = interactions
      .filter((i) => i.titleId)
      .map((i) => ({
        interactionId: i._id,
        title: i.titleId,
        titleName: i.titleName || i.titleId?.title,
        poster: i.poster || i.titleId?.poster,
        backdropUrl: i.backdropUrl || i.titleId?.backdropUrl,
        mediaType: i.mediaType || 'movie',
        season: i.season || 1,
        episode: i.episode || 1,
        watchedSeconds: i.watchedSeconds,
        durationSeconds: i.durationSeconds || i.titleId?.durationSeconds || 5400,
        completed: i.completed,
        rating: i.rating,
        lastWatchedAt: i.updatedAt,
      }));

    // 3. Generate Hybrid Ranked Recommendations & Categorized Rails
    const recResult = await generateHybridRecommendations(userId, 10);
    const recommendations = recResult.recommendations || recResult;
    const recommendedMovies = recResult.recommendedMovies || [];
    const recommendedSeries = recResult.recommendedSeries || [];
    const recommendedAnime = recResult.recommendedAnime || [];

    return sendSuccess(res, {
      message: 'User dashboard data retrieved successfully',
      data: {
        activeSpaces,
        recentlyWatched,
        watchHistory: interactions,
        recommendations,
        recommendedMovies,
        recommendedSeries,
        recommendedAnime,
      },
    });
  } catch (err) {
    console.error('[Dashboard Controller] Error fetching user dashboard:', err.message);
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch dashboard data',
      error: err.message,
    });
  }
};

// ── POST /api/dashboard/interaction ──────────────────────────────────────────
// Records viewing interaction data (watchedSeconds, completed, rating, etc.)
export const recordUserInteraction = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    let { titleId, watchedSeconds, completed, rating, genreAffinity, coWatchedUsers, title: titleName, poster, backdropUrl, genres } = req.body;

    if (!titleId) {
      return sendError(res, { statusCode: 400, message: 'titleId is required' });
    }

    let targetMongoTitleId = null;

    if (mongoose.Types.ObjectId.isValid(titleId)) {
      targetMongoTitleId = titleId;
    } else {
      // Find or create a matching Title document for TMDB / external title IDs
      let existingTitle = null;
      if (titleName) {
        existingTitle = await Title.findOne({ title: new RegExp(`^${titleName}$`, 'i') });
      }

      if (!existingTitle && titleName) {
        existingTitle = await Title.create({
          title: titleName,
          description: 'Popular movie or show on Netflix AI',
          durationSeconds: 7200,
          genres: Array.isArray(genres) ? genres : ['Movie'],
          poster: poster || null,
          backdropUrl: backdropUrl || null,
          videoAssetUrl: '/api/media/watch-together-demo.mp4',
          isPublished: true,
        });
      }

      if (existingTitle) {
        targetMongoTitleId = existingTitle._id;
      } else {
        const fallbackTitle = await Title.findOne();
        if (fallbackTitle) targetMongoTitleId = fallbackTitle._id;
      }
    }

    if (!targetMongoTitleId) {
      return sendError(res, { statusCode: 404, message: 'Title reference not found for recording interaction' });
    }

    const updateFields = {};
    if (typeof watchedSeconds === 'number') updateFields.watchedSeconds = watchedSeconds;
    if (typeof completed === 'boolean') updateFields.completed = completed;
    if (typeof rating === 'number') updateFields.rating = rating;
    if (Array.isArray(genreAffinity)) updateFields.genreAffinity = genreAffinity;
    if (Array.isArray(coWatchedUsers)) updateFields.coWatchedUsers = coWatchedUsers;

    if (Array.isArray(req.body.tags)) updateFields.tags = req.body.tags;
    if (typeof req.body.durationSeconds === 'number') updateFields.durationSeconds = req.body.durationSeconds;
    if (typeof req.body.season === 'number') updateFields.season = req.body.season;
    if (typeof req.body.episode === 'number') updateFields.episode = req.body.episode;
    if (req.body.language) updateFields.language = req.body.language;
    if (req.body.mediaType) updateFields.mediaType = req.body.mediaType;
    if (titleName) updateFields.titleName = titleName;
    if (poster) updateFields.poster = poster;
    if (backdropUrl) updateFields.backdropUrl = backdropUrl;

    const interaction = await UserInteraction.findOneAndUpdate(
      { userId, titleId: targetMongoTitleId },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    return sendSuccess(res, {
      message: 'User interaction recorded successfully',
      data: { interaction },
    });
  } catch (err) {
    console.error('[Dashboard Controller] Error recording interaction:', err.message);
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to record interaction',
      error: err.message,
    });
  }
};

// ── DELETE /api/dashboard/interaction/:id ────────────────────────────────────
// Deletes a specific watch history entry for the user
export const deleteUserInteraction = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const interactionId = req.params.id;

    const result = await UserInteraction.findOneAndDelete({
      _id: interactionId,
      userId,
    });

    if (!result) {
      return sendError(res, { statusCode: 404, message: 'Interaction record not found' });
    }

    return sendSuccess(res, {
      message: 'Watch history item removed successfully',
      data: { deletedId: interactionId },
    });
  } catch (err) {
    console.error('[Dashboard Controller] Error deleting interaction:', err.message);
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to delete watch history item',
      error: err.message,
    });
  }
};

// ── DELETE /api/dashboard/history ────────────────────────────────────────────
// Clears all watch history records for the user
export const clearUserHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    await UserInteraction.deleteMany({ userId });

    return sendSuccess(res, {
      message: 'Watch history cleared successfully',
      data: { cleared: true },
    });
  } catch (err) {
    console.error('[Dashboard Controller] Error clearing watch history:', err.message);
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to clear watch history',
      error: err.message,
    });
  }
};

// ── GET /api/spaces/:id/analytics ──────────────────────────────────────────────
// Analytics calculation for a Watch Space session
export const getSpaceAnalytics = async (req, res) => {
  try {
    const spaceId = req.params.id;

    const space = await WatchSpace.findById(spaceId)
      .populate('titleId', 'title durationSeconds timeline')
      .populate('hostUserId', 'displayName email')
      .lean();

    if (!space) {
      return sendError(res, { statusCode: 404, message: 'Watch Space not found' });
    }

    // 1. Duration Calculation (seconds & formatted)
    let durationSeconds = 0;
    if (space.startedAt && space.endedAt) {
      durationSeconds = Math.max(0, Math.round((new Date(space.endedAt) - new Date(space.startedAt)) / 1000));
    } else if (space.startedAt) {
      durationSeconds = Math.max(0, Math.round((new Date() - new Date(space.startedAt)) / 1000));
    } else {
      durationSeconds = space.titleId?.durationSeconds || 0;
    }

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const formattedDuration = `${minutes}m ${seconds}s`;

    // 2. Peak Participants Calculation
    const participantCount = (space.participantIds || []).length + 1; // +1 for host
    const peakParticipants = Math.max(participantCount, space.analytics?.peakParticipants || 1);

    // 3. Chat Activity Calculation
    const chatActivity = await ChatMessage.countDocuments({ watchSpaceId: spaceId });

    // 4. AI Questions & Trivia Cards Metrics
    const triviaCount = (space.titleId?.timeline || []).filter((e) => e.eventType === 'trivia').length;
    const aiQuestions = space.analytics?.aiQuestions || Math.max(1, Math.floor(chatActivity / 3));

    return sendSuccess(res, {
      message: 'Watch Space analytics fetched successfully',
      data: {
        analytics: {
          watchSpaceId: space._id,
          title: space.titleId?.title || 'Unknown Title',
          host: space.hostUserId?.displayName || 'Host',
          status: space.status,
          durationSeconds,
          formattedDuration,
          peakParticipants,
          aiQuestions,
          triviaCards: triviaCount,
          chatActivity,
          createdAt: space.createdAt,
          endedAt: space.endedAt,
        },
      },
    });
  } catch (err) {
    console.error('[Dashboard Controller] Error fetching space analytics:', err.message);
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch space analytics',
      error: err.message,
    });
  }
};
