import mongoose from 'mongoose';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  USER INTERACTION SCHEMA (Part 9)
 *
 *  Tracks individual user viewing habits, ratings, and watch party telemetry
 *  for hybrid recommendation calculation and personal dashboard history.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const userInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    titleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Title',
      required: true,
      index: true,
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number, // 1 to 5 stars
      min: 1,
      max: 5,
      default: null,
    },
    genreAffinity: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    language: {
      type: String,
      default: 'English',
    },
    mediaType: {
      type: String,
      default: 'movie',
    },
    titleName: {
      type: String,
      default: '',
    },
    poster: {
      type: String,
      default: null,
    },
    backdropUrl: {
      type: String,
      default: null,
    },
    coWatchedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

userInteractionSchema.index({ userId: 1, titleId: 1 }, { unique: true });

const UserInteraction = mongoose.model('UserInteraction', userInteractionSchema);

export default UserInteraction;
