const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    unique: true,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  gstNumber: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 3
  },
  performanceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 70
  },
  leadTime: {
    type: Number,
    default: 5, // days
    min: 0
  },
  paymentTerms: {
    type: String,
    default: 'Net 30',
    enum: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  vendorType: {
    type: String,
    enum: ['Logistics', 'Hardware', 'Consulting', 'Raw Material', 'Packaging', 'Other'],
    default: 'Other'
  },
  categories: [{
    type: String,
    enum: ['Tools', 'Electrical', 'Sanitary', 'Paints', 'Consumable', 'Safety', 'Hardware']
  }],
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastOrderDate: {
    type: Date
  },
  contractStartDate: Date,
  contractEndDate: Date,
  isPreferred: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster searches
vendorSchema.index({ performanceScore: -1 });
vendorSchema.index({ status: 1, isActive: 1 });

// Virtual for on-time delivery rate (can be calculated from orders)
vendorSchema.virtual('onTimeDeliveryRate').get(function() {
  // This would be calculated from order history
  // For now, return a default based on performance score
  return Math.min(100, this.performanceScore + 5);
});

// Method to update vendor rating based on new order
vendorSchema.methods.updateRating = async function(orderValue, deliveryDays) {
  // Update total orders and spent
  this.totalOrders += 1;
  this.totalSpent += orderValue;
  this.lastOrderDate = new Date();
  
  // Simple rating calculation (can be customized)
  if (deliveryDays <= this.leadTime) {
    this.performanceScore = Math.min(100, this.performanceScore + 1);
  } else {
    this.performanceScore = Math.max(0, this.performanceScore - 2);
  }
  
  // Update star rating based on performance
  this.rating = (this.performanceScore / 100) * 5;
  
  await this.save();
  return this;
};

// Static method to get top performing vendors
vendorSchema.statics.getTopVendors = async function(limit = 5) {
  return await this.find({ status: 'active', isActive: true })
    .sort({ performanceScore: -1, rating: -1 })
    .limit(limit)
    .select('name rating performanceScore totalOrders vendorType');
};

// Static method to get vendor by category
vendorSchema.statics.getByCategory = async function(category) {
  return await this.find({ 
    categories: category, 
    status: 'active', 
    isActive: true 
  }).sort({ performanceScore: -1 });
};

module.exports = mongoose.model('Vendor', vendorSchema);