import Title from '../models/Title.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  ADMIN METADATA MANAGEMENT CONTROLLER (Part 9)
 *
 *  Provides schema validation, timeline sequence validation, and timeline
 *  metadata ingestion protected by server-side RBAC.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const VALID_EVENT_TYPES = ['scene', 'character', 'trivia', 'glossary', 'variation'];

/**
 * Validates a timeline array against structural and schema constraints.
 * Returns { isValid, errors, warnings }
 */
export const validateTimelineArray = (timeline) => {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(timeline)) {
    errors.push('Timeline must be an array of event objects.');
    return { isValid: false, errors, warnings };
  }

  if (timeline.length === 0) {
    warnings.push('Timeline array is empty.');
  }

  let prevTimestamp = -1;

  timeline.forEach((event, idx) => {
    const eventNum = idx + 1;

    // 1. Timestamp validation
    if (typeof event.timestampStart !== 'number' || isNaN(event.timestampStart)) {
      errors.push(`Event #${eventNum}: timestampStart must be a valid number.`);
    } else {
      if (event.timestampStart < 0) {
        errors.push(`Event #${eventNum}: timestampStart cannot be negative (${event.timestampStart}s).`);
      }
      if (event.timestampStart < prevTimestamp) {
        errors.push(
          `Event #${eventNum}: timestampStart (${event.timestampStart}s) is out of chronological order (previous was ${prevTimestamp}s).`
        );
      }
      prevTimestamp = event.timestampStart;
    }

    // 2. EventType enum validation
    if (!event.eventType || !VALID_EVENT_TYPES.includes(event.eventType)) {
      errors.push(
        `Event #${eventNum}: invalid eventType "${event.eventType}". Supported types: ${VALID_EVENT_TYPES.join(', ')}.`
      );
    }

    // 3. Payload schema validation per eventType
    const payload = event.payload || {};
    if (event.eventType === 'scene') {
      if (!payload.sceneName || typeof payload.sceneName !== 'string') {
        errors.push(`Event #${eventNum} (scene): payload must contain a string "sceneName".`);
      }
    } else if (event.eventType === 'character') {
      if (!payload.characterName || typeof payload.characterName !== 'string') {
        errors.push(`Event #${eventNum} (character): payload must contain a string "characterName".`);
      }
    } else if (event.eventType === 'trivia') {
      if (!payload.question || typeof payload.question !== 'string') {
        errors.push(`Event #${eventNum} (trivia): payload must contain a string "question".`);
      }
      if (!payload.answer || typeof payload.answer !== 'string') {
        errors.push(`Event #${eventNum} (trivia): payload must contain a string "answer".`);
      }
    } else if (event.eventType === 'glossary') {
      if (!payload.term || typeof payload.term !== 'string') {
        errors.push(`Event #${eventNum} (glossary): payload must contain a string "term".`);
      }
      if (!payload.definition || typeof payload.definition !== 'string') {
        errors.push(`Event #${eventNum} (glossary): payload must contain a string "definition".`);
      }
    } else if (event.eventType === 'variation') {
      if (!payload.promptText || typeof payload.promptText !== 'string') {
        errors.push(`Event #${eventNum} (variation): payload must contain a string "promptText".`);
      }
      if (!payload.optionA || !payload.optionB) {
        errors.push(`Event #${eventNum} (variation): payload must contain pre-authored "optionA" and "optionB".`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ── POST /api/admin/titles/:id/timeline/validate ────────────────────────────
// Admin validation endpoint (does not mutate database)
export const validateTitleTimeline = async (req, res) => {
  try {
    const { timeline } = req.body;
    const validation = validateTimelineArray(timeline);

    return sendSuccess(res, {
      message: validation.isValid ? 'Timeline validation passed' : 'Timeline validation failed',
      data: {
        isValid: validation.isValid,
        eventCount: Array.isArray(timeline) ? timeline.length : 0,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to validate timeline',
      error: err.message,
    });
  }
};

// ── PUT /api/admin/titles/:id/timeline ───────────────────────────────────────
// Admin metadata save endpoint (protected by RBAC)
export const updateTitleTimeline = async (req, res) => {
  try {
    const { timeline } = req.body;
    const titleId = req.params.id;

    // Validate timeline payload
    const validation = validateTimelineArray(timeline);
    if (!validation.isValid) {
      return sendError(res, {
        statusCode: 400,
        message: 'Timeline validation failed',
        errors: validation.errors,
      });
    }

    const title = await Title.findByIdAndUpdate(
      titleId,
      { $set: { timeline } },
      { new: true, runValidators: true }
    ).select('title durationSeconds timeline');

    if (!title) {
      return sendError(res, { statusCode: 404, message: 'Title not found' });
    }

    return sendSuccess(res, {
      message: 'Title timeline metadata updated successfully',
      data: {
        titleId: title._id,
        titleName: title.title,
        eventCount: title.timeline.length,
        timeline: title.timeline,
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to update title timeline',
      error: err.message,
    });
  }
};
