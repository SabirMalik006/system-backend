const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  vendorId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shippingItems: {
    type: String,
    enum: ['SUPPORTING', 'SUPPLIES', 'CONTRACTS', 'SOFTWARE', 'INVENTORY', 'MANUFACTURING', ''],
    default: ''
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  onTimePercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Blacklisted'],
    default: 'Active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster searches
vendorSchema.index({ status: 1, isActive: 1 });

// Static method to get top performing vendors
vendorSchema.statics.getTopVendors = async function(limit = 5) {
  return await this.find({ status: 'Active', isActive: true })
    .sort({ rating: -1, totalOrders: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Vendor', vendorSchema);