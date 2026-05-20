const Item = require('../../models/Item');
const Transaction = require('../../models/Transaction');
const Vendor = require('../../models/Vendor');
const mongoose = require('mongoose');

// ==================== ITEM CRUD OPERATIONS ====================

// @desc    Get all items with pagination, search, filters
// @route   GET /api/items
exports.getItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const category = req.query.category || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    const skip = (page - 1) * limit;
    
    let query = {}; // Remove isActive: true so discontinued/inactive items are included
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status !== 'all') {
      if (status === 'instock') {
        query.status = { $in: ['in_stock', 'low_stock'] };
      } else if (status === 'discontinued') {
        query.$or = [{ status: 'discontinued' }, { isActive: false }];
      } else if (status === 'lowstock') {
        query.status = 'low_stock';
      } else if (status === 'critical') {
        query.status = 'critical';
      } else if (status === 'outofstock') {
        query.status = 'out_of_stock';
      }
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    const [items, total] = await Promise.all([
      Item.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('vendorId', 'name rating'),
      Item.countDocuments(query)
    ]);
    
    // Format items for frontend display
    const formattedItems = items.map(item => {
      // Determine status display
      let displayStatus = item.isActive !== false ? 'Active' : 'Inactive';
      let statusColor = item.isActive !== false ? 'text-green-600' : 'text-gray-500';
      
      return {
        id: item._id,
        itemId: `TM-${item.sku || item._id.toString().slice(-6).toUpperCase()}`,
        identifiers: item.sku || `SKU-${item._id.toString().slice(-4)}`,
        barcode: item.barcode || '',
        name: item.name,
        category: item.category,
        unit: item.unit,
        minStock: item.minimumStock,
        currentStock: item.currentStock.toLocaleString(),
        threshold: item.threshold,
        price: `Rs ${item.unitPrice.toFixed(2)}`,
        status: displayStatus,
        statusColor,
        originalStatus: item.status,
        vendorName: item.vendorName || 'N/A',
        isActive: item.isActive !== false
      };
    });
    
    res.json({
      success: true,
      items: formattedItems,
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

// @desc    Get single item by ID
// @route   GET /api/items/:id
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('vendorId', 'name rating performanceScore')
      .populate('alternativeVendors.vendorId', 'name rating');
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new item
// @route   POST /api/items
exports.createItem = async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      unit,
      unitPrice,
      minimumStock,
      threshold,
      currentStock,
      vendorId,
      vendorName,
      description,
      warehouse,
      rackNumber,
      isActive
    } = req.body;
    
    // Check if SKU already exists
    if (sku) {
      const existingItem = await Item.findOne({ sku });
      if (existingItem) {
        return res.status(400).json({ success: false, message: 'SKU already exists' });
      }
    }
    
    // Auto-generate SKU if not provided
    let finalSku = sku;
    if (!finalSku) {
      const prefix = category?.substring(0, 3).toUpperCase() || 'ITM';
      const count = await Item.countDocuments();
      finalSku = `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
    }
    
    // Determine status based on current stock
    let status = 'in_stock';
    if (currentStock <= 0) {
      status = 'out_of_stock';
    } else if (currentStock < threshold) {
      if (currentStock < threshold * 0.3) {
        status = 'critical';
      } else {
        status = 'low_stock';
      }
    }
    
    const newItem = await Item.create({
      name,
      sku: finalSku,
      barcode: barcode || null,
      category: category || 'Tools',
      unit: unit || 'units',
      unitPrice: unitPrice || 0,
      minimumStock: minimumStock || 10,
      threshold: threshold || 100,
      currentStock: currentStock || 0,
      vendorId: vendorId || null,
      vendorName: vendorName || '',
      description: description || '',
      warehouse: warehouse || 'Main Warehouse',
      rackNumber: rackNumber || '',
      status,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      item: newItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
exports.updateItem = async (req, res) => {
  try {
    const {
      name,
      barcode,
      category,
      unit,
      unitPrice,
      minimumStock,
      threshold,
      currentStock,
      vendorId,
      vendorName,
      description,
      warehouse,
      rackNumber,
      isActive
    } = req.body;
    
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    // Update fields
    if (name) item.name = name;
    if (barcode !== undefined) item.barcode = barcode;
    if (category) item.category = category;
    if (unit) item.unit = unit;
    if (unitPrice !== undefined) item.unitPrice = unitPrice;
    if (minimumStock !== undefined) item.minimumStock = minimumStock;
    if (threshold !== undefined) item.threshold = threshold;
    if (currentStock !== undefined) item.currentStock = currentStock;
    if (vendorId !== undefined) item.vendorId = vendorId;
    if (vendorName !== undefined) item.vendorName = vendorName;
    if (description !== undefined) item.description = description;
    if (warehouse) item.warehouse = warehouse;
    if (rackNumber) item.rackNumber = rackNumber;
    if (isActive !== undefined) item.isActive = isActive;
    
    item.updatedBy = req.user.id;
    await item.save();
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      item
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete item (soft delete initially, hard delete if already discontinued)
// @route   DELETE /api/items/:id
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    // If already discontinued, perform hard delete
    if (item.status === 'discontinued' || item.isActive === false) {
      await item.deleteOne();
      return res.json({
        success: true,
        message: 'Item permanently deleted'
      });
    }

    // Soft delete
    item.isActive = false;
    item.status = 'discontinued';
    await item.save();
    
    res.json({
      success: true,
      message: 'Item moved to discontinued'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete items
// @route   DELETE /api/items/bulk
exports.bulkDeleteItems = async (req, res) => {
  try {
    const { itemIds } = req.body;
    
    if (!itemIds || !itemIds.length) {
      return res.status(400).json({ success: false, message: 'No item IDs provided' });
    }
    
    await Item.updateMany(
      { _id: { $in: itemIds } },
      { isActive: false, status: 'discontinued', updatedBy: req.user.id }
    );
    
    res.json({
      success: true,
      message: `${itemIds.length} items deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== STATISTICS APIS ====================

// @desc    Get stats for circular cards
// @route   GET /api/items/stats
exports.getItemsStats = async (req, res) => {
  try {
    // Total categories (unique)
    const categories = await Item.distinct('category', { isActive: true });
    const totalCategories = categories.length;
    
    // Category growth (new categories this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newCategoriesThisMonth = await Item.distinct('category', {
      isActive: true,
      createdAt: { $gte: startOfMonth }
    });
    
    // Low stock items
    const lowStockCount = await Item.countDocuments({
      isActive: true,
      status: { $in: ['low_stock', 'critical'] }
    });
    
    // System health - last sync time
    const lastTransaction = await Transaction.findOne()
      .sort({ createdAt: -1 })
      .limit(1);
    
    let lastSyncText = '4 MINS AGO';
    if (lastTransaction) {
      const minutesAgo = Math.floor((new Date() - lastTransaction.createdAt) / (1000 * 60));
      if (minutesAgo < 60) {
        lastSyncText = `${minutesAgo} MINS AGO`;
      } else if (minutesAgo < 1440) {
        lastSyncText = `${Math.floor(minutesAgo / 60)} HRS AGO`;
      } else {
        lastSyncText = `${Math.floor(minutesAgo / 1440)} DAYS AGO`;
      }
    }
    
    // Get recent transactions count for health status
    const recentTransactions = await Transaction.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    const systemHealthStatus = recentTransactions > 0 ? 'HEALTHY STATUS' : 'STABLE';
    
    res.json({
      success: true,
      stats: {
        categories: {
          label: "TOTAL CATEGORIES",
          value: totalCategories.toString(),
          subtext: "ACTIVE",
          trend: `+${newCategoriesThisMonth.length} THIS MONTH`,
          image: "/Background (4).svg",
          borderColor: "#1A8FA0"
        },
        lowStock: {
          label: "LOW STOCK",
          value: lowStockCount.toString(),
          subtext: "ITEMS",
          trend: "ACTION REQUIRED",
          image: "/Background (3).svg",
          borderColor: "#640404",
          trendColor: "text-red-600"
        },
        systemHealth: {
          label: "SYSTEM HEALTH",
          value: "",
          subtext: "Last Sync",
          trend: lastSyncText,
          status: systemHealthStatus,
          image: "/Background (5).svg",
          borderColor: "#1E4D7B",
          trendColor: "text-[#06B6D4]"
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard summary stats
// @route   GET /api/items/summary
exports.getItemsSummary = async (req, res) => {
  try {
    const summary = await Item.getDashboardStats();
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get categories list
// @route   GET /api/items/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Item.distinct('category', { isActive: true });
    const categoryCounts = await Promise.all(
      categories.map(async (cat) => ({
        name: cat,
        count: await Item.countDocuments({ category: cat, isActive: true })
      }))
    );
    
    res.json({
      success: true,
      categories: categoryCounts.sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== STOCK LEVEL APIS ====================

// @desc    Update stock level (for stock in/out operations)
// @route   PUT /api/items/:id/stock
exports.updateStockLevel = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { quantity, type, reference, notes } = req.body;
    
    const item = await Item.findById(id).session(session);
    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    const previousStock = item.currentStock;
    let newStock = previousStock;
    
    if (type === 'IN') {
      newStock = previousStock + quantity;
    } else if (type === 'OUT') {
      if (previousStock < quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock! Available: ${previousStock}, Requested: ${quantity}`
        });
      }
      newStock = previousStock - quantity;
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }
    
    // Update item stock
    item.currentStock = newStock;
    if (type === 'IN') item.lastStockInDate = new Date();
    if (type === 'OUT') item.lastStockOutDate = new Date();
    await item.save({ session });
    
    // Create transaction record
    const transaction = await Transaction.create([{
      itemId: item._id,
      itemName: item.name,
      sku: item.sku,
      type,
      quantity,
      previousStock,
      newStock,
      unitPrice: item.unitPrice,
      reference: reference || (type === 'IN' ? 'stock_adjustment' : 'manual_issuance'),
      notes: notes || `Stock ${type} adjustment`,
      userId: req.user.id,
      userName: req.user.name,
      transactionDate: new Date()
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      success: true,
      message: `Stock ${type} successful`,
      item: {
        id: item._id,
        name: item.name,
        previousStock,
        newStock,
        change: quantity
      },
      transaction: transaction[0]
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get low stock items for alerts
// @route   GET /api/items/low-stock
exports.getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await Item.find({
      isActive: true,
      currentStock: { $lt: '$threshold' }
    })
    .sort({ currentStock: 1 })
    .limit(10)
    .select('name sku currentStock threshold category status');
    
    res.json({
      success: true,
      items: lowStockItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get critical stock items
// @route   GET /api/items/critical
exports.getCriticalItems = async (req, res) => {
  try {
    const criticalItems = await Item.find({
      isActive: true,
      status: 'critical'
    })
    .sort({ currentStock: 1 })
    .populate('vendorId', 'name rating');
    
    res.json({
      success: true,
      items: criticalItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export items to CSV
// @route   GET /api/items/export
exports.exportItems = async (req, res) => {
  try {
    const items = await Item.find({ isActive: true })
      .select('name sku category currentStock unitPrice threshold status');
    
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Current Stock', 'Unit Price', 'Threshold', 'Status'];
    const rows = items.map(item => [
      item._id,
      item.name,
      item.sku,
      item.category,
      item.currentStock,
      item.unitPrice,
      item.threshold,
      item.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=items-export-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};