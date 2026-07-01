import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
    ref: 'Account'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['supplier', 'customer'],
    default: 'supplier'
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
  },
  lastOrderDate: {
    type: String,
    default: ''
  },
  orderCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

contactSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  if (obj.userId) {
    obj.userId = obj.userId.toString();
  }
  if (obj.accountId != null) {
    obj.accountId = obj.accountId.toString();
  }
  delete obj.__v;
  return obj;
};

export default mongoose.model('Contact', contactSchema);
