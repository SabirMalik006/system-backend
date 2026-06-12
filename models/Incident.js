const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, unique: true },
  employeeName: { type: String, required: true, trim: true },
  employeeRole: { type: String, default: '', trim: true },
  date: { type: String, required: true },
  incidentType: {
    type: String,
    enum: ['Tardiness', 'Misconduct', 'Performance', 'Insubordination', 'Other'],
    default: 'Tardiness',
  },
  severity: {
    type: String,
    enum: ['Verbal Warning', 'Written Warning', 'Final Warning', 'Suspension'],
    default: 'Verbal Warning',
  },
  description: { type: String, default: '' },
  reportingAuthority: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Open', 'Closed', 'Escalated'],
    default: 'Open',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

incidentSchema.pre('save', async function (next) {
  if (this.isNew && !this.incidentId) {
    const count = await mongoose.model('Incident').countDocuments();
    const year = new Date().getFullYear();
    this.incidentId = `INC-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

incidentSchema.index({ status: 1 });
incidentSchema.index({ incidentType: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
