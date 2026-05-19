const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Item reference
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required']
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    trim: true
  },
  
  // Transaction type
  type: {
    type: String,
    required: true,
    enum: ['IN', 'OUT', 'RETURN'],
    uppercase: true
  },
  
  // Quantity details
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  
  // Financial details
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalValue: {
    type: Number,
    get: function() {
      return this.quantity * this.unitPrice;
    }
  },
  
  // Reference information
  reference: {
    type: String,
    enum: ['purchase_order', 'sales_order', 'return', 'adjustment', 'transfer', 'stock_in', 'stock_out'],
    required: true
  },
  referenceId: {
    type: String,
    trim: true
  },
  
  // Source/Destination
  issuedTo: {
    type: String,
    trim: true
  },
  issuedFrom: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  warehouse: {
    type: String,
    default: 'Main Warehouse'
  },
  
  // Status flags
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
    default: 'PENDING'
  },
  approvalStatus: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'fulfilled', 'denied'],
    default: 'pending_approval'
  },
  fulfillmentRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  denialReason: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  isApproved: {
    type: Boolean,
    default: true
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    trim: true
  },
  
  // Additional info
  batchNumber: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: Date
  }],
  
  // Transaction date
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ itemId: 1, transactionDate: -1 });
transactionSchema.index({ type: 1, transactionDate: -1 });
transactionSchema.index({ referenceId: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ sku: 1 });
transactionSchema.index({ createdAt: -1 });

// Compound indexes for common queries
transactionSchema.index({ type: 1, status: 1, transactionDate: -1 });
transactionSchema.index({ itemId: 1, type: 1, createdAt: -1 });

// Pre-save middleware to validate stock levels for OUT transactions
transactionSchema.pre('save', async function(next) {
  if (this.type === 'OUT' && this.newStock < 0) {
    const error = new Error(`Insufficient stock! Current stock: ${this.previousStock}, Requested: ${this.quantity}`);
    error.status = 400;
    return next(error);
  }
  next();
});

// Pre-save middleware to set default values
transactionSchema.pre('save', function(next) {
  if (!this.userName && this.userId) {
    // User name will be populated from User model if needed
    this.userName = 'System User';
  }
  
  if (!this.referenceId) {
    const prefix = this.type === 'IN' ? 'GRN' : (this.type === 'OUT' ? 'SRN' : 'RTV');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.referenceId = `${prefix}-${dateStr}-${random}`;
  }
  
  next();
});

// Instance method to reverse transaction (for corrections)
transactionSchema.methods.reverse = async function() {
  const reverseType = this.type === 'IN' ? 'OUT' : (this.type === 'OUT' ? 'IN' : 'OUT');
  
  const reversedTransaction = new this.constructor({
    itemId: this.itemId,
    itemName: this.itemName,
    sku: this.sku,
    type: reverseType,
    quantity: this.quantity,
    previousStock: this.newStock,
    newStock: this.previousStock,
    unitPrice: this.unitPrice,
    reference: 'adjustment',
    referenceId: `REV-${this.referenceId}`,
    notes: `Reversal of transaction ${this._id}: ${this.notes || ''}`,
    userId: this.userId,
    userName: this.userName,
    transactionDate: new Date()
  });
  
  return await reversedTransaction.save();
};

// Static method to get stock movement for a date range
transactionSchema.statics.getStockMovement = async function(itemId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        itemId: new mongoose.Types.ObjectId(itemId),
        transactionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        transactions: { $push: '$$ROOT' }
      }
    }
  ]);
};

// Static method to get daily transaction summary
transactionSchema.statics.getDailySummary = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return await this.aggregate([
    {
      $match: {
        transactionDate: { $gte: startOfDay, $lte: endOfDay },
        status: 'POSTED'
      }
    },
    {
      $group: {
        _id: '$type',
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get weekly trend
transactionSchema.statics.getWeeklyTrend = async function(type, weeks = 4) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));
  
  return await this.aggregate([
    {
      $match: {
        type: type,
        transactionDate: { $gte: startDate, $lte: endDate },
        status: 'POSTED'
      }
    },
    {
      $group: {
        _id: {
          week: { $week: '$transactionDate' },
          year: { $year: '$transactionDate' }
        },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);