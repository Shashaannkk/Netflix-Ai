import mongoose from 'mongoose';
import WatchSpace from '../models/WatchSpace.js';
import Title from '../models/Title.js';
import ChatMessage from '../models/ChatMessage.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ──────────────────────────────────────────────────────────────────────────────
//  POST /api/spaces
//  Auth required. Any authenticated user can create a Watch Space.
//  Body: { titleId, title, poster, backdropUrl, videoAssetUrl, genres, settings }
// ──────────────────────────────────────────────────────────────────────────────
export const createWatchSpace = async (req, res) => {
  try {
    const { titleId, title: titleName, poster, backdropUrl, videoAssetUrl, genres, settings = {} } = req.body;

    if (!titleId) {
      return sendError(res, {
        statusCode: 400,
        message: 'titleId is required to create a Watch Space.',
      });
    }

    let targetTitle = null;

    // 1. Try finding by ObjectId if valid
    if (mongoose.Types.ObjectId.isValid(titleId)) {
      targetTitle = await Title.findById(titleId);
    }

    // 2. Search by title name if not found by ObjectId
    if (!targetTitle && titleName) {
      targetTitle = await Title.findOne({ title: titleName });
    }

    // 3. Auto-upsert Title document for TMDB/external items so WatchSpace creation always succeeds
    if (!targetTitle) {
      targetTitle = await Title.create({
        title: titleName || `Title ${titleId}`,
        description: 'Stream and watch together in real-time with Netflix AI co-pilot.',
        durationSeconds: 720,
        genres: Array.isArray(genres) && genres.length ? genres : ['Movie', 'Feature'],
        ageRating: '16+',
        poster: poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
        backdropUrl: backdropUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
        videoAssetUrl: videoAssetUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        isPublished: true,
      });
    }

    // Create the space document using valid Title ObjectId
    const space = await WatchSpace.create({
      titleId: targetTitle._id,
      hostUserId: req.user.id,
      settings: {
        roomName: settings.roomName || `${req.user.displayName}'s Watch Space`,
        isPrivate: settings.isPrivate ?? false,
        maxParticipants: settings.maxParticipants ?? 10,
        aiVerbosity: settings.aiVerbosity ?? 'moderate',
        votingEnabled: settings.votingEnabled ?? true,
        mediaChoice: settings.mediaChoice || 'movie',
        selectedServer: settings.selectedServer || 'server_alpha',
        videoAssetUrl: videoAssetUrl || targetTitle.videoAssetUrl,
      },
    });

    // Build invite link now that we have the inviteCode
    space.inviteLink = `${CLIENT_URL}/join?code=${space.inviteCode}`;
    await space.save();

    // Re-fetch with populated fields for the response
    const populated = await WatchSpace.findById(space._id)
      .populate('hostUserId', 'displayName email role')
      .populate('titleId', 'title poster durationSeconds genres ageRating videoAssetUrl backdropUrl');

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Watch Space created successfully.',
      data: { space: populated },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return sendError(res, {
        statusCode: 400,
        message: 'Validation error',
        error: err.message,
      });
    }
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to create Watch Space.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/spaces/my
//  Auth required. Returns all spaces the user hosts OR participates in.
// ──────────────────────────────────────────────────────────────────────────────
export const getMySpaces = async (req, res) => {
  try {
    const userId = req.user.id;

    const spaces = await WatchSpace.find({
      $or: [
        { hostUserId: userId },
        { participantIds: userId },
      ],
    })
      .populate('hostUserId', 'displayName email role')
      .populate('titleId', 'title poster durationSeconds genres ageRating')
      .populate('participantIds', 'displayName email role')
      .sort({ createdAt: -1 })
      .limit(50);

    return sendSuccess(res, {
      message: 'Spaces fetched successfully.',
      data: { spaces },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch your Watch Spaces.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/spaces/:id
//  Auth required. Get a single Watch Space by its MongoDB ID.
// ──────────────────────────────────────────────────────────────────────────────
export const getWatchSpaceById = async (req, res) => {
  try {
    const spaceIdParam = req.params.id;
    let space = null;

    if (mongoose.Types.ObjectId.isValid(spaceIdParam)) {
      space = await WatchSpace.findById(spaceIdParam)
        .populate('hostUserId', 'displayName email role')
        .populate('titleId', 'title poster durationSeconds genres ageRating videoAssetUrl backdropUrl')
        .populate('participantIds', 'displayName email role');
    }

    if (!space) {
      space = await WatchSpace.findOne({ inviteCode: spaceIdParam.toUpperCase() })
        .populate('hostUserId', 'displayName email role')
        .populate('titleId', 'title poster durationSeconds genres ageRating videoAssetUrl backdropUrl')
        .populate('participantIds', 'displayName email role');
    }

    if (!space) {
      return sendError(res, {
        statusCode: 404,
        message: 'Watch Space not found.',
      });
    }

    const userId = req.user.id;
    const isHost = space.hostUserId?._id?.toString() === userId || space.hostUserId?.toString() === userId;
    const isParticipant = (space.participantIds || []).some((p) => (p._id || p).toString() === userId);
    const isAdmin = req.user.role === 'admin';

    // Auto-register as participant if public space and user is not yet host or participant
    if (!isHost && !isParticipant) {
      if (!space.settings?.isLocked && !space.settings?.isPrivate) {
        space.participantIds.push(userId);
        if (space.status === 'scheduled') {
          space.status = 'live';
          space.startedAt = new Date();
        }
        await space.save();
      } else if (!isAdmin) {
        return sendError(res, {
          statusCode: 403,
          message: 'You are not a member of this private/locked Watch Space.',
        });
      }
    }

    return sendSuccess(res, {
      message: 'Watch Space fetched successfully.',
      data: { space },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch Watch Space.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/spaces/join/:inviteCode
//  Auth required. Resolves an invite code to a space preview (no join yet).
//  Used to show preview before the user confirms joining.
// ──────────────────────────────────────────────────────────────────────────────
export const resolveInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    if (!inviteCode || inviteCode.length !== 6) {
      return sendError(res, {
        statusCode: 400,
        message: 'Invalid invite code. Codes are exactly 6 characters.',
      });
    }

    const space = await WatchSpace.findByInviteCode(inviteCode);

    if (!space) {
      return sendError(res, {
        statusCode: 404,
        message: 'No Watch Space found with that invite code.',
      });
    }

    if (space.status === 'ended') {
      return sendError(res, {
        statusCode: 410,
        message: 'This Watch Space has already ended.',
      });
    }

    // Return a limited preview — enough to show the join confirmation screen
    return sendSuccess(res, {
      message: 'Invite code resolved.',
      data: {
        preview: {
          spaceId: space._id,
          inviteCode: space.inviteCode,
          status: space.status,
          roomName: space.settings.roomName,
          isPrivate: space.settings.isPrivate,
          maxParticipants: space.settings.maxParticipants,
          currentCount: space.getCurrentCount(),
          host: {
            id: space.hostUserId._id,
            displayName: space.hostUserId.displayName,
          },
          title: {
            id: space.titleId._id,
            name: space.titleId.title,
            poster: space.titleId.poster,
            genres: space.titleId.genres,
            ageRating: space.titleId.ageRating,
            durationSeconds: space.titleId.durationSeconds,
          },
        },
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to resolve invite code.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  POST /api/spaces/:id/join
//  Auth required. Authenticated participant joins the space.
// ──────────────────────────────────────────────────────────────────────────────
export const joinWatchSpace = async (req, res) => {
  try {
    const spaceIdParam = req.params.id;
    let space = null;

    if (mongoose.Types.ObjectId.isValid(spaceIdParam)) {
      space = await WatchSpace.findById(spaceIdParam)
        .populate('hostUserId', 'displayName email role')
        .populate('titleId', 'title poster durationSeconds genres ageRating videoAssetUrl backdropUrl')
        .populate('participantIds', 'displayName email role');
    }

    if (!space) {
      space = await WatchSpace.findOne({ inviteCode: spaceIdParam.toUpperCase() })
        .populate('hostUserId', 'displayName email role')
        .populate('titleId', 'title poster durationSeconds genres ageRating videoAssetUrl backdropUrl')
        .populate('participantIds', 'displayName email role');
    }

    if (!space) {
      return sendError(res, {
        statusCode: 404,
        message: 'Watch Space not found.',
      });
    }

    if (space.status === 'ended') {
      return sendError(res, {
        statusCode: 410,
        message: 'This Watch Space has already ended.',
      });
    }

    const userId = req.user.id;

    // Host trying to join their own room — just return the space
    if (space.isHost(userId)) {
      return sendSuccess(res, {
        message: 'You are the host of this Watch Space.',
        data: { space, role: 'host' },
      });
    }

    // Already a participant — idempotent
    if (space.hasParticipant(userId)) {
      return sendSuccess(res, {
        message: 'You are already in this Watch Space.',
        data: { space, role: 'participant' },
      });
    }

    // Check capacity
    if (space.getCurrentCount() >= space.settings.maxParticipants) {
      return sendError(res, {
        statusCode: 409,
        message: `This Watch Space is full (${space.settings.maxParticipants} participants maximum).`,
      });
    }

    // Add participant
    space.participantIds.push(userId);

    // Auto-transition to live when first participant joins a scheduled room
    if (space.status === 'scheduled') {
      space.status = 'live';
      space.startedAt = new Date();
    }

    await space.save();

    // Re-populate after save for clean response
    await space.populate([
      { path: 'hostUserId', select: 'displayName email role' },
      { path: 'titleId', select: 'title poster durationSeconds genres ageRating videoAssetUrl backdropUrl' },
      { path: 'participantIds', select: 'displayName email role' },
    ]);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Successfully joined the Watch Space.',
      data: { space, role: 'participant' },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to join Watch Space.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  PATCH /api/spaces/:id/status
//  Auth required. Host-only. Updates room status (live / ended).
// ──────────────────────────────────────────────────────────────────────────────
export const updateSpaceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['live', 'ended'];

    if (!status || !validStatuses.includes(status)) {
      return sendError(res, {
        statusCode: 400,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const space = await WatchSpace.findById(req.params.id);

    if (!space) {
      return sendError(res, {
        statusCode: 404,
        message: 'Watch Space not found.',
      });
    }

    // Only the host can update status
    if (!space.isHost(req.user.id) && req.user.role !== 'admin') {
      return sendError(res, {
        statusCode: 403,
        message: 'Only the host can change the Watch Space status.',
      });
    }

    if (space.status === 'ended') {
      return sendError(res, {
        statusCode: 409,
        message: 'This Watch Space has already ended and cannot be restarted.',
      });
    }

    space.status = status;
    if (status === 'live' && !space.startedAt) {
      space.startedAt = new Date();
    }
    if (status === 'ended') {
      space.endedAt = new Date();
    }

    await space.save();

    return sendSuccess(res, {
      message: `Watch Space status updated to '${status}'.`,
      data: {
        spaceId: space._id,
        status: space.status,
        startedAt: space.startedAt,
        endedAt: space.endedAt,
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to update Watch Space status.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  DELETE /api/spaces/:id/leave
//  Auth required. Participant leaves the space (removes from participantIds).
// ──────────────────────────────────────────────────────────────────────────────
export const leaveWatchSpace = async (req, res) => {
  try {
    const space = await WatchSpace.findById(req.params.id);

    if (!space) {
      return sendError(res, {
        statusCode: 404,
        message: 'Watch Space not found.',
      });
    }

    const userId = req.user.id;

    if (space.isHost(userId)) {
      return sendError(res, {
        statusCode: 400,
        message: 'The host cannot leave. End the Watch Space instead.',
      });
    }

    space.participantIds = space.participantIds.filter(
      (id) => id.toString() !== userId
    );

    await space.save();

    return sendSuccess(res, {
      message: 'You have left the Watch Space.',
      data: { spaceId: space._id },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to leave Watch Space.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/spaces/:id/messages
//  Auth required. Fetches persisted chat history for the Watch Space.
// ──────────────────────────────────────────────────────────────────────────────
export const getSpaceMessages = async (req, res) => {
  try {
    const spaceId = req.params.id;
    const limit = parseInt(req.query.limit || '100', 10);

    const messages = await ChatMessage.find({ watchSpaceId: spaceId })
      .populate('senderId', 'displayName email role')
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return sendSuccess(res, {
      message: 'Chat history retrieved.',
      data: { messages },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch chat history.',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/watch-spaces/:id/state
// ──────────────────────────────────────────────────────────────────────────────
export const getWatchSpaceState = async (req, res) => {
  try {
    const spaceId = req.params.id;
    const space = await WatchSpace.findById(spaceId)
      .populate('hostUserId', 'displayName email role')
      .populate('titleId');

    if (!space) {
      return sendError(res, { statusCode: 404, message: 'Watch Space not found.' });
    }

    return sendSuccess(res, {
      message: 'Watch Space state retrieved.',
      data: {
        watchSpaceId: space._id,
        status: space.status,
        hostUserId: space.hostUserId,
        title: space.titleId,
        participantCount: space.getCurrentCount(),
        settings: space.settings,
      },
    });
  } catch (err) {
    return sendError(res, { statusCode: 500, message: 'Failed to get Watch Space state.', error: err.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/watch-spaces/:id/end
// ──────────────────────────────────────────────────────────────────────────────
export const endWatchSpace = async (req, res) => {
  try {
    const spaceId = req.params.id;
    const space = await WatchSpace.findById(spaceId);

    if (!space) {
      return sendError(res, { statusCode: 404, message: 'Watch Space not found.' });
    }

    if (!space.isHost(req.user.id) && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Only the host or admin can end the Watch Space.' });
    }

    space.status = 'ended';
    space.endedAt = new Date();
    await space.save();

    return sendSuccess(res, {
      message: 'Watch Space ended successfully.',
      data: { spaceId: space._id, status: space.status, endedAt: space.endedAt },
    });
  } catch (err) {
    return sendError(res, { statusCode: 500, message: 'Failed to end Watch Space.', error: err.message });
  }
};

