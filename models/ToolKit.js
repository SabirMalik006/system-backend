const mongoose = require('mongoose');

const toolKitSchema = new mongoose.Schema({
  kitId: { type: String, unique: true },
  employeeName: { type: String, required: true, trim: true },
  employeeId: { type: String, default: '', trim: true },
  department: { type: String, default: '', trim: true },
  assignedDate: { type: String, default: '' },
  lastInspected: { type: String, default: '' },
  nextDue: { type: String, default: '' },
  condition: {
    type: String,
    enum: ['Good', 'Fair', 'Damaged', 'Needs Replacement'],
    default: 'Good',
  },
  status: {
    type: String,
    enum: ['Passed', 'Pending', 'Failed'],
    default: 'Pending',
  },
  inspector: { type: String, default: '' },
  remarks: { type: String, default: '' },
  checklist: [{
    tool: { type: String },
    result: { type: String, enum: ['ok', 'fail', ''] },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

toolKitSchema.pre('save', async function (next) {
  if (this.isNew && !this.kitId) {
    const count = await mongoose.model('ToolKit').countDocuments();
    const year = new Date().getFullYear();
    this.kitId = `TK-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

toolKitSchema.index({ status: 1 });
toolKitSchema.index({ department: 1 });
toolKitSchema.index({ condition: 1 });
toolKitSchema.index({ nextDue: 1 });
toolKitSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ToolKit', toolKitSchema);
