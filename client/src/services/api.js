import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    // If envUrl is set and is NOT localhost and NOT a placeholder domain (e.g. your-vercel-domain), use it. Otherwise fallback to origin-relative /api
    if (
      envUrl &&
      !envUrl.includes('localhost') &&
      !envUrl.includes('127.0.0.1') &&
      !envUrl.includes('your-vercel-domain') &&
      !envUrl.includes('example.com')
    ) {
      return envUrl;
    }
    return `${window.location.origin}/api`;
  }
  return envUrl || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Pre-configured Axios instance for REST API communications.
 * Includes credentials for httpOnly refresh cookies.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // Crucial for sending/receiving httpOnly refresh cookies
  timeout: 10000
});

// In-memory access token storage
let currentAccessToken = localStorage.getItem('netflix_access_token') || null;

export const setAccessToken = (token) => {
  currentAccessToken = token;
  if (token) {
    localStorage.setItem('netflix_access_token', token);
  } else {
    localStorage.removeItem('netflix_access_token');
  }
};

export const getAccessToken = () => currentAccessToken;

// Request Interceptor: Attach JWT Bearer Access Token
apiClient.interceptors.request.use(
  (config) => {
    if (currentAccessToken) {
      config.headers.Authorization = `Bearer ${currentAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-Refresh on TOKEN_EXPIRED (401)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and token expired, attempt transparent refresh
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response) {
      return Promise.reject(
        new Error(`Network Error: Cannot connect to the Netflix AI backend server at ${API_BASE_URL}. Please ensure the server is online.`)
      );
    }

    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// Auth REST API Calls
export const loginUser = (credentials) => apiClient.post('/auth/login', credentials);
export const registerUser = (userData) => apiClient.post('/auth/register', userData);
export const googleAuthUser = (data) => apiClient.post('/auth/google', data);
export const refreshTokenRequest = () => apiClient.post('/auth/refresh');
export const logoutUser = () => apiClient.post('/auth/logout');
export const fetchCurrentUser = () => apiClient.get('/auth/me');

// RBAC Test Verification Calls
export const testViewerAccess = () => apiClient.get('/test/viewer');
export const testHostAccess = () => apiClient.get('/test/host');
export const testAdminAccess = () => apiClient.get('/test/admin');

// Part 9 Dashboard, Analytics & Recommendations API Calls
export const getDashboardApi = () => apiClient.get('/dashboard/user');
export const recordInteractionApi = (data) => apiClient.post('/dashboard/interaction', data);
export const getSpaceAnalyticsApi = (spaceId) => apiClient.get(`/dashboard/analytics/${spaceId}`);

// Part 9 Admin Timeline & Metadata Management API Calls
export const validateTimelineApi = (titleId, timeline) =>
  apiClient.post(`/admin/titles/${titleId}/timeline/validate`, { timeline });

export const updateTimelineApi = (titleId, timeline) =>
  apiClient.put(`/admin/titles/${titleId}/timeline`, { timeline });

// Health Check
export const checkApiHealth = () => apiClient.get('/health');

export default apiClient;

