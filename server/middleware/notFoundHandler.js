import { sendError } from '../utils/apiResponse.js';

/**
 * 404 Route Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  return sendError(res, {
    statusCode: 404,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
};
