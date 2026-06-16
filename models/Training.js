const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  empId: { type: String, default: '' },
  department: { type: String, default: '' },
  institute: { type: String, default: '' },
  program: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  score: { type: Number, default: null },
  result: { type: String, default: '' },
  progress: { type: Number, default: 0 },
}, { _id: true });

const trainingSchema = new mongoose.Schema({
  trainingId: { type: String, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  type: {
    type: String,
    enum: ['Workshop', 'On-Site', 'Classroom', ''],
    default: '',
  },
  instructor: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  duration: { type: String, default: '' },
  enrolled: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  avgScore: { type: Number, default: null },
  status: {
    type: String,
    enum: ['Completed', 'Ongoing', 'Upcoming', 'Postponed'],
    default: 'Upcoming',
  },
  participants: [participantSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

trainingSchema.pre('save', async function (next) {
  if (this.isNew && !this.trainingId) {
    const count = await mongoose.model('Training').countDocuments();
    const year = new Date().getFullYear();
    this.trainingId = `TRN-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

trainingSchema.index({ status: 1 });
trainingSchema.index({ category: 1 });
trainingSchema.index({ type: 1 });
trainingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Training', trainingSchema);
