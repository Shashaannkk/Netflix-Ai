import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loginUser,
  registerUser,
  logoutUser,
  fetchCurrentUser,
  refreshTokenRequest,
  setAccessToken,
  getAccessToken
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize and hydrate authentication state
  useEffect(() => {
    const hydrateAuth = async () => {
      try {
        const storedToken = getAccessToken();
        if (storedToken) {
          // If token exists in storage, fetch user details
          const res = await fetchCurrentUser();
          setUser(res.data.user);
        } else {
          // Attempt silent session recovery via httpOnly refresh token cookie
          try {
            const refreshRes = await refreshTokenRequest();
            if (refreshRes?.data?.accessToken) {
              setAccessToken(refreshRes.data.accessToken);
              setUser(refreshRes.data.user);
            }
          } catch (e) {
            // No active session cookie - expected for guest visitors
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session hydration error:', err.message);
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrateAuth();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const response = await loginUser({ email, password });
      const { user: userData, accessToken } = response.data;

      setAccessToken(accessToken);
      setUser(userData);
      return userData;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const register = async (formData) => {
    setAuthError(null);
    try {
      const response = await registerUser(formData);
      const { user: userData, accessToken } = response.data;

      setAccessToken(accessToken);
      setUser(userData);
      return userData;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('[AuthContext] Logout API error:', err.message);
    } finally {
      setAccessToken(null);
      setUser(null);
      setAuthError(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    authError,
    setAuthError,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
