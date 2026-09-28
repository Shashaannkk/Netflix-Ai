import { verifyAccessToken } from '../services/tokenService.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Authentication Middleware
 * Validates the JWT Bearer access token from the Authorization header.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, {
      statusCode: 401,
      message: 'Authentication required. No access token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, email, displayName, role, iat, exp }
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, {
        statusCode: 401,
        message: 'Access token has expired. Please refresh your session.',
        error: 'TOKEN_EXPIRED'
      });
    }

    return sendError(res, {
      statusCode: 401,
      message: 'Invalid access token. Authentication failed.',
      error: error.message
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches req.user if a valid token is present, but permits anonymous guests.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
  } catch {
    req.user = null;
  }
  return next();
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces that req.user.role matches one of the allowed roles.
 * Must be preceded by requireAuth middleware.
 *
 * @param {...string} allowedRoles - List of roles permitted (e.g., 'host', 'admin')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Authentication required before checking authorization.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, {
        statusCode: 403,
        message: `Forbidden: Access denied. Role '${req.user.role}' is not authorized. Permitted roles: [${allowedRoles.join(', ')}].`
      });
    }

    return next();
  };
};

/**
 * WebSocket Handshake Token Verification Helper
 * Prepares authentication for real-time Socket.IO connections.
 */
export const verifySocketToken = (token) => {
  if (!token) {
    throw new Error('No authentication token provided');
  }

  // Strip 'Bearer ' prefix if present
  const cleanedToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  return verifyAccessToken(cleanedToken);
};

// Aliases for compatibility
export const authenticate = requireAuth;
export const requireRole = (...roles) => authorizeRoles(...roles);

