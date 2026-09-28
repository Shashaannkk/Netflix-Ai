import mongoose from 'mongoose';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  TIMELINE EVENT SUBDOCUMENT SCHEMA
 *
 *  Each event anchors to a specific timestamp (or range) within the video.
 *
 *  eventType values:
 *    'scene'     — A named scene begins (location, mood, key story beat)
 *    'character' — A character appears or is first introduced
 *    'trivia'    — A quiz question the AI can surface to viewers
 *    'glossary'  — A term/concept shown on screen that the AI can define
 *    'variation' — A narrative variation point where viewers can vote
 *
 *  payload is a Mixed (freeform) object. The shape depends on eventType:
 *
 *    scene:      { sceneName, location, mood, synopsis }
 *    character:  { name, role, isFirstAppearance, description }
 *    trivia:     { question, answer, difficulty, hint }
 *    glossary:   { term, definition, relatedTerms[] }
 *    variation:  { promptText, optionA, optionB, canonicalChoice }
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */
const timelineEventSchema = new mongoose.Schema(
  {
    // Anchor point — seconds from the beginning of the video
    timestampStart: {
      type: Number,
      required: true,
      min: 0,
    },
    // Optional end second — defines a range rather than a single point
    timestampEnd: {
      type: Number,
      default: null,
    },
    // Category of the event — drives AI behaviour and UI rendering
    eventType: {
      type: String,
      required: true,
      enum: ['scene', 'character', 'trivia', 'glossary', 'variation'],
    },
    // Freeform payload — shape is validated by application logic, not Mongoose
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: true } // Keep _id so individual events can be referenced
);

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  TITLE (MOVIE / TV SHOW) SCHEMA
 * ──────────────────────────────────────────────────────────────────────────────
 */
const titleSchema = new mongoose.Schema(
  {
    // ── Core metadata ──────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Title name is required'],
      trim: true,
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description must be at most 2000 characters'],
    },
    // Total duration in seconds — used by the player and timeline validation
    durationSeconds: {
      type: Number,
      required: [true, 'Duration in seconds is required'],
      min: [1, 'Duration must be at least 1 second'],
    },
    genres: {
      type: [String],
      default: [],
      // e.g. ['Action', 'Sci-Fi', 'Thriller']
    },
    ageRating: {
      type: String,
      default: 'U/A',
      // e.g. 'U', 'U/A', 'U/A 13+', 'U/A 16+', 'A'
    },
    language: {
      type: String,
      default: 'English',
    },
    releaseYear: {
      type: Number,
    },

    // ── Asset URLs ─────────────────────────────────────────────────────────────
    // Poster: portrait thumbnail used in carousels (2:3 ratio)
    poster: {
      type: String,
      default: null,
    },
    // Backdrop: wide hero/billboard image (16:9 ratio)
    backdropUrl: {
      type: String,
      default: null,
    },
    // The actual streamable video — can be a CDN URL or local /public/ path
    videoAssetUrl: {
      type: String,
      required: [true, 'videoAssetUrl is required'],
    },
    // Short preview/trailer clip shown on hover (optional)
    trailerUrl: {
      type: String,
      default: null,
    },

    // ── Timeline ───────────────────────────────────────────────────────────────
    // Array of all timeline events embedded in the title document.
    // Sorted by timestampStart at seed/write time.
    // The AI engine queries subsets using the range endpoint.
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },

    // ── Moderation / Admin ─────────────────────────────────────────────────────
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Accelerate genre-filtered catalogue queries
titleSchema.index({ genres: 1 });
// Accelerate published-only catalogue queries
titleSchema.index({ isPublished: 1, createdAt: -1 });
// Accelerate timeline range queries on the embedded array
titleSchema.index({ 'timeline.timestampStart': 1 });

// ── Instance helper: get events in a time range ────────────────────────────────
/**
 * Returns all timeline events where timestampStart falls within [start, end].
 * Used directly by the controller when a full document is already in memory.
 */
titleSchema.methods.getTimelineRange = function (start, end) {
  return this.timeline.filter(
    (ev) => ev.timestampStart >= start && ev.timestampStart <= end
  );
};

const Title = mongoose.model('Title', titleSchema);

export default Title;
