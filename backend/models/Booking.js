import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    ref: 'Unit'
  },
  guestName: {
    type: String,
    required: true,
    trim: true
  },
  guestPhone: {
    type: String,
    required: true,
    trim: true
  },
  checkIn: {
    type: String,
    required: true
  },
  checkOut: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  googleSynced: {
    type: Boolean,
    default: false
  },
  googleCalendarEventId: {
    type: String,
    default: null // Store Google Calendar event ID for syncing
  },
  userId: {
    type: String,
    default: null,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Transform _id to id
bookingSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('Booking', bookingSchema);
