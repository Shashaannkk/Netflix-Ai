import mongoose from 'mongoose';

/**
 * Media Schema — Provider Agnostic Media Model
 * Types:
 *  - 'youtube': providerVideoId contains YouTube video ID (e.g. 'YoHD9XEInc0')
 *  - 'html5': playbackUrl contains direct MP4 / WebM stream URL
 *  - 'authorized_stream': playbackUrl contains HLS / DASH / external stream URL
 */
const mediaSchema = new mongoose.Schema(
  {
    titleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Title',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['youtube', 'html5', 'authorized_stream'],
      required: true,
      default: 'youtube',
    },
    providerVideoId: {
      type: String,
      default: null,
    },
    playbackUrl: {
      type: String,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Media = mongoose.model('Media', mediaSchema);
export default Media;
