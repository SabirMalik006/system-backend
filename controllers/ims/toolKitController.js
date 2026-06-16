const ToolKit = require('../../models/ToolKit');

// @desc    Get all tool kits with pagination, search, filter
// @route   GET /api/toolkits
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', department = '', condition: cond = '' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { kitId: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (department) query.department = { $regex: department, $options: 'i' };
    if (cond) query.condition = cond;

    const total = await ToolKit.countDocuments(query);
    const kits = await ToolKit.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: kits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single tool kit
// @route   GET /api/toolkits/:id
exports.getById = async (req, res) => {
  try {
    const kit = await ToolKit.findById(req.params.id);
    if (!kit) return res.status(404).json({ success: false, message: 'Tool kit not found' });
    res.json({ success: true, data: kit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create tool kit
// @route   POST /api/toolkits
exports.create = async (req, res) => {
  try {
    const kit = await ToolKit.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: kit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update tool kit
// @route   PUT /api/toolkits/:id
exports.update = async (req, res) => {
  try {
    const kit = await ToolKit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!kit) return res.status(404).json({ success: false, message: 'Tool kit not found' });
    res.json({ success: true, data: kit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete tool kit
// @route   DELETE /api/toolkits/:id
exports.delete = async (req, res) => {
  try {
    const kit = await ToolKit.findByIdAndDelete(req.params.id);
    if (!kit) return res.status(404).json({ success: false, message: 'Tool kit not found' });
    res.json({ success: true, message: 'Tool kit deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get KPI stats
// @route   GET /api/toolkits/stats/kpis
exports.getKPIs = async (req, res) => {
  try {
    const total = await ToolKit.countDocuments();
    const pending = await ToolKit.countDocuments({ status: 'Pending' });
    const passed = await ToolKit.countDocuments({ status: 'Passed' });
    const failed = await ToolKit.countDocuments({ status: 'Failed' });
    const today = new Date().toISOString().split('T')[0];
    const dueToday = await ToolKit.countDocuments({ nextDue: today });

    res.json({
      success: true,
      data: {
        totalAssigned: total,
        pendingInspection: pending,
        passed,
        failed,
        dueToday,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get kits by department
// @route   GET /api/toolkits/stats/by-department
exports.getByDepartment = async (req, res) => {
  try {
    const deptStats = await ToolKit.aggregate([
      { $group: { _id: '$department', kits: { $sum: 1 } } },
      { $sort: { kits: -1 } },
    ]);
    const total = deptStats.reduce((s, d) => s + d.kits, 0) || 1;
    const data = deptStats.map(d => ({
      department: d._id || 'Unassigned',
      kits: d.kits,
      percentage: Math.round((d.kits / total) * 100),
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get condition summary
// @route   GET /api/toolkits/stats/condition-summary
exports.getConditionSummary = async (req, res) => {
  try {
    const conditions = ['Good', 'Fair', 'Damaged', 'Needs Replacement'];
    const colors = ['#15803d', '#eab308', '#dc2626', '#7c3aed'];
    const total = await ToolKit.countDocuments() || 1;
    const data = await Promise.all(conditions.map(async (cond, i) => {
      const count = await ToolKit.countDocuments({ condition: cond });
      return { label: cond, value: count, percentage: Math.round((count / total) * 100), color: colors[i] };
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get recent activity
// @route   GET /api/toolkits/stats/recent-activity
exports.getRecentActivity = async (req, res) => {
  try {
    const recent = await ToolKit.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('kitId employeeName status updatedAt');
    res.json({ success: true, data: recent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export all tool kits as CSV
// @route   GET /api/toolkits/export
exports.exportCSV = async (req, res) => {
  try {
    const kits = await ToolKit.find().sort({ createdAt: -1 });
    const headers = 'Kit ID,Employee Name,Employee ID,Department,Assigned Date,Last Inspected,Next Due,Condition,Status,Inspector,Remarks\n';
    const rows = kits.map(k =>
      `"${k.kitId}","${k.employeeName}","${k.employeeId}","${k.department}","${k.assignedDate}","${k.lastInspected}","${k.nextDue}","${k.condition}","${k.status}","${k.inspector}","${(k.remarks || '').replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=toolkits_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(headers + rows);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
