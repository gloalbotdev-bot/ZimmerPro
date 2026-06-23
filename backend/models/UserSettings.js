import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  ownerType: {
    type: String,
    enum: ['client', 'zimmer_owner', 'complex_owner', 'admin'], // לקוח, בעל צימר, בעל מתחם או אדמין
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
userSettingsSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('UserSettings', userSettingsSchema);
