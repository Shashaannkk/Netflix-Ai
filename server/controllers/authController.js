import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
} from '../services/tokenService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { email, displayName, password, role, preferences } = req.body;

    // 1. Validation
    if (!email || !displayName || !password) {
      return sendError(res, {
        statusCode: 400,
        message: 'Please provide email, displayName, and password.'
      });
    }

    if (password.length < 6) {
      return sendError(res, {
        statusCode: 400,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // 2. Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return sendError(res, {
        statusCode: 409,
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Assign role (sanitized to permitted enum values)
    const allowedRoles = ['viewer', 'host', 'admin'];
    const assignedRole = allowedRoles.includes(role) ? role : 'viewer';

    // 4. Create user instance (passwordHash pre-save hook will hash the password)
    const user = new User({
      email: email.toLowerCase().trim(),
      displayName: displayName.trim(),
      passwordHash: password,
      role: assignedRole,
      preferences: preferences || {}
    });

    // 5. Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 6. Save user with refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // 7. Attach refresh token to httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return sendError(res, {
        statusCode: 400,
        message: 'Please provide both email and password.'
      });
    }

    // 2. Find user including passwordHash
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+passwordHash +refreshToken'
    );

    if (!user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid email or password.'
      });
    }

    // 3. Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid email or password.'
      });
    }

    // 4. Generate new tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 5. Persist refresh token to DB for active session tracking
    user.refreshToken = refreshToken;
    await user.save();

    // 6. Set httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Issue a new access token using a valid refresh token
 * @route   POST /api/auth/refresh
 * @access  Public (Requires valid refresh token)
 */
export const refreshToken = async (req, res, next) => {
  try {
    // Check httpOnly cookie first, then body fallback
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return sendError(res, {
        statusCode: 401,
        message: 'Refresh token missing. Please sign in again.'
      });
    }

    // 1. Verify token cryptographic signature
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      clearRefreshTokenCookie(res);
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid or expired refresh token. Please sign in again.'
      });
    }

    // 2. Validate token matches database state (checks revocation)
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      clearRefreshTokenCookie(res);
      return sendError(res, {
        statusCode: 401,
        message: 'Refresh token has been revoked or is invalid.'
      });
    }

    // 3. Issue new tokens with rotation
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log user out & invalidate refresh token
 * @route   POST /api/auth/logout
 * @access  Public / Authenticated
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (token) {
      // Clear token in database if found
      await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
    } else if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    }

    clearRefreshTokenCookie(res);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private (Requires valid access token)
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: 'User account not found'
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'User profile retrieved',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};
