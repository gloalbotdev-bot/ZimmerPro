import mongoose from 'mongoose';

const compromiseOfferSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['discount_20', 'credit_150', 'reasoned_response', 'custom'],
    required: true
  },
  customText: {
    type: String,
    default: ''
  },
  sentAt: {
    type: Date,
    required: true
  }
}, { _id: false });

const guestResponseSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['accepted', 'rejected', 'counter'],
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  respondedAt: {
    type: Date,
    required: true
  }
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    ref: 'Unit'
  },
  guestUserId: {
    type: String,
    default: null,
    ref: 'User'
  },
  guestName: {
    type: String,
    required: true,
    trim: true
  },
  bookingId: {
    type: String,
    default: null,
    ref: 'Booking'
  },
  rating: {
    type: Number,
    required: false,
    default: null,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending_owner', 'compromise_sent', 'counter_sent', 'published', 'withdrawn'],
    default: 'pending_owner'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  ownerResponseDeadline: {
    type: Date,
    default: null
  },
  compromiseOffer: {
    type: compromiseOfferSchema,
    default: null
  },
  compromiseDeadline: {
    type: Date,
    default: null
  },
  guestResponse: {
    type: guestResponseSchema,
    default: null
  }
}, {
  timestamps: true
});

reviewSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('Review', reviewSchema);
