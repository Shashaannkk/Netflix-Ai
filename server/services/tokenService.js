import jwt from 'jsonwebtoken';

/**
 * Token Service
 * Manages creation, verification, and cookie storage of Access & Refresh tokens.
 */

const getAccessSecret = () => {
  if (process.env.JWT_ACCESS_SECRET) return process.env.JWT_ACCESS_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_ACCESS_SECRET environment variable is missing in production!');
  }
  return 'netflix_ai_access_token_secret_development_key_12345';
};

const getRefreshSecret = () => {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is missing in production!');
  }
  return 'netflix_ai_refresh_token_secret_development_key_67890';
};

export const generateAccessToken = (user) => {
  const secret = getAccessSecret();

  const payload = {
    id: user._id || user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role
  };

  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

  return jwt.sign(payload, secret, { expiresIn });
};

export const generateRefreshToken = (user) => {
  const secret = getRefreshSecret();

  const payload = {
    id: user._id || user.id
  };

  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyAccessToken = (token) => {
  const secret = getAccessSecret();
  return jwt.verify(token, secret);
};

export const verifyRefreshToken = (token) => {
  const secret = getRefreshSecret();
  return jwt.verify(token, secret);
};

export const setRefreshTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });
};

export const clearRefreshTokenCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
  });
};
