import app from '../server/server.js';
import { connectDB } from '../server/config/db.js';
import { validateEnvironment } from '../server/utils/envValidator.js';

// Perform startup env validation once at module initialization
validateEnvironment();

export default async function handler(req, res) {
  // Ensure logs appear in Vercel Function Logs dashboard
  console.log(`[BOOT] Serverless execution context initialized`);
  console.log(`[Vercel Serverless] ${req.method} ${req.url} | Origin: ${req.headers.origin || 'none'}`);

  try {
    // Asynchronously connect to MongoDB without blocking cold start
    await connectDB();
  } catch (err) {
    console.error('[Vercel Serverless] DB Connection warning:', err.message);
  }

  // Forward request to Express app
  return app(req, res);
}
