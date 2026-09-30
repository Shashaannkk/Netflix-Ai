import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    return window.location.origin;
  }
  return envUrl || 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

/**
 * Singleton Socket.IO client instance.
 * Automatically connects to backend WebSocket server.
 */
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling']
});

// Debug event listeners
socket.on('connect', () => {
  console.log(`[Socket.IO Client] Connected to server with ID: ${socket.id}`);
});

socket.on('connection:ack', (ack) => {
  console.log(`[Socket.IO Client] Server Acknowledgement:`, ack);
});

socket.on('disconnect', (reason) => {
  console.log(`[Socket.IO Client] Disconnected: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.warn(`[Socket.IO Client] Connection Error: ${error.message}`);
});

export default socket;
