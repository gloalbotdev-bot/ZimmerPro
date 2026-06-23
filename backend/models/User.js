import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 3
  },
  idNumber: {
    type: String,
    trim: true,
    index: true // Add index for faster lookups
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'zimmer_owner', 'complex_owner', 'manager', 'client', 'customer'],
    required: true,
    default: 'zimmer_owner'
  },
  userSettingsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSettings',
    required: true // חובה - כל יוזר חייב להיות מקושר להגדרות משתמש
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  preferredLanguage: {
    type: String,
    enum: ['he', 'en', 'ar'],
    default: 'he'
  },
  googleCalendarLinked: {
    type: Boolean,
    default: false
  },
  googleAccessToken: {
    type: String,
    default: null
  },
  googleRefreshToken: {
    type: String,
    default: null
  },
  
  googleCalendarId: {
    type: String,
    default: null // Defaults to 'primary' calendar
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return;
  
  // Hash the password with bcrypt
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output and transform _id to id
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  // Transform userSettingsId ObjectId to string (so frontend can use it)
  if (obj.userSettingsId) {
    obj.userSettingsId = obj.userSettingsId.toString();
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
