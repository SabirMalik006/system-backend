const PurchaseRequest = require('../../models/PurchaseRequest');
const mongoose = require('mongoose');

const generateRequestId = async () => {
  const count = await PurchaseRequest.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  return `PRQ-${new Date().getFullYear()}-${seq}`;
};

// @desc    Create purchase request
// @route   POST /api/purchase-requests
exports.create = async (req, res) => {
  try {
    const requestId = await generateRequestId();
    const pr = await PurchaseRequest.create({
      requestId,
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: pr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all purchase requests
// @route   GET /api/purchase-requests
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status: filterStatus = '', sort = '-createdAt' } = req.query;
    const query = {};
    if (filterStatus && filterStatus !== 'All') query.status = filterStatus;
    if (search) {
      query.$or = [
        { requestId: { $regex: search, $options: 'i' } },
        { requestingUnit: { $regex: search, $options: 'i' } },
        { requestingUser: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await PurchaseRequest.countDocuments(query);
    const requests = await PurchaseRequest.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('createdBy', 'name email');
    res.json({
      success: true,
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single purchase request
// @route   GET /api/purchase-requests/:id
exports.getById = async (req, res) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id).populate('createdBy', 'name email');
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: pr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update purchase request status
// @route   PUT /api/purchase-requests/:id
exports.update = async (req, res) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.body.status === 'Approved') {
      pr.status = 'Approved';
      pr.approvedBy = req.user.id;
      pr.approvedAt = new Date();
      pr.vendor = req.body.vendor || pr.vendor;
      pr.poNumber = req.body.poNumber || pr.poNumber;
    } else if (req.body.status === 'Rejected') {
      pr.status = 'Rejected';
      pr.rejectedBy = req.user.id;
      pr.rejectedReason = req.body.rejectedReason || '';
    } else if (req.body.status) {
      pr.status = req.body.status;
    }
    if (req.body.items) pr.items = req.body.items;
    if (req.body.requestingUser) pr.requestingUser = req.body.requestingUser;
    if (req.body.reason) pr.reason = req.body.reason;
    if (req.body.remarks) pr.remarks = req.body.remarks;
    if (req.body.priority) pr.priority = req.body.priority;

    await pr.save();
    res.json({ success: true, data: pr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete purchase request
// @route   DELETE /api/purchase-requests/:id
exports.delete = async (req, res) => {
  try {
    const pr = await PurchaseRequest.findByIdAndDelete(req.params.id);
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get KPI stats
// @route   GET /api/purchase-requests/kpis
exports.getKPIs = async (req, res) => {
  try {
    const stats = await PurchaseRequest.getKPIStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get monthly trend
// @route   GET /api/purchase-requests/monthly-trend
exports.getMonthlyTrend = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const trend = await PurchaseRequest.getMonthlyTrend(year);
    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get department stats
// @route   GET /api/purchase-requests/stats/departments
exports.getDepartmentStats = async (req, res) => {
  try {
    const result = await PurchaseRequest.aggregate([
      { $unwind: '$items' },
      { $group: {
        _id: '$items.category',
        requests: { $sum: 1 },
        totalQty: { $sum: '$items.qty' },
        totalValue: { $sum: { $multiply: ['$items.qty', '$items.unitPrice'] } },
      }},
      { $sort: { requests: -1 } },
    ]);
    const departments = result.map(r => ({
      name: r._id,
      requests: r.requests,
      totalValue: r.totalValue,
    }));
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get status distribution
// @route   GET /api/purchase-requests/stats/status-distribution
exports.getStatusDistribution = async (req, res) => {
  try {
    const total = await PurchaseRequest.countDocuments();
    const result = await PurchaseRequest.aggregate([
      { $group: { _id: '$status', value: { $sum: 1 } } },
    ]);
    const statusDist = {
      Approved: 0, Pending: 0, Rejected: 0, Draft: 0, Processing: 0,
    };
    result.forEach(r => { if (r._id in statusDist) statusDist[r._id] = r.value; });
    res.json({ success: true, data: statusDist, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get spend by department (monthly)
// @route   GET /api/purchase-requests/stats/spend
exports.getSpendByDept = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = await PurchaseRequest.aggregate([
      { $match: { createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } } },
      { $unwind: '$items' },
      { $group: {
        _id: { month: { $month: '$createdAt' }, category: '$items.category' },
        total: { $sum: { $multiply: ['$items.qty', '$items.unitPrice'] } },
      }},
    ]);
    const spendByMonth = months.map((month, i) => {
      const row = { month };
      result.filter(r => r._id.month === i + 1).forEach(r => {
        row[r._id.category] = (row[r._id.category] || 0) + r.total;
      });
      return row;
    });
    res.json({ success: true, data: spendByMonth });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get approval rate trend
// @route   GET /api/purchase-requests/stats/approval-rate
exports.getApprovalRateTrend = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = await PurchaseRequest.aggregate([
      { $match: { createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } } },
      { $group: {
        _id: { month: { $month: '$createdAt' }, status: '$status' },
        count: { $sum: 1 },
      }},
    ]);
    const approvalTrend = months.map((month, i) => {
      const row = { month };
      const approved = result.find(r => r._id.month === i + 1 && r._id.status === 'Approved');
      const total = result.filter(r => r._id.month === i + 1).reduce((s, r) => s + r.count, 0);
      row.rate = total > 0 ? Math.round((approved?.count || 0) / total * 100) : 0;
      return row;
    });
    res.json({ success: true, data: approvalTrend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get unit stats
// @route   GET /api/purchase-requests/stats/units
exports.getUnitStats = async (req, res) => {
  try {
    const result = await PurchaseRequest.aggregate([
      { $group: {
        _id: '$requestingUnit',
        value: { $sum: 1 },
        totalValue: { $sum: '$total' },
      }},
      { $sort: { value: -1 } },
    ]);
    const maxVal = Math.max(...result.map(r => r.value), 1);
    const units = result.map(r => ({
      unit: r._id,
      value: r.value,
      pct: Math.round(r.value / maxVal * 100),
    }));
    res.json({ success: true, data: units });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
