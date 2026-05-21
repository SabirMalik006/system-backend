const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    index: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true
  },
  
  // Categorization
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Tools', 'Electrical', 'Sanitary', 'Paints', 'Consumable', 'Safety', 'Hardware', 'Raw Material', 'Plumbing', 'Bathroom', 'Lighting'],
    default: 'Tools',
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  
  // Stock Information
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minimumStock: {
    type: Number,
    default: 10,
    min: 0
  },
  maximumStock: {
    type: Number,
    default: 1000,
    min: 0
  },
  threshold: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  reorderPoint: {
    type: Number,
    default: function() {
      return this.threshold;
    }
  },
  reorderQuantity: {
    type: Number,
    default: 100
  },
  
  // Unit & Pricing
  unit: {
    type: String,
    default: 'units',
    enum: ['units', 'pcs', 'kg', 'liters', 'meters', 'boxes', 'packs', 'rolls', 'sets', 'Piece', 'Set', 'Box', 'Meter']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  costPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  sellingPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  mrp: {
    type: Number,
    min: 0
  },
  
  // Tax Information
  gstRate: {
    type: Number,
    min: 0,
    max: 28,
    default: 18
  },
  hsnCode: {
    type: String,
    trim: true
  },
  
  // Vendor Information
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    index: true
  },
  vendorName: {
    type: String,
    trim: true
  },
  alternativeVendors: [{
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    vendorName: String,
    unitPrice: Number,
    leadTime: Number
  }],
  
  // Warehouse & Location
  warehouse: {
    type: String,
    default: 'Main Warehouse',
    trim: true
  },
  rackNumber: {
    type: String,
    trim: true
  },
  shelfNumber: {
    type: String,
    trim: true
  },
  binNumber: {
    type: String,
    trim: true
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'critical', 'out_of_stock', 'discontinued'],
    default: 'in_stock'
  },
  
  // Expiry & Batch
  isExpirable: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String,
    trim: true
  },
  manufacturingDate: {
    type: Date
  },
  
  // Physical Attributes
  weight: {
    type: Number,
    min: 0
  },
  weightUnit: {
    type: String,
    enum: ['kg', 'g', 'lb', 'oz'],
    default: 'kg'
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'inch', 'm'],
      default: 'cm'
    }
  },
  
  // Images & Documents
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['datasheet', 'manual', 'certificate', 'other']
    }
  }],
  
  // Description
  description: {
    type: String,
    trim: true
  },
  specifications: {
    type: Map,
    of: String
  },
  
  // Activity Tracking
  lastStockInDate: {
    type: Date
  },
  lastStockOutDate: {
    type: Date
  },
  lastCountDate: {
    type: Date
  },
  
  // Stock Value (Virtual)
  stockValue: {
    type: Number,
    get: function() {
      return this.currentStock * this.unitPrice;
    }
  },
  
  // Flags
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isHazardous: {
    type: Boolean,
    default: false
  },
  isPerishable: {
    type: Boolean,
    default: false
  },
  needsApproval: {
    type: Boolean,
    default: false
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { getters: true, virtuals: true },
  toObject: { getters: true, virtuals: true }
});

// ==================== INDEXES ====================
itemSchema.index({ name: 'text', sku: 'text', description: 'text' });
itemSchema.index({ category: 1, status: 1 });
itemSchema.index({ currentStock: 1, threshold: 1 });
itemSchema.index({ createdAt: -1 });

// Compound indexes for common queries
itemSchema.index({ category: 1, status: 1, isActive: 1 });
itemSchema.index({ vendorId: 1, status: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
itemSchema.pre('save', function(next) {
  // Auto-generate SKU if not provided
  if (!this.sku && this.name) {
    const prefix = this.category.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.sku = `${prefix}-${random}`;
  }

  // Auto-generate Barcode if not provided
  if (!this.barcode) {
    const timestampPart = Date.now().toString().slice(-8);
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.barcode = timestampPart + randomPart;
  }
  
  // Update status based on currentStock and isActive
  if (!this.isActive) {
    this.status = 'discontinued';
  } else if (this.currentStock <= 0) {
    this.status = 'out_of_stock';
  } else if (this.currentStock < this.threshold) {
    if (this.currentStock < this.threshold * 0.3) {
      this.status = 'critical';
    } else {
      this.status = 'low_stock';
    }
  } else {
    this.status = 'in_stock';
  }
  
  // Set reorder point if not set
  if (!this.reorderPoint) {
    this.reorderPoint = this.threshold;
  }
  
  next();
});

// ==================== INSTANCE METHODS ====================

// Check if item is low stock
itemSchema.methods.isLowStock = function() {
  return this.currentStock < this.threshold;
};

// Check if item is critical
itemSchema.methods.isCritical = function() {
  return this.currentStock < this.threshold * 0.3;
};

// Check if item needs reordering
itemSchema.methods.needsReorder = function() {
  return this.currentStock <= this.reorderPoint;
};

// Update stock (used by transactions)
itemSchema.methods.updateStock = async function(quantity, type, userId) {
  const previousStock = this.currentStock;
  
  if (type === 'IN') {
    this.currentStock += quantity;
    this.lastStockInDate = new Date();
  } else if (type === 'OUT') {
    if (this.currentStock < quantity) {
      throw new Error(`Insufficient stock! Available: ${this.currentStock}, Requested: ${quantity}`);
    }
    this.currentStock -= quantity;
    this.lastStockOutDate = new Date();
  } else if (type === 'RETURN') {
    this.currentStock += quantity;
  }
  
  this.updatedBy = userId;
  await this.save();
  
  return {
    previousStock,
    newStock: this.currentStock,
    changed: previousStock !== this.currentStock
  };
};

// Calculate stock turnover rate (requires sales data)
itemSchema.methods.calculateTurnoverRate = async function(days = 30) {
  const Transaction = mongoose.model('Transaction');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        itemId: this._id,
        type: 'OUT',
        transactionDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalOut: { $sum: '$quantity' }
      }
    }
  ]);
  
  const totalOut = result.length > 0 ? result[0].totalOut : 0;
  const averageStock = (this.minimumStock + this.maximumStock) / 2 || this.currentStock;
  
  return averageStock > 0 ? totalOut / averageStock : 0;
};

