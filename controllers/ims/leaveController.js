const Leave = require('../../models/Leave');
const Employee = require('../../models/Employee');

exports.createLeave = async (req, res) => {
  try {
    const leave = await Leave.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type, startDate, endDate } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (type && type !== 'All Leave Types') filter.type = type;
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = startDate;
      if (endDate) filter.startDate.$lte = endDate;
    }
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: leaves,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' });
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' });
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' });
    res.json({ success: true, message: 'Leave request deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getKPIStats = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const totalRequests = await Leave.countDocuments({ createdAt: { $gte: sixMonthsAgo } });
    const pendingCount = await Leave.countDocuments({ status: 'Pending' });
    const approvedCount = await Leave.countDocuments({ status: 'Approved', createdAt: { $gte: sixMonthsAgo } });
    const rejectedCount = await Leave.countDocuments({ status: 'Rejected', createdAt: { $gte: sixMonthsAgo } });
    const urgentCount = await Leave.countDocuments({ status: 'Pending', urgency: 'URGENT' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const approvedThisMonth = await Leave.countDocuments({ status: 'Approved', createdAt: { $gte: startOfMonth } });
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const approvedLastMonth = await Leave.countDocuments({ status: 'Approved', createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } });
    let trend = null;
    if (approvedLastMonth > 0) {
      const pct = Math.round(((approvedThisMonth - approvedLastMonth) / approvedLastMonth) * 100);
      trend = `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}%`;
    }

    const allApproved = await Leave.find({ status: 'Approved' });
    let avgProcessingTime = 0;
    if (allApproved.length > 0) {
      const totalDays = allApproved.reduce((sum, l) => {
        const created = new Date(l.createdAt);
        const updated = new Date(l.updatedAt);
        return sum + Math.round((updated - created) / (1000 * 60 * 60 * 24) * 10) / 10;
      }, 0);
      avgProcessingTime = totalDays / allApproved.length;
    }

    res.json({
      success: true,
      data: {
        totalRequests,
        pendingCount,
        approvedCount,
        rejectedCount,
        urgentCount,
        trend,
        avgProcessingTime: avgProcessingTime.toFixed(1),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getChartData = async (req, res) => {
  try {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.push({
        label: monthNames[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    }

    const barData = [];
    for (const m of months) {
      const startDate = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
      const endDate = `${m.year}-${String(m.month).padStart(2, '0')}-31`;
      const requested = await Leave.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });
      const approved = await Leave.countDocuments({
        status: 'Approved',
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });
      barData.push({ month: m.label, requested, approved });
    }

    const allLeaves = await Leave.find();
    const totalByType = { 'Annual Leave': 0, 'Sick Leave': 0, 'Casual Leave': 0 };
    allLeaves.forEach(l => {
      const key = l.type === 'Annual' ? 'Annual Leave' : l.type === 'Sick' ? 'Sick Leave' : 'Casual Leave';
      if (totalByType[key] !== undefined) totalByType[key]++;
    });
    const total = Object.values(totalByType).reduce((s, v) => s + v, 0) || 1;
    const pieData = Object.entries(totalByType).map(([name, value]) => ({
      name,
      value: Math.round((value / total) * 100),
      color: name === 'Annual Leave' ? '#1a3a8f' : name === 'Sick Leave' ? '#3b82f6' : '#93c5fd',
    }));

    res.json({ success: true, data: { barData, pieData } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLeaveBalances = async (req, res) => {
  try {
    const employees = await Employee.countDocuments({ employmentStatus: 'Active' });
    const standardBalances = {
      'Annual Leave': { used: 0, total: 20 },
      'Sick Leave': { used: 0, total: 10 },
      'Casual Leave': { used: 0, total: 7 },
    };

    const allApproved = await Leave.find({ status: 'Approved' });
    allApproved.forEach(l => {
      const days = parseFloat(l.durationDays) || 1;
      if (l.type === 'Annual') standardBalances['Annual Leave'].used += days;
      else if (l.type === 'Sick') standardBalances['Sick Leave'].used += days;
      else if (l.type === 'Casual') standardBalances['Casual Leave'].used += days;
    });

    const leaveTypes = Object.entries(standardBalances).map(([label, data]) => {
      const pct = data.total > 0 ? Math.round((data.used / (data.total * employees)) * 100) : 0;
      const noteMap = {
        'Annual Leave': 'Department-average utilization',
        'Sick Leave': 'Seasonal health initiatives',
        'Casual Leave': 'Holidays are fast approaching',
      };
      return {
        label,
        usedPct: pct,
        usedPctLabel: `${pct}% Used`,
        usedPctColor: pct > 70 ? 'text-red-600' : pct > 40 ? 'text-blue-600' : 'text-blue-500',
        used: Math.round(data.used),
        total: data.total * employees,
        barColor: pct > 70 ? 'bg-red-600' : pct > 40 ? 'bg-blue-600' : 'bg-blue-500',
        note: noteMap[label],
      };
    });

    res.json({ success: true, data: leaveTypes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getApprovalQueue = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: 'Pending' }).sort({ createdAt: -1 }).limit(10);
    const queue = leaves.map(l => ({
      name: l.employeeName,
      empId: l.employeeId,
      initials: l.initials || l.employeeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      avatarBg: '#64748b',
      type: l.type,
      durationRange: l.startDate && l.endDate ? `${formatDate(l.startDate)} – ${formatDate(l.endDate)}` : '',
      durationDays: l.durationDays,
      level: l.level || 'L1 (Manager)',
      status: l.status,
      statusStyle: l.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : l.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
      _id: l._id,
    }));
    res.json({ success: true, data: queue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, approver } = req.body;
    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' });

    if (!leave.workflow) leave.workflow = [];
    const existingStep = leave.workflow.find(w => w.level === level);
    if (existingStep) {
      existingStep.status = 'APPROVED';
      existingStep.approver = approver || req.user.name;
      existingStep.date = new Date().toISOString();
    } else {
      leave.workflow.push({
        level,
        approver: approver || req.user.name,
        status: 'APPROVED',
        date: new Date().toISOString(),
      });
    }

    const allApproved = leave.workflow.every(w => w.status === 'APPROVED');
    if (allApproved) leave.status = 'Approved';

    await leave.save();
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, level } = req.body;
    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' });

    if (!leave.workflow) leave.workflow = [];
    leave.workflow.push({
      level: level || 'L1: Supervisor',
      approver: req.user.name,
      status: 'REJECTED',
      date: new Date().toISOString(),
      note: reason || '',
    });
    leave.status = 'Rejected';
    await leave.save();
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.exportLeaves = async (req, res) => {
  try {
    const filter = {};
    const { status, type } = req.query;
    if (status && status !== 'All') filter.status = status;
    if (type && type !== 'All Leave Types') filter.type = type;
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    const headers = 'LeaveID,EmployeeName,EmployeeID,Type,DurationDays,StartDate,EndDate,Reason,Status,Urgency,Level';
    const csv = leaves.map(l =>
      `${l.leaveId},"${l.employeeName}",${l.employeeId},${l.type},${l.durationDays},${l.startDate},${l.endDate},"${(l.reason || '').replace(/"/g, '""')}",${l.status},${l.urgency},${l.level}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leaves.csv');
    res.send(headers + '\n' + csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
