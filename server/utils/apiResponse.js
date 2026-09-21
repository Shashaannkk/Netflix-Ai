/**
 * Standardized API Response Utilities
 * Ensures consistent JSON response structure across all REST endpoints.
 */

export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendError = (res, { statusCode = 500, message = 'An error occurred', error = null } = {}) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (error) {
    // Only include stack trace / deep error in non-production environments
    response.error = process.env.NODE_ENV === 'production'
      ? (typeof error === 'string' ? error : error.message)
      : error;
  }

  return res.status(statusCode).json(response);
};
