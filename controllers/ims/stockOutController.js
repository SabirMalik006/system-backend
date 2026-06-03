const Transaction = require('../../models/Transaction');
const Item = require('../../models/Item');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { logAudit } = require('../../utils/auditLogger');

// ==================== DASHBOARD APIs ====================

// @desc    Get Pending vs Approved counts
// @route   GET /api/stockout/pending-approved
exports.getPendingVsApproved = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const [approvedCount, pendingCount, totalCount] = await Promise.all([
      Transaction.countDocuments({
        type: 'OUT',
        status: 'APPROVED',
        transactionDate: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Transaction.countDocuments({
        type: 'OUT',
        status: { $in: ['PENDING', 'pending_approval'] },
        transactionDate: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Transaction.countDocuments({
        type: 'OUT',
        transactionDate: { $gte: startOfMonth, $lte: endOfMonth }
      })
    ]);

    const total = approvedCount + pendingCount;
    const approvedPercentage = total > 0 ? ((approvedCount / total) * 100).toFixed(1) : 0;
    const pendingPercentage = total > 0 ? ((pendingCount / total) * 100).toFixed(1) : 0;

    // Calculate month-over-month change
    const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    
    const lastMonthApproved = await Transaction.countDocuments({
      type: 'OUT',
      status: 'APPROVED',
      transactionDate: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const lastMonthPending = await Transaction.countDocuments({
      type: 'OUT',
      status: { $in: ['PENDING', 'pending_approval'] },
      transactionDate: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });

    const approvedChange = lastMonthApproved > 0 
      ? (((approvedCount - lastMonthApproved) / lastMonthApproved) * 100).toFixed(0)
      : 0;
    const pendingChange = lastMonthPending > 0
      ? (((pendingCount - lastMonthPending) / lastMonthPending) * 100).toFixed(0)
      : 0;

    res.json({
      success: true,
      data: {
        approved: {
          count: approvedCount,
          percentage: parseFloat(approvedPercentage),
          change: parseInt(approvedChange)
        },
        pending: {
          count: pendingCount,
          percentage: parseFloat(pendingPercentage),
          change: parseInt(pendingChange)
        },
        total,
        month: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Stock Level vs Issue Trend (Line chart)
// @route   GET /api/stockout/stock-trend
exports.getStockTrend = async (req, res) => {
  try {
    const { days = 10 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all items for stock level calculation
    const items = await Item.find({ isActive: true });
    const totalStock = items.reduce((sum, item) => sum + item.currentStock, 0);

    // Get daily issuance data
    const issuanceData = await Transaction.aggregate([
      {
        $match: {
          type: 'OUT',
          status: 'APPROVED',
          transactionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' },
            day: { $dayOfMonth: '$transactionDate' }
          },
          totalIssued: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Generate dates array and map data
    const dates = [];
    const stockLevels = [];
    const issuedItems = [];
    
    // In a real system, we'd query historical stock levels from a snapshots table
    // For now, we'll calculate it by starting from current stock and going backwards
    let runningStock = totalStock;
    
    // Get all transactions (IN and OUT) for the period to calculate historical stock
    const periodTransactions = await Transaction.find({
      transactionDate: { $gte: startDate, $lte: endDate },
      status: 'APPROVED'
    }).sort({ transactionDate: -1 });

    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Find issuance for this specific day
      const issuance = issuanceData.find(d => 
        d._id.day === date.getDate() && 
        d._id.month === date.getMonth() + 1
      );
      
      const issued = issuance ? issuance.totalIssued : 0;
      
      // Find all transactions on this day to adjust running stock for previous day
      const dayTrans = periodTransactions.filter(t => 
        t.transactionDate.getDate() === date.getDate() && 
        t.transactionDate.getMonth() === date.getMonth()
      );
      
      // Stock level at the end of this day is the current runningStock
      // (Before we subtract today's net change to get yesterday's stock)
      dates.unshift(dateStr);
      stockLevels.unshift(Math.floor(runningStock));
      issuedItems.unshift(issued);

      // Adjust running stock for the previous day's calculation
      dayTrans.forEach(t => {
        if (t.type === 'IN' || t.type === 'RETURN') runningStock -= t.quantity;
        else if (t.type === 'OUT') runningStock += t.quantity;
      });
    }

    // Calculate averages
    const avgStock = Math.floor(stockLevels.reduce((a, b) => a + b, 0) / stockLevels.length);
    const avgIssued = Math.floor(issuedItems.reduce((a, b) => a + b, 0) / issuedItems.length);

    res.json({
      success: true,
      data: dates.map((date, i) => ({
        date,
        stock: stockLevels[i],
        issued: issuedItems[i]
      })),
      averages: {
        avgStock,
        avgIssued,
        stock: avgStock, // for backward compatibility
        issued: avgIssued
      },
      lastUpdated: new Date().toLocaleString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Issuance by Unit/Department
// @route   GET /api/stockout/issuance-by-unit
exports.getIssuanceByUnit = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Define departments
    const departments = ['Tools', 'Consumable', 'Sanitary Items', 'Electrical Items'];
    
    const issuanceByDept = await Transaction.aggregate([
      {
        $match: {
          type: 'OUT',
          status: 'APPROVED',
          transactionDate: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'items',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item'
        }
      },
      {
        $unwind: { path: '$item', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: { $ifNull: ['$department', { $ifNull: ['$item.category', 'Other'] }] },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } }
        }
      }
    ]);

    const totalIssuance = issuanceByDept.reduce((sum, d) => sum + d.totalQuantity, 0);
    
    const formattedData = departments.map(dept => {
      const found = issuanceByDept.find(d => d._id === dept);
      const quantity = found ? found.totalQuantity : 0;
      const percentage = totalIssuance > 0 ? ((quantity / totalIssuance) * 100).toFixed(0) : 0;
      
      let rank = '04';
      let color = '#1e3a5f';
      
      if (dept === 'Tools') { rank = '01'; color = '#0e4d8a'; }
      else if (dept === 'Consumable') { rank = '02'; color = '#2ec4b6'; }
      else if (dept === 'Sanitary Items') { rank = '03'; color = '#1a4fa0'; }
      else if (dept === 'Electrical Items') { rank = '04'; color = '#1e3a5f'; }
      
      return {
        rank,
        label: dept.toUpperCase(),
        percentage: parseInt(percentage),
        color,
        quantity,
        totalIssuance
      };
    });

    // Donut chart segments - Dynamically generated from formattedData
    const donutSegments = formattedData.map(d => ({
      pct: d.percentage / 100,
      color: d.color,
      path: '/items' // Default path
    }));

    // Database load simulation (from system metrics)
    // In a real system, this would come from process.cpuUsage() or similar
    const dbLoad = (Math.random() * 15 + 5).toFixed(1);

    res.json({
      success: true,
      units: formattedData,
      donutSegments,
      dbLoad,
      period: `Last ${days} Days`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Issuance Workflow Status (Bar chart data)
// @route   GET /api/stockout/workflow-status
exports.getWorkflowStatus = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Get data for last 4 quarters or appropriate periods
    const periods = [
      { name: `Q3 ${currentYear-1}`, date: new Date(currentYear-1, 6, 1) },
      { name: `Q4 ${currentYear-1}`, date: new Date(currentYear-1, 9, 1) },
      { name: `Q1 ${currentYear}`, date: new Date(currentYear, 0, 1) },
      { name: `Q2 ${currentYear}`, date: new Date(currentYear, 3, 1) }
    ];

    const result = [];
    let prevTotalIssued = 0;

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const nextPeriod = periods[i + 1];
      
      const startDate = period.date;
      const endDate = nextPeriod ? nextPeriod.date : new Date();
      
      const stats = await Transaction.aggregate([
        {
          $match: {
            type: 'OUT',
            transactionDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$approvalStatus',
            total: { $sum: '$quantity' }
          }
        }
      ]);

      const qtyIssued = stats.find(s => s._id === 'approved')?.total || 
                        stats.find(s => s._id === 'fulfilled')?.total || 0;
      const fulfillment = stats.find(s => s._id === 'approved')?.total || 
                          stats.find(s => s._id === 'fulfilled')?.total || 0;
      const pending = stats.find(s => s._id === 'pending_approval')?.total || 0;
      const denied = stats.find(s => s._id === 'denied')?.total || 0;

      result.push({
        period: period.name,
        qty: qtyIssued,
        fulfillment: fulfillment,
        pending: pending,
        denied: denied
      });
    }

    // Moving average (decrement trend) - Calculate based on historical data if possible
    // For now, keep it calculated as an average of the results
    const avgQty = result.reduce((sum, r) => sum + r.qty, 0) / result.length;
    const movingAvg = result.map(() => Math.round(avgQty));

    res.json({
      success: true,
      data: result.map((d, i) => ({
        ...d,
        movingAvg: movingAvg[i]
      })),
      anticipatedLabel: "Anticipated Projects →"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Low Stock Items for monitoring
// @route   GET /api/stockout/low-stock-items
exports.getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await Item.find({
      isActive: true,
      $expr: { $lt: ["$currentStock", "$threshold"] }
    })
    .sort({ currentStock: 1 })
    .limit(3)
    .select('name currentStock threshold status');

    const formattedItems = lowStockItems.map(item => {
      let status = 'LOW';
      if (item.currentStock < item.threshold * 0.3) {
        status = 'CRITICAL';
      }
      
      let icon = 'Battery';
      if (item.name.toLowerCase().includes('filter')) icon = 'Filter';
      else if (item.name.toLowerCase().includes('helmet')) icon = 'Users';
      
      return {
        name: item.name,
        stock: item.currentStock,
        reorder: item.threshold,
        status: status,
        icon: icon
      };
    });

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error in getLowStockItems:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Recent Issuance History (Paginated)
// @route   GET /api/stockout/transactions
exports.getRecentIssuanceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    
    const skip = (page - 1) * limit;
    
    let query = { type: 'OUT' };
    
    if (search) {
      query.$or = [
        { referenceId: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { itemName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status !== 'all') {
      query.status = status;
    }
    
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      Transaction.countDocuments(query)
    ]);
    
    const formattedTransactions = transactions.map(trans => {
      let statusStyle = 'bg-green-100 text-green-700';
      let displayStatus = 'STOCK UPDATED';
      
      if (trans.status === 'PENDING' || trans.approvalStatus === 'pending_approval') {
        statusStyle = 'bg-yellow-100 text-yellow-700';
        displayStatus = 'PENDING';
      } else if (trans.status === 'REJECTED' || trans.approvalStatus === 'denied') {
        statusStyle = 'bg-red-100 text-red-700';
        displayStatus = 'DENIED';
      } else if (trans.status === 'REVIEWING') {
        statusStyle = 'bg-blue-100 text-blue-600';
        displayStatus = 'REVIEWING';
      }
      
      const date = trans.transactionDate;
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      
      return {
        _mongoId: trans._id,
        id: trans.referenceId || `STK-${date.getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        date: date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: `${formattedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        ampm: ampm,
        item: trans.itemName,
        qty: `${trans.quantity} ${trans.unit === 'units' ? 'Units' : trans.unit || 'Units'}`,
        officer: trans.userName || trans.issuedTo || 'System User',
        dept: trans.department || 'General',
        status: displayStatus,
        statusStyle: statusStyle
      };
    });
    
    res.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        showingFrom: skip + 1,
        showingTo: Math.min(skip + limit, total)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CREATE STOCK OUT (ISSUANCE) ====================

// @desc    Create new stock out issuance
// @route   POST /api/stockout/create
exports.createStockOut = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      itemId,
      quantity,
      issuedTo,
      department,
      reference,
      referenceId,
      notes,
      priority = 'normal'
    } = req.body;
    
    // Validate item
    const item = await Item.findById(itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    // Check stock availability
    if (item.currentStock < quantity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Available: ${item.currentStock}, Requested: ${quantity}`,
        availableStock: item.currentStock
      });
    }
    
    const previousStock = item.currentStock;
    const newStock = previousStock - quantity;
    
    // Determine approval status based on quantity or item settings
    let approvalStatus = 'approved';
    let status = 'APPROVED';
    
    if (item.needsApproval || quantity > 50) {
      approvalStatus = 'pending_approval';
      status = 'PENDING';
    }
    
    // Create transaction
    const transaction = await Transaction.create([{
      itemId: item._id,
      itemName: item.name,
      sku: item.sku,
      type: 'OUT',
      quantity,
      previousStock,
      newStock,
      unitPrice: item.unitPrice,
      reference: reference || 'sales_order',
      referenceId: referenceId || `SRN-${Date.now()}`,
      issuedTo: issuedTo || req.user.name,
      department: department || 'General',
      notes: notes || `Stock issued to ${issuedTo || req.user.name}`,
      userId: req.user.id,
      userName: req.user.name,
      approvalStatus,
      status,
      transactionDate: new Date()
    }], { session });
    
    // Update item stock
    item.currentStock = newStock;
    item.lastStockOutDate = new Date();
    await item.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      success: true,
      message: status === 'PENDING' ? 'Stock out request created and pending approval' : 'Stock issued successfully',
      transaction: transaction[0],
      newStock: item.currentStock,
      needsApproval: status === 'PENDING'
    });

    await logAudit({
      user: req.user,
      action: 'CREATE',
      module: status === 'PENDING' ? 'Approvals' : 'Inventory',
      resource: `Stock Out Request for ${item.sku}`,
      status: 'SUCCESS',
      details: { transactionId: transaction[0]._id, quantity, approvalStatus: status }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve a pending stock out
// @route   PUT /api/stockout/approve/:id
exports.approveStockOut = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const transaction = await Transaction.findById(req.params.id).session(session);
    
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (transaction.type !== 'OUT') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Only OUT transactions can be approved' });
    }
    
    if (transaction.status === 'APPROVED') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Transaction already approved' });
    }
    
    // Update transaction
    transaction.status = 'APPROVED';
    transaction.approvalStatus = 'approved';
    transaction.approvedBy = req.user.id;
    transaction.approvedAt = new Date();
    await transaction.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      success: true,
      message: 'Stock out approved successfully',
      transaction
    });

    await logAudit({
      user: req.user,
      action: 'APPROVE',
      module: 'Approvals',
      resource: `Stock Out Transaction ${transaction._id}`,
      status: 'SUCCESS',
      details: { transactionId: transaction._id }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject a pending stock out
// @route   PUT /api/stockout/reject/:id
exports.rejectStockOut = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id).session(session);
    
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (transaction.status === 'APPROVED') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Already approved transaction cannot be rejected' });
    }
    
    // Restore stock if it was deducted
    if (transaction.approvalStatus !== 'pending_approval') {
      const item = await Item.findById(transaction.itemId).session(session);
      if (item) {
        item.currentStock += transaction.quantity;
        await item.save({ session });
      }
    }
    
    // Update transaction
    transaction.status = 'REJECTED';
    transaction.approvalStatus = 'denied';
    transaction.denialReason = reason || req.body.notes || 'Rejected by approver';
    transaction.approvedBy = req.user.id;
    transaction.approvedAt = new Date();
    await transaction.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      success: true,
      message: 'Stock out rejected and stock restored',
      transaction
    });

    await logAudit({
      user: req.user,
      action: 'REJECT',
      module: 'Approvals',
      resource: `Stock Out Transaction ${transaction._id}`,
      status: 'SUCCESS',
      details: { transactionId: transaction._id, reason }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get issuance summary for dashboard
// @route   GET /api/stockout/summary
exports.getIssuanceSummary = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const [totalIssued, totalValue, uniqueRequesters, topItems] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'OUT', status: 'APPROVED', transactionDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'OUT', status: 'APPROVED', transactionDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
      ]),
      Transaction.distinct('userId', { type: 'OUT', transactionDate: { $gte: startOfMonth } }),
      Transaction.aggregate([
        { $match: { type: 'OUT', status: 'APPROVED', transactionDate: { $gte: startOfMonth } } },
        { $group: { _id: '$itemName', total: { $sum: '$quantity' } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ])
    ]);
    
    res.json({
      success: true,
      summary: {
        totalIssued: totalIssued[0]?.total || 0,
        totalValue: totalValue[0]?.total || 0,
        uniqueRequesters: uniqueRequesters.length,
        topItems: topItems.map(t => ({ name: t._id, quantity: t.total }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};