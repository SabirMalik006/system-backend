const Incident = require('../../models/Incident');

// @desc    Create incident
// @route   POST /api/incidents
exports.createIncident = async (req, res) => {
  try {
    const incident = await Incident.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all incidents
// @route   GET /api/incidents
exports.getAllIncidents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, severity, incidentType, dateFrom, dateTo } = req.query;
    const filter = {};

    if (status && status !== 'All') filter.status = status;
    if (severity && severity !== 'All') filter.severity = severity;
    if (incidentType && incidentType !== 'All') filter.incidentType = incidentType;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeRole: { $regex: search, $options: 'i' } },
        { incidentId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Incident.countDocuments(filter);
    const incidents = await Incident.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: incidents,
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

// @desc    Get single incident
// @route   GET /api/incidents/:id
exports.getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update incident
// @route   PUT /api/incidents/:id
exports.updateIncident = async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete incident
// @route   DELETE /api/incidents/:id
exports.deleteIncident = async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });
    res.json({ success: true, message: 'Incident removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get incident KPIs
// @route   GET /api/incidents/stats/kpis
exports.getKPIStats = async (req, res) => {
  try {
    const open = await Incident.countDocuments({ status: 'Open' });
    const closed = await Incident.countDocuments({ status: 'Closed' });
    const escalated = await Incident.countDocuments({ status: 'Escalated' });
    const total = await Incident.countDocuments();

    res.json({
      success: true,
      data: { total, open, closed, escalated },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get monthly incident trend
// @route   GET /api/incidents/stats/monthly-trend
exports.getMonthlyTrend = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(label => ({ label, value: 0 }));

    const incidents = await Incident.find({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });

    incidents.forEach(inc => {
      const m = new Date(inc.createdAt).getMonth();
      data[m].value += 1;
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get severity distribution
// @route   GET /api/incidents/stats/severity-dist
exports.getSeverityDist = async (req, res) => {
  try {
    const dist = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    const labels = ['Verbal Warning', 'Written Warning', 'Final Warning', 'Suspension'];
    const result = {};
    labels.forEach(l => { result[l] = 0; });
    dist.forEach(d => { if (result[d._id] !== undefined) result[d._id] = d.count; });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get type distribution
// @route   GET /api/incidents/stats/type-dist
exports.getTypeDist = async (req, res) => {
  try {
    const dist = await Incident.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
    ]);
    const result = {};
    ['Tardiness', 'Misconduct', 'Performance', 'Insubordination', 'Other'].forEach(t => { result[t] = 0; });
    dist.forEach(d => { if (result[d._id] !== undefined) result[d._id] = d.count; });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Export incidents as CSV
// @route   GET /api/incidents/export
exports.exportIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({}).sort({ createdAt: -1 });

    const headers = ['Incident ID', 'Employee Name', 'Employee Role', 'Date', 'Incident Type', 'Severity', 'Description', 'Reporting Authority', 'Status'];
    const rows = incidents.map(inc => [
      inc.incidentId || '',
      `"${(inc.employeeName || '').replace(/"/g, '""')}"`,
      `"${(inc.employeeRole || '').replace(/"/g, '""')}"`,
      inc.date || '',
      inc.incidentType || '',
      inc.severity || '',
      `"${(inc.description || '').replace(/"/g, '""')}"`,
      `"${(inc.reportingAuthority || '').replace(/"/g, '""')}"`,
      inc.status || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=incidents-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
