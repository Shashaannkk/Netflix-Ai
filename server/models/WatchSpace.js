import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  WATCH SPACE SCHEMA
 *
 *  Represents a shared viewing session (room) created by a host.
 *
 *  Lifecycle:
 *    scheduled → live → ended
 *
 *  Invite Code: 6-character alphanumeric, uppercase, generated on creation.
 *  Invite Link: full URL constructed at creation time.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

/**
 * Generates a cryptographically random 6-character uppercase invite code.
 * e.g. "NX8K2M"
 */
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

// ── Settings subdocument ───────────────────────────────────────────────────────
const watchSpaceSettingsSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      trim: true,
      maxlength: [80, 'Room name cannot exceed 80 characters'],
      default: 'Untitled Watch Space',
    },
    isPrivate: {
      type: Boolean,
      default: false,
      // true  → only accessible via invite code/link
      // false → discoverable on the platform
    },
    maxParticipants: {
      type: Number,
      min: [2, 'A Watch Space must allow at least 2 participants'],
      max: [50, 'A Watch Space cannot exceed 50 participants'],
      default: 10,
    },
    // Controls how often the AI Co-Pilot volunteers commentary.
    //   silent   → AI only answers direct questions
    //   moderate → AI surfaces trivia and scene insights occasionally
    //   chatty   → AI is proactive and enthusiastic
    aiVerbosity: {
      type: String,
      enum: ['silent', 'moderate', 'chatty'],
      default: 'moderate',
    },
    // Whether participants can vote on narrative variation points
    votingEnabled: {
      type: Boolean,
      default: true,
    },
    // Selected media choice: 'movie' | 'trailer'
    mediaChoice: {
      type: String,
      default: 'movie',
    },
    // Selected server provider: 'server_alpha' | 'server_beta' | 'server_gamma' | 'server_delta'
    selectedServer: {
      type: String,
      default: 'server_alpha',
    },
    // Explicit video stream URL selected by host on room creation
    videoAssetUrl: {
      type: String,
      default: null,
    },
    // Whether the host has locked the room to prevent new joiners
    isLocked: {
      type: Boolean,
      default: false,
    },
    // Array of muted participant user IDs (cannot send chat messages)
    mutedUserIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { _id: false }
);

// ── Main WatchSpace schema ─────────────────────────────────────────────────────
const watchSpaceSchema = new mongoose.Schema(
  {
    // Reference to the title being watched
    titleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Title',
      required: [true, 'A Watch Space must have a title'],
    },

    // Reference to provider-agnostic media asset (optional)
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },

    // The user who created and controls the space
    hostUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A Watch Space must have a host'],
    },

    // Room lifecycle state
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'live', 'ended'],
        message: '{VALUE} is not a valid Watch Space status',
      },
      default: 'scheduled',
    },

    // All joined participant IDs (excluding host — host is tracked via hostUserId)
    participantIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },

    // Timestamp when the room was transitioned to 'live'
    startedAt: {
      type: Date,
      default: null,
    },

    // Timestamp when the room was ended
    endedAt: {
      type: Date,
      default: null,
    },

    // Room configuration settings
    settings: {
      type: watchSpaceSettingsSchema,
      default: () => ({}),
    },

    // 6-char alphanumeric invite code for manual entry
    inviteCode: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
    },

    // Full shareable URL (constructed at creation time from CLIENT_URL env)
    inviteLink: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// ── Pre-save: auto-generate invite code ────────────────────────────────────────
watchSpaceSchema.pre('save', async function (next) {
  // Only generate once on new document creation
  if (this.isNew && !this.inviteCode) {
    let unique = false;
    let attempts = 0;

    while (!unique && attempts < 10) {
      const candidate = generateInviteCode();
      const existing = await mongoose.model('WatchSpace').findOne({ inviteCode: candidate });
      if (!existing) {
        this.inviteCode = candidate;
        unique = true;
      }
      attempts++;
    }

    if (!this.inviteCode) {
      return next(new Error('Failed to generate a unique invite code. Please try again.'));
    }
  }
  next();
});

// ── Indexes ────────────────────────────────────────────────────────────────────
watchSpaceSchema.index({ hostUserId: 1, status: 1 });
watchSpaceSchema.index({ participantIds: 1 });
watchSpaceSchema.index({ status: 1, createdAt: -1 });

// ── Instance Methods ───────────────────────────────────────────────────────────

/**
 * Returns true if the given userId is the host.
 */
watchSpaceSchema.methods.isHost = function (userId) {
  return this.hostUserId.toString() === userId.toString();
};

/**
 * Returns true if the given userId is already a participant.
 */
watchSpaceSchema.methods.hasParticipant = function (userId) {
  return this.participantIds.some((id) => id.toString() === userId.toString());
};

/**
 * Returns the total headcount: host + participants.
 */
watchSpaceSchema.methods.getCurrentCount = function () {
  return 1 + this.participantIds.length;
};

// ── Static Methods ─────────────────────────────────────────────────────────────

/**
 * Find a space by its invite code (case-insensitive).
 */
watchSpaceSchema.statics.findByInviteCode = function (code) {
  return this.findOne({ inviteCode: code.toUpperCase() })
    .populate('hostUserId', 'displayName email role')
    .populate('titleId', 'title poster durationSeconds genres ageRating videoAssetUrl')
    .populate('participantIds', 'displayName email role');
};

/**
 * Sanitized JSON: strip internal fields before sending to client.
 */
watchSpaceSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

const WatchSpace = mongoose.model('WatchSpace', watchSpaceSchema);

export default WatchSpace;
