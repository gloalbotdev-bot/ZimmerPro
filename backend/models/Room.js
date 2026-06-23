import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Unit'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Always required - who created this room
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  room_type: {
    type: String,
    enum: ['bedroom', 'living_room', 'kitchen', 'bathroom'],
    required: true
  },
  has_jacuzzi: {
    type: Boolean,
    default: false
  },
  has_view: {
    type: Boolean,
    default: false
  },
  beds_count: {
    type: Number,
    default: 0
  },
  windows_count: {
    type: Number,
    default: 0
  },
  has_ac: {
    type: Boolean,
    default: false
  },
  has_tv: {
    type: Boolean,
    default: false
  },
  facilityIds: {
    type: [String],
    default: [] // Many-to-many relationship with Facilities
  }
}, {
  timestamps: true
});

// Transform _id to id, unitId, and userId
roomSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  if (obj.unitId) {
    obj.unitId = obj.unitId.toString();
  }
  if (obj.userId) {
    obj.userId = obj.userId.toString();
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('Room', roomSchema);