// Get stock history
itemSchema.methods.getStockHistory = async function(days = 30) {
  const Transaction = mongoose.model('Transaction');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await Transaction.find({
    itemId: this._id,
    transactionDate: { $gte: startDate }
  }).sort({ transactionDate: -1 });
};

// ==================== STATIC METHODS ====================

// Get all low stock items
itemSchema.statics.getLowStockItems = async function(includeCritical = true) {
  const query = {
    isActive: true,
    currentStock: { $lt: '$threshold' }
  };
  
  if (!includeCritical) {
    query.currentStock = { $gte: { $multiply: ['$threshold', 0.3] }, $lt: '$threshold' };
  }
  
  return await this.find(query).populate('vendorId', 'name rating');
};

// Get critical stock items (below 30% of threshold)
itemSchema.statics.getCriticalItems = async function() {
  return await this.find({
    isActive: true,
    currentStock: { $lt: { $multiply: ['$threshold', 0.3] } }
  }).populate('vendorId', 'name rating');
};

// Get stock summary by category
itemSchema.statics.getStockSummaryByCategory = async function() {
  return await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalStock: { $sum: '$currentStock' },
        totalValue: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } },
        lowStockCount: {
          $sum: {
            $cond: [{ $lt: ['$currentStock', '$threshold'] }, 1, 0]
          }
        },
        outOfStockCount: {
          $sum: {
            $cond: [{ $eq: ['$currentStock', 0] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        inStockPercentage: {
          $multiply: [
            { $divide: [{ $subtract: ['$totalItems', '$lowStockCount'] }, '$totalItems'] },
            100
          ]
        }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);
};

// Search items
itemSchema.statics.searchItems = async function(searchTerm, category = null) {
  const query = {
    isActive: true,
    $text: { $search: searchTerm }
  };
  
  if (category) {
    query.category = category;
  }
  
  return await this.find(query, {
    score: { $meta: 'textScore' }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(50)
  .populate('vendorId', 'name rating');
};

// Get dashboard stats
itemSchema.statics.getDashboardStats = async function() {
  const [
    totalItems,
    totalStockValue,
    lowStockCount,
    criticalCount,
    outOfStockCount,
    categorySummary
  ] = await Promise.all([
    this.countDocuments({ isActive: true }),
    this.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } } } }
    ]),
    this.countDocuments({ isActive: true, currentStock: { $lt: '$threshold' } }),
    this.countDocuments({ isActive: true, currentStock: { $lt: { $multiply: ['$threshold', 0.3] } } }),
    this.countDocuments({ isActive: true, currentStock: 0 }),
    this.getStockSummaryByCategory()
  ]);
  
  return {
    totalItems,
    totalStockValue: totalStockValue[0]?.total || 0,
    lowStockCount,
    criticalCount,
    outOfStockCount,
    healthyStockCount: totalItems - lowStockCount,
    categorySummary
  };
};

// Get items that need reordering
itemSchema.statics.getReorderItems = async function() {
  return await this.find({
    isActive: true,
    currentStock: { $lte: '$reorderPoint' }
  })
  .populate('vendorId', 'name leadTime rating')
  .sort({ currentStock: 1 });
};

// ==================== VIRTUAL FIELDS ====================

// Stock status text
itemSchema.virtual('stockStatusText').get(function() {
  const statusMap = {
    'in_stock': 'In Stock',
    'low_stock': 'Low Stock',
    'critical': 'Critical',
    'out_of_stock': 'Out of Stock',
    'discontinued': 'Discontinued'
  };
  return statusMap[this.status] || 'Unknown';
});

// Stock percentage (current / max)
itemSchema.virtual('stockPercentage').get(function() {
  if (this.maximumStock === 0) return 100;
  return Math.min(100, (this.currentStock / this.maximumStock) * 100);
});

// Days until out of stock (based on average daily usage)
itemSchema.virtual('daysUntilOutOfStock').get(async function() {
  const Transaction = mongoose.model('Transaction');
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        itemId: this._id,
        type: 'OUT',
        transactionDate: { $gte: last30Days }
      }
    },
    {
      $group: {
        _id: null,
        avgDailyOut: { $avg: '$quantity' }
      }
    }
  ]);
  
  const avgDailyOut = result.length > 0 ? result[0].avgDailyOut : 1;
  return Math.floor(this.currentStock / avgDailyOut);
});

module.exports = mongoose.model('Item', itemSchema);
