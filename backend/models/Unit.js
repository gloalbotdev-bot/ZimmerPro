import mongoose from 'mongoose';

const specialPriceSchema = new mongoose.Schema({
  season: String,
  mode: String,
  pricePerNight: Number,
  dayFrom: Number,
  dayTo: Number,
  startDate: String,
  endDate: String,
  isDefault: Boolean,
  // legacy fields kept for backward compatibility
  label: String,
  earlyCheckInAllowed: Boolean,
  lateCheckOutAllowed: Boolean,
  minNights: Number,
  dayType: String
}, { _id: false });

const unitSchema = new mongoose.Schema({
  linkType: {
    type: String,
    enum: ['user', 'account'], // האם מוקשר ל-User או ל-Account
    required: true
  },
  linkedToId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // ID של User או Account (תלוי ב-linkType)
    refPath: 'linkTypeModel' // Dynamic reference based on linkType
  },
  linkTypeModel: {
    type: String,
    enum: ['User', 'Account'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  pricePerNight: {
    type: Number,
    required: true,
    min: 0
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'cleaning', 'maintenance'],
    default: 'available'
  },
  images: {
    type: [String],
    default: []
  },
  mainImage: {
    type: String,
    default: null // URL or path to the primary/main image
  },
  videoUrl: {
    type: String,
    default: ''
  },
  facilityIds: {
    type: [String],
    default: []
  },
  specialPrices: {
    type: [specialPriceSchema],
    default: []
  },
  region: {
    type: String,
    enum: ['צפון', 'דרום', 'מרכז', 'השפלה'],
    default: null
  }
}, {
  timestamps: true
});

// Set linkTypeModel based on linkType before validation
unitSchema.pre('validate', function() {
  if (this.linkType === 'user') {
    this.linkTypeModel = 'User';
  } else if (this.linkType === 'account') {
    this.linkTypeModel = 'Account';
  }
  // No need to call next() in Mongoose 6+
});

// Transform _id to id and linkedToId
unitSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  if (obj.linkedToId) {
    obj.linkedToId = obj.linkedToId.toString();
  }
  delete obj.__v;
  delete obj.linkTypeModel; // Don't expose internal field
  return obj;
};

export default mongoose.model('Unit', unitSchema);
