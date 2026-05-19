const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['critical_stock', 'approval_required', 'low_stock', 'system', 'vendor'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['Reorder Now', 'Approve', 'Ignore', 'View Details'],
    default: 'View Details'
  },
  actionColor: String,
  actionBg: String,
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDismissed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to get active alerts
alertSchema.statics.getActiveAlerts = async function() {
  return await this.find({ isDismissed: false })
    .sort({ createdAt: -1 })
    .limit(5);
};

// Static method to get new alerts count
alertSchema.statics.getNewAlertsCount = async function() {
  return await this.countDocuments({ isRead: false, isDismissed: false });
};

module.exports = mongoose.model('Alert', alertSchema);