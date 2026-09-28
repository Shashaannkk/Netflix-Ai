import WatchSpace from '../models/WatchSpace.js';
import Title from '../models/Title.js';
import { generateGroundedAnswer } from '../services/aiEngineService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  AI CO-PILOT CONTROLLER (Part 7)
 *  POST /api/v1/watch-spaces/:id/ai/ask
 *  POST /api/spaces/:id/ai/ask
 * ──────────────────────────────────────────────────────────────────────────────
 */
export const askAiCoPilot = async (req, res) => {
  try {
    const watchSpaceId = req.params.id;
    const { currentTs = 0, question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return sendError(res, {
        statusCode: 400,
        message: 'Question string is required.',
      });
    }

    // 1. Fetch WatchSpace and populate Title with its embedded timeline
    const space = await WatchSpace.findById(watchSpaceId)
      .populate({
        path: 'titleId',
        select: 'title description durationSeconds genres ageRating timeline isPublished',
      })
      .lean();

    if (!space) {
      return sendError(res, {
        statusCode: 404,
        message: 'Watch Space not found.',
      });
    }

    const titleDoc = space.titleId;
    if (!titleDoc) {
      return sendError(res, {
        statusCode: 404,
        message: 'Associated title metadata not found.',
      });
    }

    const timestampNum = parseFloat(currentTs) || 0;

    // 2. Execute RAG Retrieval & Grounded Inference Pipeline
    const aiResult = await generateGroundedAnswer({
      titleDoc,
      currentTs: timestampNum,
      question: question.trim(),
    });

    // 3. Return PRD compliant response
    return sendSuccess(res, {
      statusCode: 200,
      message: 'AI answer generated successfully.',
      data: {
        answer: aiResult.answer,
        sourceEvents: aiResult.sourceEvents,
        generatedAt: aiResult.generatedAt,
        executionTimeMs: aiResult.executionTimeMs,
      },
    });
  } catch (err) {
    console.error('[AI Controller] Error in askAiCoPilot:', err.message);
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to process AI question.',
      error: err.message,
    });
  }
};
