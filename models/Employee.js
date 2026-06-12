const mongoose = require('mongoose');

const serviceHistorySchema = new mongoose.Schema({
  company: { type: String, default: '' },
  designation: { type: String, default: '' },
  fromDate: { type: String, default: '' },
  toDate: { type: String, default: '' },
}, { _id: false });

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'], default: 'Beginner' },
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, default: '', trim: true },
  dateOfBirth: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', ''], default: '' },
  cnic: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '', trim: true },
  emergencyContact: { type: String, default: '' },

  designation: { type: String, default: '' },
  trade: { type: String, default: '' },
  employmentType: { type: String, enum: ['Permanent', 'Contract', 'Temporary'], default: 'Permanent' },
  employmentStatus: { type: String, enum: ['Active', 'On Leave', 'Suspended', 'Terminated', 'Retired'], default: 'Active' },
  unit: { type: String, default: '' },
  geAe: { type: String, default: '' },
  joiningDate: { type: String, default: '' },

  department: { type: String, default: '' },
  skills: [skillSchema],
  serviceHistory: [serviceHistorySchema],
  profilePhoto: { type: String, default: '' },
  systemAccount: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

employeeSchema.pre('save', async function (next) {
  if (this.isNew && !this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments();
    const year = new Date().getFullYear();
    this.employeeId = `EMP-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

employeeSchema.index({ employmentStatus: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ employmentType: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
