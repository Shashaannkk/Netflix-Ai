import mongoose from 'mongoose';

/**
 * Connect to MongoDB using Mongoose.
 * Implements resilient error handling and status monitoring.
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/netflix-ai-watch-spaces';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s if MongoDB server is unavailable
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.warn(`[MongoDB] Warning: Could not establish initial connection to MongoDB at ${mongoUri}`);
    console.warn(`[MongoDB] Details: ${error.message}`);
    console.warn(`[MongoDB] Server will continue running. Ensure MongoDB daemon is running locally or check MONGO_URI.`);
  }
};

// Monitor connection events
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection state: Connected');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('[MongoDB] Connection state: Disconnected');
});

/**
 * Helper to check connection status
 */
export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};
