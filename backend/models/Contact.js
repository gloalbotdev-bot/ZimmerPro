import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  accountId: {
    type: Number,
    required: false, // Not required for admin users
    ref: 'Account'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Always required - who created this contact
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
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
    trim: true
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Transform _id to id and userId
contactSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  if (obj.userId) {
    obj.userId = obj.userId.toString();
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('Contact', contactSchema);
