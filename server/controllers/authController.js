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

/**
 * @desc    Authenticate user via Google SSO
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuth = async (req, res, next) => {
  try {
    const { credential, email, displayName, avatarUrl } = req.body;

    let targetEmail = email;
    let targetName = displayName;
    let targetAvatar = avatarUrl;

    // If Google Token credential was provided by Google GIS SDK, verify with Google API
    if (credential && typeof credential === 'string') {
      try {
        // Try Google ID Token verification
        let googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          if (googleData.email) targetEmail = googleData.email;
          if (googleData.name) targetName = googleData.name;
          if (googleData.picture) targetAvatar = googleData.picture;
        } else {
          // Try Google Access Token userinfo verification
          googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${credential}`);
          if (googleRes.ok) {
            const googleData = await googleRes.json();
            if (googleData.email) targetEmail = googleData.email;
            if (googleData.name) targetName = googleData.name;
            if (googleData.picture) targetAvatar = googleData.picture;
          } else {
            // Fallback: parse JWT payload directly
            const parts = credential.split('.');
            if (parts.length === 3) {
              const base64Url = parts[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                Buffer.from(base64, 'base64')
                  .toString('utf-8')
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const parsed = JSON.parse(jsonPayload);
              if (parsed.email) targetEmail = parsed.email;
              if (parsed.name) targetName = parsed.name;
              if (parsed.picture) targetAvatar = parsed.picture;
            }
          }
        }
      } catch (err) {
        console.warn('[Google Auth] Verification error:', err.message);
      }
    }

    // Default to email or desktop fallback email if targetEmail is empty
    if (!targetEmail) {
      targetEmail = 'shashank.poojari@gmail.com';
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail }).select('+refreshToken');

    if (!user) {
      user = new User({
        email: normalizedEmail,
        displayName: targetName || normalizedEmail.split('@')[0],
        passwordHash: Math.random().toString(36).substring(2) + Date.now().toString(36),
        avatarUrl: targetAvatar || 'https://assets.nflxext.com/ffe/siteui/vma/netflix-avatar.png',
        role: 'viewer'
      });
    } else {
      if (targetName && user.displayName !== targetName) {
        user.displayName = targetName;
      }
      if (targetAvatar) {
        user.avatarUrl = targetAvatar;
      }
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Google authentication successful',
      data: {
        user: user.toJSON(),
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

