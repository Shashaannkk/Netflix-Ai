import Title from '../models/Title.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/titles
//  Public. Returns all published titles.
//  Query params: ?genre=Sci-Fi  ?page=1  ?limit=20
// ──────────────────────────────────────────────────────────────────────────────
export const getTitles = async (req, res) => {
  try {
    const { genre, page = 1, limit = 20 } = req.query;

    const filter = { isPublished: true };
    if (genre) {
      filter.genres = { $in: [genre] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [titles, total] = await Promise.all([
      Title.find(filter)
        .select('-timeline') // Never send the full timeline on list queries — it's large
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Title.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      message: 'Titles fetched successfully',
      data: {
        titles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch titles',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/titles/:id
//  Public. Returns a single title WITHOUT the timeline array.
//  The player/AI engine fetches the timeline separately via its own endpoint.
// ──────────────────────────────────────────────────────────────────────────────
export const getTitleById = async (req, res) => {
  try {
    const title = await Title.findOne({ _id: req.params.id, isPublished: true })
      .select('-timeline')
      .populate('createdBy', 'displayName email')
      .lean();

    if (!title) {
      return sendError(res, {
        statusCode: 404,
        message: 'Title not found',
      });
    }

    return sendSuccess(res, {
      message: 'Title fetched successfully',
      data: { title },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch title',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/titles/:id/timeline
//  Auth required. Returns the FULL timeline for a title.
//  Sorted by timestampStart ascending.
// ──────────────────────────────────────────────────────────────────────────────
export const getTitleTimeline = async (req, res) => {
  try {
    const title = await Title.findOne({ _id: req.params.id, isPublished: true })
      .select('title durationSeconds timeline')
      .lean();

    if (!title) {
      return sendError(res, {
        statusCode: 404,
        message: 'Title not found',
      });
    }

    // Sort by timestampStart in ascending order
    const sortedTimeline = [...title.timeline].sort(
      (a, b) => a.timestampStart - b.timestampStart
    );

    return sendSuccess(res, {
      message: 'Timeline fetched successfully',
      data: {
        titleId: title._id,
        titleName: title.title,
        durationSeconds: title.durationSeconds,
        eventCount: sortedTimeline.length,
        timeline: sortedTimeline,
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch timeline',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  GET /api/titles/:id/timeline/range
//  Auth required. Returns ONLY events whose timestampStart falls within [start, end].
//
//  This is the PRIMARY endpoint that the AI engine will call.
//  When the AI needs context for "what has happened up to second X",
//  it calls: /timeline/range?start=0&end=X
//
//  Query params:
//    ?start=0      (default: 0)
//    ?end=9999     (default: Infinity — returns all events from start onwards)
//    ?type=trivia  (optional: filter by eventType)
// ──────────────────────────────────────────────────────────────────────────────
export const getTimelineRange = async (req, res) => {
  try {
    const { start = '0', end, type } = req.query;

    const startSec = parseFloat(start);
    const endSec = end !== undefined ? parseFloat(end) : Infinity;

    if (isNaN(startSec) || isNaN(endSec)) {
      return sendError(res, {
        statusCode: 400,
        message: 'Invalid range: start and end must be numbers (seconds)',
      });
    }

    if (startSec > endSec) {
      return sendError(res, {
        statusCode: 400,
        message: 'Invalid range: start must be less than or equal to end',
      });
    }

    const title = await Title.findOne({ _id: req.params.id, isPublished: true })
      .select('title durationSeconds timeline')
      .lean();

    if (!title) {
      return sendError(res, {
        statusCode: 404,
        message: 'Title not found',
      });
    }

    // Filter in memory — the timeline is embedded and already loaded
    let events = title.timeline.filter(
      (ev) => ev.timestampStart >= startSec && ev.timestampStart <= endSec
    );

    // Optional event type filter
    if (type) {
      const validTypes = ['scene', 'character', 'trivia', 'glossary', 'variation'];
      if (!validTypes.includes(type)) {
        return sendError(res, {
          statusCode: 400,
          message: `Invalid event type: "${type}". Must be one of: ${validTypes.join(', ')}`,
        });
      }
      events = events.filter((ev) => ev.eventType === type);
    }

    // Sort ascending
    events.sort((a, b) => a.timestampStart - b.timestampStart);

    return sendSuccess(res, {
      message: 'Timeline range fetched successfully',
      data: {
        titleId: title._id,
        titleName: title.title,
        durationSeconds: title.durationSeconds,
        range: {
          start: startSec,
          end: endSec === Infinity ? title.durationSeconds : endSec,
        },
        eventCount: events.length,
        events,
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to fetch timeline range',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  POST /api/titles
//  Admin only. Creates a new title.
// ──────────────────────────────────────────────────────────────────────────────
export const createTitle = async (req, res) => {
  try {
    const {
      title,
      description,
      durationSeconds,
      genres,
      ageRating,
      language,
      releaseYear,
      poster,
      backdropUrl,
      videoAssetUrl,
      trailerUrl,
      timeline,
      isPublished,
    } = req.body;

    const newTitle = await Title.create({
      title,
      description,
      durationSeconds,
      genres: genres || [],
      ageRating,
      language,
      releaseYear,
      poster,
      backdropUrl,
      videoAssetUrl,
      trailerUrl,
      timeline: timeline || [],
      isPublished: isPublished ?? false,
      createdBy: req.user?._id || null,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Title created successfully',
      data: { title: newTitle },
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
      message: 'Failed to create title',
      error: err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
//  PUT /api/titles/:id
//  Admin only. Updates a title (including publishing).
// ──────────────────────────────────────────────────────────────────────────────
export const updateTitle = async (req, res) => {
  try {
    const updated = await Title.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-timeline');

    if (!updated) {
      return sendError(res, {
        statusCode: 404,
        message: 'Title not found',
      });
    }

    return sendSuccess(res, {
      message: 'Title updated successfully',
      data: { title: updated },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to update title',
      error: err.message,
    });
  }
};
