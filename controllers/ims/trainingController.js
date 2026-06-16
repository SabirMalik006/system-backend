const Training = require('../../models/Training');

// @desc    Create training program
// @route   POST /api/training
exports.createTraining = async (req, res) => {
  try {
    const training = await Training.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: training });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all training programs
// @route   GET /api/training
exports.getAllTrainings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type, category } = req.query;
    const filter = {};

    if (status && status !== 'All' && status !== 'All Status') filter.status = status;
    if (type && type !== 'All' && type !== 'All Types') filter.type = type;
    if (category && category !== 'All' && category !== 'All Programs') filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } },
        { trainingId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Training.countDocuments(filter);
    const trainings = await Training.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: trainings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single training program
// @route   GET /api/training/:id
exports.getTrainingById = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ success: false, error: 'Training not found' });
    res.json({ success: true, data: training });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update training program
// @route   PUT /api/training/:id
exports.updateTraining = async (req, res) => {
  try {
    const training = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!training) return res.status(404).json({ success: false, error: 'Training not found' });
    res.json({ success: true, data: training });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete training program
// @route   DELETE /api/training/:id
exports.deleteTraining = async (req, res) => {
  try {
    const training = await Training.findByIdAndDelete(req.params.id);
    if (!training) return res.status(404).json({ success: false, error: 'Training not found' });
    res.json({ success: true, message: 'Training removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Add participant to training program
// @route   POST /api/training/:id/participants
exports.addParticipant = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ success: false, error: 'Training not found' });

    training.participants.push(req.body);
    training.enrolled = training.participants.length;
    await training.save();

    res.status(201).json({ success: true, data: training });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update participant
// @route   PUT /api/training/:id/participants/:participantId
exports.updateParticipant = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ success: false, error: 'Training not found' });

    const participant = training.participants.id(req.params.participantId);
    if (!participant) return res.status(404).json({ success: false, error: 'Participant not found' });

    Object.assign(participant, req.body);
    await training.save();

    res.json({ success: true, data: training });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete participant
// @route   DELETE /api/training/:id/participants/:participantId
exports.deleteParticipant = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ success: false, error: 'Training not found' });

    training.participants.pull(req.params.participantId);
    training.enrolled = training.participants.length;
    await training.save();

    res.json({ success: true, data: training });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get training KPI stats
