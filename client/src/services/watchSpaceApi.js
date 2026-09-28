import { apiClient } from './api';

/**
 * Watch Space API Service
 * All REST calls for creating, joining, and managing Watch Spaces.
 */

// ── Host: Create a new Watch Space ───────────────────────────────────────────
export const createSpace = (payload) =>
  apiClient.post('/spaces', payload);
// payload: { titleId, settings: { roomName, isPrivate, maxParticipants, aiVerbosity, votingEnabled } }

// ── Host: Update room status (live / ended) ──────────────────────────────────
export const updateSpaceStatus = (spaceId, status) =>
  apiClient.patch(`/spaces/${spaceId}/status`, { status });

// ── Participant: Resolve invite code → space preview ─────────────────────────
export const resolveInviteCode = (code) =>
  apiClient.get(`/spaces/join/${code.toUpperCase().trim()}`);

// ── Participant: Join a space by its MongoDB ID ──────────────────────────────
export const joinSpace = (spaceId) =>
  apiClient.post(`/spaces/${spaceId}/join`);

// ── Participant: Leave a space ───────────────────────────────────────────────
export const leaveSpace = (spaceId) =>
  apiClient.delete(`/spaces/${spaceId}/leave`);

// ── Shared: Get a single space by ID ─────────────────────────────────────────
export const getSpace = (spaceId) =>
  apiClient.get(`/spaces/${spaceId}`);

// ── Shared: Get all spaces for current user (host + participant) ─────────────
export const getMySpaces = () =>
  apiClient.get('/spaces/my');

// ── Chat: Get chat history for space ─────────────────────────────────────────
export const getSpaceMessages = (spaceId) =>
  apiClient.get(`/spaces/${spaceId}/messages`);

// ── AI Co-Pilot: Ask RAG Grounded Question ─────────────────────────────────
export const askAiCoPilotApi = (spaceId, payload) =>
  apiClient.post(`/v1/watch-spaces/${spaceId}/ai/ask`, payload);

// ── Catalogue: Get published titles for the title picker ────────────────────
export const getTitlesForPicker = (params = {}) =>
  apiClient.get('/titles', { params: { limit: 50, ...params } });


