import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
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
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Transform _id to id
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