// @route   GET /api/training/stats/kpis
exports.getKPIStats = async (req, res) => {
  try {
    const total = await Training.countDocuments();
    const completed = await Training.countDocuments({ status: 'Completed' });
    const ongoing = await Training.countDocuments({ status: 'Ongoing' });
    const upcoming = await Training.countDocuments({ status: 'Upcoming' });

    const enrolledResult = await Training.aggregate([
      { $group: { _id: null, totalEnrolled: { $sum: '$enrolled' } } },
    ]);
    const totalEnrolled = enrolledResult[0]?.totalEnrolled || 0;

    const completedResult = await Training.aggregate([
      { $group: { _id: null, totalCompleted: { $sum: '$completed' } } },
    ]);
    const totalCompleted = completedResult[0]?.totalCompleted || 0;

    const completedCount = await Training.countDocuments({ status: 'Completed' });
    const completionRate = total > 0 ? ((completedCount / total) * 100).toFixed(1) : 0;

    const avgScoreResult = await Training.aggregate([
      { $match: { avgScore: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$avgScore' } } },
    ]);
    const avgScore = avgScoreResult[0]?.avg?.toFixed(1) || 0;

    const absences = totalEnrolled - totalCompleted;

    const instructorsResult = await Training.distinct('instructor');
    const instructorCount = instructorsResult.filter(Boolean).length;

    res.json({
      success: true,
      data: {
        totalPrograms: total,
        totalEnrolled,
        totalCompleted,
        completionRate: Number(completionRate),
        avgScore: Number(avgScore),
        absences: Math.max(0, absences),
        instructorCount,
        ongoing,
        upcoming,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get monthly training trend
// @route   GET /api/training/stats/monthly-trend
exports.getMonthlyTrend = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(month => ({ month, enrolled: 0, completed: 0, absent: 0 }));

    const trainings = await Training.find({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });

    trainings.forEach(t => {
      const m = new Date(t.createdAt).getMonth();
      data[m].enrolled += t.enrolled || 0;
      data[m].completed += t.completed || 0;
      data[m].absent += (t.enrolled || 0) - (t.completed || 0);
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get category distribution
// @route   GET /api/training/stats/category-dist
exports.getCategoryDist = async (req, res) => {
  try {
    const dist = await Training.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, enrolled: { $sum: '$enrolled' } } },
      { $sort: { enrolled: -1 } },
    ]);

    const maxEnrolled = dist.length > 0 ? Math.max(...dist.map(d => d.enrolled)) : 1;
    const data = dist.map(d => ({
      label: d._id || 'Uncategorized',
      count: d.enrolled,
      pct: Math.round((d.enrolled / maxEnrolled) * 100),
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get enrollment status (completed/enrolled/absent counts)
// @route   GET /api/training/stats/enrollment-status
exports.getEnrollmentStatus = async (req, res) => {
  try {
    const enrolledResult = await Training.aggregate([
      { $group: { _id: null, total: { $sum: '$enrolled' } } },
    ]);
    const completedResult = await Training.aggregate([
      { $group: { _id: null, total: { $sum: '$completed' } } },
    ]);
    const totalEnrolled = enrolledResult[0]?.total || 0;
    const totalCompleted = completedResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        completed: totalCompleted,
        enrolled: totalEnrolled,
        absent: Math.max(0, totalEnrolled - totalCompleted),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get score distribution
// @route   GET /api/training/stats/score-dist
exports.getScoreDist = async (req, res) => {
  try {
    const result = await Training.aggregate([
      { $match: { avgScore: { $ne: null } } },
      {
        $group: {
          _id: null,
          highPass: { $sum: { $cond: [{ $gte: ['$avgScore', 80] }, 1, 0] } },
          pass: { $sum: { $cond: [{ $gte: ['$avgScore', 70] }, { $cond: [{ $lt: ['$avgScore', 80] }, 1, 0] }, 0] } },
          lowPass: { $sum: { $cond: [{ $gte: ['$avgScore', 60] }, { $cond: [{ $lt: ['$avgScore', 70] }, 1, 0] }, 0] } },
          fail: { $sum: { $cond: [{ $lt: ['$avgScore', 60] }, 1, 0] } },
        },
      },
    ]);

    const allAvgs = await Training.find({ avgScore: { $ne: null } }).select('avgScore');
    const scores = allAvgs.map(t => t.avgScore);
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    const max = scores.length > 0 ? Math.max(...scores) : 0;
    const min = scores.length > 0 ? Math.min(...scores) : 0;

    const dist = result[0] || { highPass: 0, pass: 0, lowPass: 0, fail: 0 };

    res.json({
      success: true,
      data: {
        highPass: dist.highPass,
        pass: dist.pass,
        lowPass: dist.lowPass,
        fail: dist.fail,
        avgScore: Number(avg),
        scoreRange: `${Math.floor(min)}-${Math.ceil(max)}`,
        highest: Math.ceil(max),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get upcoming schedule
// @route   GET /api/training/stats/upcoming
exports.getUpcomingSchedule = async (req, res) => {
  try {
    const upcoming = await Training.find({ status: 'Upcoming' })
      .sort({ startDate: 1 })
      .limit(10)
      .select('title startDate');

    res.json({ success: true, data: upcoming });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get top instructors
// @route   GET /api/training/stats/top-instructors
exports.getTopInstructors = async (req, res) => {
  try {
    const instructors = await Training.aggregate([
      { $match: { instructor: { $ne: '' } } },
      {
        $group: {
          _id: '$instructor',
          count: { $sum: 1 },
          avgScore: { $avg: '$avgScore' },
        },
      },
      { $sort: { avgScore: -1 } },
      { $limit: 10 },
    ]);

    const data = instructors.map(inst => ({
      name: inst._id,
      score: inst.avgScore ? `${inst.avgScore.toFixed(0)}%` : '—',
      color: inst.avgScore >= 90 ? 'bg-blue-600' : inst.avgScore >= 80 ? 'bg-blue-500' : inst.avgScore >= 70 ? 'bg-green-500' : 'bg-blue-400',
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all participants (across all programs)
// @route   GET /api/training/stats/participants
exports.getAllParticipants = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const pipeline = [
      { $unwind: '$participants' },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$participants', { program: '$title', trainingId: '$_id' }] } } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { empId: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Training.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: Number(limit) });

    const participants = await Training.aggregate(pipeline);

    res.json({
      success: true,
      data: participants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Export trainings as CSV
// @route   GET /api/training/export
exports.exportTrainings = async (req, res) => {
  try {
    const trainings = await Training.find({}).sort({ createdAt: -1 });

    const headers = ['Training ID', 'Title', 'Category', 'Type', 'Instructor', 'Start Date', 'End Date', 'Duration', 'Enrolled', 'Completed', 'Avg Score', 'Status'];
    const rows = trainings.map(t => [
      t.trainingId || '',
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.category || '',
      t.type || '',
      `"${(t.instructor || '').replace(/"/g, '""')}"`,
      t.startDate || '',
      t.endDate || '',
      t.duration || '',
      t.enrolled ?? 0,
      t.completed ?? 0,
      t.avgScore ?? '',
      t.status || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=training-programs-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Export participants as CSV
// @route   GET /api/training/stats/participants/export
exports.exportParticipants = async (req, res) => {
  try {
    const pipeline = [
      { $unwind: '$participants' },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$participants', { program: '$title', trainingId: '$_id' }] } } },
    ];

    const participants = await Training.aggregate(pipeline);

    const headers = ['Employee Name', 'Emp ID', 'Department', 'Institute', 'Program', 'Start Date', 'End Date', 'Score', 'Result', 'Progress'];
    const rows = participants.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.empId || '',
      p.department || '',
      p.institute || '',
      `"${(p.program || '').replace(/"/g, '""')}"`,
      p.startDate || '',
      p.endDate || '',
      p.score ?? '',
      p.result || '',
      p.progress ?? 0,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=training-participants-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
