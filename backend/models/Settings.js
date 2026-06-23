import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  ownerType: {
    type: String,
    enum: ['zimmer_owner', 'complex_owner'], // בעל צימר או בעל מתחם
    required: true
  },
  numberOfComplexes: {
    type: Number,
    default: 0, // מספר מתחמים (אם הוא בעל מתחם)
    min: 0
  }
}, {
  timestamps: true
});

// Transform _id to id
settingsSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('Settings', settingsSchema);
