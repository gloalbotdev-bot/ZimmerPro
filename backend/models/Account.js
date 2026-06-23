import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String,
    default: ''
  },
  primary_contact_id: {
    type: Number,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  whatsapp_number: {
    type: String,
    default: ''
  },
  maxUnits: {
    type: Number,
    default: 10
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Account מקושר ל-User (חובה) - רק אם בהגדרות היוזר הוא בעל מתחם
  }
}, {
  timestamps: true,
  strict: true,
  // Explicitly disable validation for removed fields
  validateBeforeSave: true
});

// Add pre-save hook to ensure token and accountNumber are never saved
accountSchema.pre('save', function(next) {
  // Explicitly remove token and accountNumber if they somehow exist
  if (this.token !== undefined) {
    delete this.token;
  }
  if (this.accountNumber !== undefined) {
    delete this.accountNumber;
  }
  // Use $unset to ensure MongoDB doesn't save them
  this.$unset = this.$unset || {};
  this.$unset.token = '';
  this.$unset.accountNumber = '';
  next();
});

// Add pre-validate hook to skip validation for removed fields
accountSchema.pre('validate', function(next) {
  // Remove token and accountNumber from validation
  if (this.token !== undefined) {
    this.token = undefined;
  }
  if (this.accountNumber !== undefined) {
    this.accountNumber = undefined;
  }
  next();
});


// Transform _id to id and userId
accountSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  // Transform userId ObjectId to string (so frontend can use it)
  if (obj.userId) {
    obj.userId = obj.userId.toString();
  }
  delete obj.__v;
  return obj;
};

// Delete model from cache if it exists to ensure fresh schema
// Also delete from connection models to ensure complete cache clear
if (mongoose.models.Account) {
  delete mongoose.models.Account;
}
if (mongoose.connection && mongoose.connection.models && mongoose.connection.models.Account) {
  delete mongoose.connection.models.Account;
}
console.log('📛 Account schema paths:', Object.keys(accountSchema.paths));
// Create model with explicit collection name to avoid conflicts
const Account = mongoose.model('Account', accountSchema, 'accounts');
export default Account;
