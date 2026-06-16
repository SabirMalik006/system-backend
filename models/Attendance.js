const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  attendanceId: { type: String, unique: true },
  employeeName: { type: String, required: true, trim: true },
  employeeId: { type: String, default: '', trim: true },
  email: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  unit: { type: String, default: '' },
  shift: { type: String, enum: ['Morning', 'General', 'Night', ''], default: '' },
  clockIn: { type: String, default: '' },
  clockOut: { type: String, default: '' },
  workHours: { type: String, default: '' },
  date: { type: String, required: true },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent', 'On Leave', 'Holiday'],
    default: 'Present',
  },
  type: { type: String, enum: ['Full-time', 'Contract', ''], default: '' },
  joinedDate: { type: String, default: '' },
  initials: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

attendanceSchema.pre('save', async function (next) {
  if (this.isNew && !this.attendanceId) {
    const count = await mongoose.model('Attendance').countDocuments();
    const year = new Date().getFullYear();
    this.attendanceId = `ATT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employeeId: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ department: 1 });
attendanceSchema.index({ shift: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
