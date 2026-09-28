import mongoose from 'mongoose';

/**
 * SessionAnalytics Schema — Coarse Session Analytics (Persisted on Room End)
 * High-frequency playback heartbeats stay in-memory.
 */
const sessionAnalyticsSchema = new mongoose.Schema(
  {
    watchSpaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WatchSpace',
      required: true,
      index: true,
    },
    titleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Title',
      default: null,
    },
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    hostUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    sessionEnd: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    peakParticipants: {
      type: Number,
      default: 1,
    },
    totalParticipantsJoined: {
      type: Number,
      default: 1,
    },
    aiQuestionCount: {
      type: Number,
      default: 0,
    },
    triviaCount: {
      type: Number,
      default: 0,
    },
    chatVolume: {
      type: Number,
      default: 0,
    },
    completionPercentage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const SessionAnalytics = mongoose.model('SessionAnalytics', sessionAnalyticsSchema);
export default SessionAnalytics;
