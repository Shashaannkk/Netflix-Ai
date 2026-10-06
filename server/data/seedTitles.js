import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Title from '../models/Title.js';

// ── Sample Timeline Events for Tears of Steel / Big Buck Bunny ───────────────
const sampleTimeline = [
  {
    timestampStart: 0,
    timestampEnd: 30,
    eventType: 'scene',
    payload: {
      sceneName: 'Opening Scene',
      location: 'Amsterdam Lab',
      mood: 'Dramatic',
      synopsis: 'Scientists gather to deploy experimental temporal technology.',
    },
  },
  {
    timestampStart: 15,
    eventType: 'character',
    payload: {
      characterName: 'Celia',
      role: 'Lead Scientist',
      description: 'Pioneer of memory extraction research.',
    },
  },
  {
    timestampStart: 30,
    eventType: 'variation',
    payload: {
      promptText: 'Bunny faces a tactical roadblock. Which path should the team pursue?',
      optionA: { id: 'opt_crossroads_a', text: '⚡ Option A: Take the high-tech highway escape' },
      optionB: { id: 'opt_crossroads_b', text: '🥷 Option B: Duck into the neon alley shortcut' },
      canonicalChoice: 'opt_crossroads_b',
    },
  },
  {
    timestampStart: 45,
    eventType: 'glossary',
    payload: {
      term: 'Temporal Link',
      definition: 'A device capable of projecting neural timelines in real-time.',
    },
  },
  {
    timestampStart: 60,
    eventType: 'trivia',
    payload: {
      question: 'Where was this open movie rendered?',
      answer: 'Blender Studio in Amsterdam.',
    },
  },
];

// ── Expanded Seed Titles Array (10 Netflix-Quality Titles) ───────────────────
const seedData = [
  {
    title: 'Kantara A Legend: Chapter 1',
    tmdbId: 964980,
    description:
      'When tragic secrets unfold, a young champion must embrace divine guardianship and battle dark forces threatening his ancestral village.',
    durationSeconds: 9000,
    genres: ['Action', 'Drama', 'Fantasy', 'Mythology'],
    ageRating: 'U/A 16+',
    language: 'Hindi',
    releaseYear: 2025,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Tears of Steel',
    description:
      'In a bleak future, a group of warriors and scientists take refuge in an Amsterdam laboratory. Using experimental technology, they attempt to turn back the clock and save the world from a robotic takeover.',
    durationSeconds: 734,
    genres: ['Sci-Fi', 'Action', 'Drama'],
    ageRating: 'U/A 13+',
    language: 'English',
    releaseYear: 2012,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Big Buck Bunny',
    description:
      'A large and lovable rabbit deals with three bullying rodents who ruin his peaceful meadow. What starts as passive endurance quickly escalates into an elaborate, slapstick campaign of retribution.',
    durationSeconds: 596,
    genres: ['Animation', 'Comedy', 'Family'],
    ageRating: 'U',
    language: 'English',
    releaseYear: 2008,
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Cyber Nexus',
    description:
      'In a neon-drenched dystopia controlled by rogue synthetic minds, a covert operative uncovers a conspiracy that challenges human consciousness itself.',
    durationSeconds: 680,
    genres: ['Sci-Fi', 'Cyberpunk', 'Action'],
    ageRating: '16+',
    language: 'English',
    releaseYear: 2024,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Neon Odyssey',
    description:
      'A gritty noir detective navigates synthetic underworlds to solve the disappearance of a high-profile cybernetics architect.',
    durationSeconds: 720,
    genres: ['Cyberpunk', 'Mystery', 'Thriller'],
    ageRating: '18+',
    language: 'English',
    releaseYear: 2023,
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Cosmic Drift',
    description:
      'Stranded on the outer rim of a collapsing wormhole, a research vessel crew experiences time dilation and psychological anomalies.',
    durationSeconds: 810,
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    ageRating: '13+',
    language: 'English',
    releaseYear: 2023,
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Shadow Protocol',
    description:
      'An elite counter-intelligence team races against the clock to neutralize an autonomous orbital weapon before total blackout.',
    durationSeconds: 650,
    genres: ['Action', 'Thriller', 'Espionage'],
    ageRating: '16+',
    language: 'English',
    releaseYear: 2024,
    poster: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'The Silent Horizon',
    description:
      'A breathtaking visual spectacle exploring a forgotten civilization hidden beneath deep ocean trenches.',
    durationSeconds: 600,
    genres: ['Documentary', 'Visual', 'Atmospheric'],
    ageRating: 'U',
    language: 'English',
    releaseYear: 2022,
    poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Quantum Paradox',
    description:
      'When temporal paradoxes fracture the timeline into parallel realities, two estranged siblings must align their actions across dimensions.',
    durationSeconds: 750,
    genres: ['Sci-Fi', 'Action', 'Mystery'],
    ageRating: '16+',
    language: 'English',
    releaseYear: 2024,
    poster: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Apex Synthetic',
    description:
      'Humanity creates its first sentience engine, only to discover it has developed a moral code that conflicts with its creators.',
    durationSeconds: 710,
    genres: ['Sci-Fi', 'Drama', 'Thriller'],
    ageRating: '18+',
    language: 'English',
    releaseYear: 2023,
    poster: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
  {
    title: 'Hyperdrive Zero',
    description:
      'An epic space adventure following a rebel pilot leading a desperate mission through uncharted asteroid fields.',
    durationSeconds: 690,
    genres: ['Sci-Fi', 'Action', 'Space Opera'],
    ageRating: '13+',
    language: 'English',
    releaseYear: 2024,
    poster: 'https://images.unsplash.com/photo-1447433819943-74a20887a81e?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
    videoAssetUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    isPublished: true,
    timeline: sampleTimeline,
  },
];

import { isDbConnected } from '../config/db.js';

export const seedTitlesData = async () => {
  if (!isDbConnected()) {
    console.log('[Seed] Skipping titles seed: MongoDB is not connected.');
    return;
  }
  try {
    const existingCount = await Title.countDocuments();
    if (existingCount >= 10) {
      console.log(`[Seed] Titles database already contains ${existingCount} titles.`);
      return;
    }

    await Title.deleteMany({}); // Refresh seed data
    const inserted = await Title.insertMany(seedData);
    console.log(`[Seed] Successfully seeded ${inserted.length} Netflix movie titles with rich metadata!`);
  } catch (err) {
    console.error('[Seed] Error seeding titles:', err.message);
  }
};

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/netflix-ai-watch-spaces';
  mongoose.connect(MONGO_URI).then(async () => {
    await seedTitlesData();
    mongoose.disconnect();
  });
}
