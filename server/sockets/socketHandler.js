/**
 * Socket.IO Handler
 * Manages real-time bidirectional WebSocket connections.
 */
export const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id} (Transport: ${socket.conn.transport.name})`);

    // Acknowledge connection to the client immediately
    socket.emit('connection:ack', {
      success: true,
      message: 'Connected to Netflix AI Watch Spaces real-time engine',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Echo / Ping test event for connection verification
    socket.on('client:ping', (data) => {
      console.log(`[Socket.IO] Ping received from ${socket.id}:`, data);
      socket.emit('server:pong', {
        receivedAt: new Date().toISOString(),
        clientData: data
      });
    });

    // Handle Disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });
};
