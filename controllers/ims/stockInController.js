const Transaction = require('../../models/Transaction');
const Item = require('../../models/Item');
const Vendor = require('../../models/Vendor');
const mongoose = require('mongoose');
const { logAudit } = require('../../utils/auditLogger');

// Helper: Generate unique entry ID
function generateEntryId() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `STK-${year}-${random}`;
}

// @desc    Get all stock-in transactions (paginated)
// @route   GET /api/stockin/transactions
exports.getStockInTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || 'All Status';
    const startIndex = (page - 1) * limit;

    let query = { type: 'IN' };
    
    if (status !== 'All Status') {
      // For now, we'll filter by status if we add a status field
      // Currently Transaction model doesn't have status, we'll add later
    }

    const transactions = await Transaction.find(query)
      .sort({ transactionDate: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('itemId', 'name sku')
      .populate('userId', 'name');

    const total = await Transaction.countDocuments(query);

    // Format response to match frontend expectations
    const formattedTransactions = transactions.map(trans => ({
      id: trans.referenceId || generateEntryId(),
      itemName: trans.itemName,
      sku: trans.sku,
      qty: `${trans.quantity} ${trans.unitPrice ? 'pcs' : 'units'}`,
      vendor: trans.issuedTo || 'M/s Unknown Vendor',
      po: trans.referenceId || 'PO-NA',
      batch: `B-${trans.transactionDate.toISOString().slice(0, 10)}`,
      warehouse: trans.department || 'Warehouse A',
      status: trans.status || (trans.notes === 'draft' ? 'DRAFT' : 'POSTED'),
      timestamp: trans.transactionDate.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    res.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single stock-in transaction
// @route   GET /api/stockin/transactions/:id
exports.getStockInTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('itemId', 'name sku currentStock threshold')
      .populate('userId', 'name email');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new stock-in transaction
// @route   POST /api/stockin/transactions
exports.createStockInTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      itemId, 
      quantity, 
      unitPrice, 
      reference, 
      referenceId, 
      issuedTo, 
      department, 
      notes 
    } = req.body;

    // Find the item
    const item = await Item.findById(itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const previousStock = item.currentStock;
    const newStock = previousStock + quantity;

    // Create transaction
    const transaction = await Transaction.create([{
      itemId: item._id,
      itemName: item.name,
      sku: item.sku,
      type: 'IN',
      quantity,
      previousStock,
      newStock,
      unitPrice: unitPrice || item.unitPrice,
      reference: reference || 'purchase_order',
      referenceId: referenceId || `PO-${Date.now()}`,
      issuedTo: issuedTo || item.vendorName,
      department: department || 'Main Store',
      notes: notes || 'Stock In',
      userId: req.user.id,
      userName: req.user.name,
      transactionDate: new Date()
    }], { session });

    // Update item stock
    item.currentStock = newStock;
    await item.save({ session });

    // Update vendor total orders if vendor exists
    if (item.vendorId) {
      await Vendor.findByIdAndUpdate(
        item.vendorId,
        { $inc: { totalOrders: 1, totalSpent: quantity * unitPrice } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Stock In recorded successfully',
      transaction: transaction[0],
      newStock: item.currentStock
    });

    // Log audit
    await logAudit({
      user: req.user,
      action: 'CREATE',
      module: 'Purchases',
      resource: `Stock In ${quantity} for ${item.sku}`,
      status: 'SUCCESS',
      details: { transactionId: transaction[0]._id, quantity }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update stock-in transaction
// @route   PUT /api/stockin/transactions/:id
exports.updateStockInTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Only allow updating certain fields
    const allowedUpdates = ['notes', 'status', 'department'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });

    await logAudit({
      user: req.user,
      action: 'UPDATE',
      module: 'Purchases',
      resource: `Stock In Transaction ${transaction._id}`,
      status: 'SUCCESS',
      details: { transactionId: transaction._id, updates }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete stock-in transaction
// @route   DELETE /api/stockin/transactions/:id
exports.deleteStockInTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findById(req.params.id).session(session);
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Reverse the stock
    const item = await Item.findById(transaction.itemId).session(session);
    if (item) {
      item.currentStock -= transaction.quantity;
      await item.save({ session });
    }

    await Transaction.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Transaction deleted and stock reversed' });

    await logAudit({
      user: req.user,
      action: 'DELETE',
      module: 'Purchases',
      resource: `Stock In Transaction ${req.params.id}`,
      status: 'SUCCESS',
      details: { transactionId: req.params.id, type: 'IN' }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get goods receipt trend (for bar chart)
// @route   GET /api/stockin/analytics/trend
exports.getGoodsReceiptTrend = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trendData = await Transaction.aggregate([
      {
        $match: {
          type: 'IN',
          transactionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$transactionDate' },
          volume: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Map days to MON, TUE, etc.
    const dayMap = {
      1: 'SUN', 2: 'MON', 3: 'TUE', 4: 'WED', 5: 'THU', 6: 'FRI', 7: 'SAT'
    };

    const formattedData = trendData.map(d => ({
      day: dayMap[d._id] || 'MON',
      volume: d.volume
    }));

    res.json({
      success: true,
      data: formattedData,
      trendLine: formattedData.map(d => d.volume)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get category distribution for donut chart
// @route   GET /api/stockin/analytics/category-distribution
exports.getCategoryDistribution = async (req, res) => {
  try {
    const categories = await Item.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$currentStock' }
        }
      }
    ]);

    const totalItems = categories.reduce((sum, c) => sum + c.count, 0);
    
    const distribution = categories.map(cat => ({
      label: cat._id,
      pct: totalItems ? ((cat.count / totalItems) * 100).toFixed(0) : 0,
      count: cat.count
    }));

    // Default colors for categories
    const colorMap = {
      'Tools': '#0EA5E9',
      'Electrical': '#0F63B7',
      'Sanitary': '#3B82F6',
      'Paints': '#2563EB',
      'Consumable': '#06B6D4'
    };

    const result = distribution.map(d => ({
      ...d,
      color: colorMap[d.label] || '#0EA5E9'
    }));

    res.json({
      success: true,
      categories: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get vendor performance (donut + metrics)
// @route   GET /api/stockin/analytics/vendor-performance
exports.getVendorPerformance = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true })
      .select('name rating performanceScore totalOrders');

    const totalVendors = vendors.length;
    const avgPerformance = vendors.reduce((sum, v) => sum + (v.performanceScore || 70), 0) / totalVendors;

    // Calculate composite score
    const compositeScore = (avgPerformance * 0.7 + 70 * 0.3).toFixed(1);

    res.json({
      success: true,
      vendorCount: totalVendors,
      compositeScore: parseFloat(compositeScore),
      improvement: '+4.2%',
      vendors: vendors.map(v => ({
        name: v.name,
        performanceScore: v.performanceScore || 70,
        rating: v.rating || 3
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get efficiency ranking
// @route   GET /api/stockin/analytics/efficiency-ranking
exports.getEfficiencyRanking = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true })
      .sort({ performanceScore: -1 })
      .limit(3)
      .select('name performanceScore');

    const rankings = vendors.map((v, idx) => ({
      rank: idx + 1,
      name: v.name,
      pct: v.performanceScore || 70,
      color: idx === 0 ? '#06B6D4' : (idx === 1 ? '#0F5FB5' : '#06B6D4')
    }));

    res.json({
      success: true,
      rankings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new item (redirect from Create New Item button)
// @route   POST /api/stockin/create-item
exports.createNewItem = async (req, res) => {
  try {
    const { name, sku, category, unitPrice, threshold, vendorName } = req.body;

    const newItem = await Item.create({
      name,
      sku: sku || `SKU-${Date.now()}`,
      category: category || 'Tools',
      currentStock: 0,
      threshold: threshold || 100,
      unitPrice: unitPrice || 0,
      vendorName: vendorName || 'New Vendor',
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'New item created successfully',
      item: newItem
    });

    await logAudit({
      user: req.user,
      action: 'CREATE',
      module: 'Inventory',
      resource: `Item ${newItem.sku || newItem.name}`,
      status: 'SUCCESS',
      details: { itemId: newItem._id, name: newItem.name }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};