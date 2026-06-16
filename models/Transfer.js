const mongoose = require('mongoose');

const CMES_UNITS = [
  'CMES ISB/LHR', 'CMES COMPAK', 'CMES ORMARA',
  'CMES COMLOG', 'CMES COMCOAST', 'CMES COMKAR',
];

const GE_AE_OPTIONS = [
  'GE SOUTH', 'GE EAST', 'GE KARSAZ', 'AGE MANORA',
  'GE FLEET', 'AGE MEHRAN', 'GE TURBAT', 'GE LOGISTIC',
  'GE MARIPUR', 'GE GAWADAR', 'GE EASTERN', 'GE ORMARA',
  'GE ISLAMABAD', 'GE LAHORE',
];

const transferSchema = new mongoose.Schema({
  transferId: { type: String, unique: true },
  employeeName: { type: String, required: true, trim: true },
  employeeId: { type: String, default: '', trim: true },
  sourceUnit: {
    type: String,
    enum: [...CMES_UNITS, 'Headquarters', 'North Regional', 'South Regional', 'West Hub', 'HQ', 'North', 'South', 'East', 'West', 'Central', 'North Branch', 'Overseas', ''],
    default: '',
  },
  destinationUnit: {
    type: String,
    enum: [...CMES_UNITS, 'Headquarters', 'North Regional', 'South Regional', 'West Hub', 'HQ', 'North', 'South', 'East', 'West', 'Central', 'North Branch', 'Overseas', ''],
    default: '',
  },
  currentDesignation: {
    type: String,
    enum: [...GE_AE_OPTIONS, ''],
    default: '',
  },
  targetDesignation: {
    type: String,
    enum: [...GE_AE_OPTIONS, ''],
    default: '',
  },
  effectiveDate: { type: String, default: '' },
  hardAreaTransfer: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'In Approval', 'Executed', 'Success'],
    default: 'Draft',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

transferSchema.pre('save', async function (next) {
  if (this.isNew && !this.transferId) {
    const count = await mongoose.model('Transfer').countDocuments();
    const year = new Date().getFullYear();
    this.transferId = `TRF-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

transferSchema.index({ status: 1 });
transferSchema.index({ sourceUnit: 1 });
transferSchema.index({ destinationUnit: 1 });
transferSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transfer', transferSchema);
