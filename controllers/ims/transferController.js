const Transfer = require('../../models/Transfer');

// @desc    Create transfer
// @route   POST /api/transfers
exports.createTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all transfers
// @route   GET /api/transfers
exports.getAllTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sourceUnit, destinationUnit, dateFrom, dateTo } = req.query;
    const filter = {};

    if (status && status !== 'All') filter.status = status;
    if (sourceUnit && sourceUnit !== 'All') filter.sourceUnit = sourceUnit;
    if (destinationUnit && destinationUnit !== 'All') filter.destinationUnit = destinationUnit;
    if (dateFrom || dateTo) {
      filter.effectiveDate = {};
      if (dateFrom) filter.effectiveDate.$gte = dateFrom;
      if (dateTo) filter.effectiveDate.$lte = dateTo;
    }
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { transferId: { $regex: search, $options: 'i' } },
        { sourceUnit: { $regex: search, $options: 'i' } },
        { destinationUnit: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Transfer.countDocuments(filter);
    const transfers = await Transfer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: transfers,
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

// @desc    Get single transfer
// @route   GET /api/transfers/:id
exports.getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    res.json({ success: true, data: transfer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update transfer
// @route   PUT /api/transfers/:id
exports.updateTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    res.json({ success: true, data: transfer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete transfer
// @route   DELETE /api/transfers/:id
exports.deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findByIdAndDelete(req.params.id);
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    res.json({ success: true, message: 'Transfer removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get transfer KPIs
// @route   GET /api/transfers/stats/kpis
exports.getKPIStats = async (req, res) => {
  try {
    const total = await Transfer.countDocuments();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = await Transfer.countDocuments({ createdAt: { $gte: startOfMonth } });
    const pending = await Transfer.countDocuments({ status: 'Pending' });
    // Inter-unit: transfers where source !== destination (non-empty)
    const all = await Transfer.find({}, 'sourceUnit destinationUnit');
    const interUnit = all.filter(t => t.sourceUnit && t.destinationUnit && t.sourceUnit !== t.destinationUnit).length;
    const interUnitPct = total ? Math.round((interUnit / total) * 100) : 0;

    res.json({
      success: true,
      data: { total, thisMonth, pending, interUnitPct },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get transfer timeline by unit (grouped by destination)
// @route   GET /api/transfers/stats/timeline-by-unit
exports.getTimelineByUnit = async (req, res) => {
  try {
    const pipeline = [
      { $group: { _id: '$destinationUnit', transfers: { $sum: 1 } } },
      { $sort: { transfers: -1 } },
    ];
    const results = await Transfer.aggregate(pipeline);
    const maxVal = results.length > 0 ? Math.max(...results.map(r => r.transfers)) : 1;
    const data = results
      .filter(r => r._id)
      .slice(0, 8)
      .map(r => ({
        unit: r._id,
        transfers: r.transfers,
        pct: Math.round((r.transfers / maxVal) * 100),
      }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get unit-wise incoming vs outgoing
// @route   GET /api/transfers/stats/in-out-summary
exports.getInOutSummary = async (req, res) => {
  try {
    const incomingAgg = await Transfer.aggregate([
      { $group: { _id: '$destinationUnit', incoming: { $sum: 1 } } },
    ]);
    const outgoingAgg = await Transfer.aggregate([
      { $group: { _id: '$sourceUnit', outgoing: { $sum: 1 } } },
    ]);

    const unitSet = new Set();
    incomingAgg.forEach(d => { if (d._id) unitSet.add(d._id); });
    outgoingAgg.forEach(d => { if (d._id) unitSet.add(d._id); });

    const incomingMap = {};
    incomingAgg.forEach(d => { if (d._id) incomingMap[d._id] = d.incoming; });
    const outgoingMap = {};
    outgoingAgg.forEach(d => { if (d._id) outgoingMap[d._id] = d.outgoing; });

    const data = Array.from(unitSet).slice(0, 8).map(unit => ({
      unit,
      incoming: incomingMap[unit] || 0,
      outgoing: outgoingMap[unit] || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get quick history (last 10 transfers)
// @route   GET /api/transfers/stats/quick-history
exports.getQuickHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const transfers = await Transfer.find({})
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const data = transfers.map(t => ({
      _id: t._id,
      id: t.transferId,
      employee: t.employeeName,
      from: t.sourceUnit || '—',
      to: t.destinationUnit || '—',
      status: t.status?.toLowerCase() || 'draft',
      statusLabel: t.status?.toUpperCase() || 'DRAFT',
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Export transfers as CSV
// @route   GET /api/transfers/export
exports.exportTransfers = async (req, res) => {
  try {
    const transfers = await Transfer.find({}).sort({ createdAt: -1 });

    const headers = ['Transfer ID', 'Employee Name', 'Employee ID', 'Source Unit', 'Destination Unit', 'Current Designation', 'Target Designation', 'Effective Date', 'Hard Area Transfer', 'Status'];
    const rows = transfers.map(t => [
      t.transferId || '',
      `"${(t.employeeName || '').replace(/"/g, '""')}"`,
      t.employeeId || '',
      t.sourceUnit || '',
      t.destinationUnit || '',
      t.currentDesignation || '',
      t.targetDesignation || '',
      t.effectiveDate || '',
      t.hardAreaTransfer ? 'Yes' : 'No',
      t.status || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transfers-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
