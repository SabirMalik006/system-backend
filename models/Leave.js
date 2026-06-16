const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  leaveId: { type: String, unique: true },
  employeeName: { type: String, required: true, trim: true },
  employeeId: { type: String, default: '', trim: true },
  email: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  initials: { type: String, default: '' },
  type: {
    type: String,
    enum: ['Annual', 'Sick', 'Casual', 'Other'],
    default: 'Annual',
  },
  durationDays: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending',
  },
  urgency: { type: String, enum: ['Normal', 'URGENT'], default: 'Normal' },
  level: { type: String, default: '' },
  workflow: [{
    level: { type: String },
    approver: { type: String },
    status: { type: String, enum: ['APPROVED', 'PENDING', 'REJECTED', ''], default: 'PENDING' },
    date: { type: String },
    note: { type: String },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

leaveSchema.pre('save', async function (next) {
  if (this.isNew && !this.leaveId) {
    const count = await mongoose.model('Leave').countDocuments();
    const year = new Date().getFullYear();
    this.leaveId = `LEV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

leaveSchema.index({ status: 1 });
leaveSchema.index({ type: 1 });
leaveSchema.index({ employeeId: 1 });
leaveSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
