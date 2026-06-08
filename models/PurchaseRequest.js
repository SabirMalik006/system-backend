const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  sku: { type: String, default: '' },
  name: { type: String, required: true },
  category: { type: String, default: 'Other' },
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
});

const purchaseRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    required: true,
  },
  requestType: {
    type: String,
    enum: ['Manual Request', 'Auto Reorder', 'Emergency Request'],
    default: 'Manual Request',
  },
  requestingUnit: {
    type: String,
    default: 'Warehouse A - North Sector',
  },
  requestingUser: {
    type: String,
    trim: true,
    default: '',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  reason: {
    type: String,
    trim: true,
    default: '',
  },
  remarks: {
    type: String,
    trim: true,
    default: '',
  },
  items: [lineItemSchema],
  subtotal: { type: Number, default: 0 },
  shipping: { type: Number, default: 125 },
  taxes: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Processing'],
    default: 'Pending',
  },
  vendor: {
    type: String,
    default: '',
  },
  poNumber: {
    type: String,
    default: '',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedReason: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

purchaseRequestSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  this.total = this.subtotal + this.shipping + this.taxes;
  next();
});

purchaseRequestSchema.statics.getKPIStats = async function() {
  const total = await this.countDocuments();
  const pending = await this.countDocuments({ status: 'Pending' });
  const approved = await this.countDocuments({ status: 'Approved' });
  const rejected = await this.countDocuments({ status: 'Rejected' });
  const totalPOValue = await this.aggregate([
    { $match: { status: 'Approved' } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return {
    totalRequests: total,
    pendingApproval: pending,
    approved,
    rejected,
    totalPOValue: totalPOValue[0]?.total || 0,
  };
};

purchaseRequestSchema.statics.getMonthlyTrend = async function(year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data = await this.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: {
      _id: { $month: '$createdAt' },
      count: { $sum: 1 },
      value: { $sum: '$total' },
    }},
    { $sort: { '_id': 1 } },
  ]);
  return months.map((name, i) => {
    const found = data.find(d => d._id === i + 1);
    return { name, requests: found?.count || 0, value: found?.value || 0 };
  });
};

module.exports = mongoose.model('PurchaseRequest', purchaseRequestSchema);
