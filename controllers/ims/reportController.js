const AuditLog = require('../../models/AuditLog');

// @desc    Get all audit logs with pagination and filters
// @route   GET /api/reports/logs
// @access  Private
exports.getLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const query = {};
    
    if (req.query.module) {
      query.module = req.query.module;
    }
    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.user) {
      query.user = req.query.user;
    }
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get log statistics
// @route   GET /api/reports/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const totalLogs = await AuditLog.countDocuments();
    
    // Actions Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const actionsToday = await AuditLog.countDocuments({ createdAt: { $gte: today } });
    
    // Critical Actions (DELETE, REJECT, or FAILED status)
    const criticalActions = await AuditLog.countDocuments({
      $or: [
        { action: 'DELETE' },
        { action: 'REJECT' },
        { status: 'FAILED' }
      ]
    });
    
    // Most Active Module
    const activeModuleAggr = await AuditLog.aggregate([
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const mostActiveModule = activeModuleAggr.length > 0 ? activeModuleAggr[0]._id : 'N/A';
    
    // Most Active User
    const activeUserAggr = await AuditLog.aggregate([
      { $group: { _id: '$userName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const mostActiveUser = activeUserAggr.length > 0 ? activeUserAggr[0]._id : 'N/A';

    res.json({
      success: true,
      data: {
        totalLogs,
        actionsToday,
        criticalActions,
        mostActiveModule,
        mostActiveUser
      }
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
