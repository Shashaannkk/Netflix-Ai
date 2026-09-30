import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Title from '../models/Title.js';
import UserInteraction from '../models/UserInteraction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { isDbConnected } from '../config/db.js';

export const seedUserInteractionsData = async () => {
  if (!isDbConnected()) {
    console.log('[Seed] Skipping user interactions seed: MongoDB is not connected.');
    return;
  }
  try {
    const users = await User.find({}).limit(5);
    const titles = await Title.find({}).limit(5);

    if (users.length === 0 || titles.length === 0) {
      console.log('[Seed] Users or Titles missing. Skipping interactions seed.');
      return;
    }

    const firstUser = users[0];
    const secondUser = users[1] || users[0];

    const sampleInteractions = [
      {
        userId: firstUser._id,
        titleId: titles[0]._id,
        watchedSeconds: 420,
        completed: true,
        rating: 5,
        genreAffinity: titles[0].genres || ['Sci-Fi', 'Action'],
        coWatchedUsers: [secondUser._id],
      },
    ];

    if (titles.length > 1) {
      sampleInteractions.push({
        userId: firstUser._id,
        titleId: titles[1]._id,
        watchedSeconds: 180,
        completed: false,
        rating: 4,
        genreAffinity: titles[1].genres || ['Animation', 'Comedy'],
        coWatchedUsers: [secondUser._id],
      });
    }

    for (const data of sampleInteractions) {
      await UserInteraction.findOneAndUpdate(
        { userId: data.userId, titleId: data.titleId },
        { $set: data },
        { upsert: true, new: true }
      );
    }

    console.log(`[Seed] Seeded ${sampleInteractions.length} interaction records for recommendation engine.`);
  } catch (err) {
    console.error('[Seed] Error seeding user interactions:', err.message);
  }
};

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/netflix-ai';
  mongoose.connect(MONGO_URI).then(async () => {
    await seedUserInteractionsData();
    mongoose.disconnect();
  });
}
