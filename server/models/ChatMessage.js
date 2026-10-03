import mongoose from 'mongoose';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  CHAT MESSAGE SCHEMA (Part 6)
 *
 *  Persists chat history for Watch Spaces in MongoDB.
 *  Allows ordered delivery and history retrieval upon join / reconnect.
 * ──────────────────────────────────────────────────────────────────────────────
 */
const chatMessageSchema = new mongoose.Schema(
  {
    watchSpaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WatchSpace',
      required: [true, 'Message must be associated with a Watch Space'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a sender'],
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: [true, 'Message text cannot be empty'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isAi: {
      type: Boolean,
      default: false,
    },
    sourceEvents: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Index for fast query of recent messages sorted by time
chatMessageSchema.index({ watchSpaceId: 1, createdAt: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;
