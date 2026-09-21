import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ]
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters long'],
      maxlength: [50, 'Display name cannot exceed 50 characters']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Never include in query results by default
    },
    role: {
      type: String,
      enum: {
        values: ['viewer', 'host', 'admin'],
        message: '{VALUE} is not a supported role'
      },
      default: 'viewer'
    },
    preferences: {
      favoriteGenres: {
        type: [String],
        default: ['Sci-Fi', 'Action']
      },
      language: {
        type: String,
        default: 'en'
      }
    },
    refreshToken: {
      type: String,
      select: false // Never include in query results by default
    }
  },
  {
    timestamps: true // Automatically creates createdAt and updatedAt
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not loaded for comparison');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Safe JSON serialization (strip sensitive internals)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
