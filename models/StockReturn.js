const mongoose = require('mongoose');

const stockReturnSchema = new mongoose.Schema({
  // Return identifier
  returnId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Item reference
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  
  // Original transaction reference (which stock out)
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  // Return details
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalValue: {
    type: Number,
    get: function() {
      return this.quantity * this.unitPrice;
    }
  },
  
  // Return reason
  reason: {
    type: String,
    required: true,
    enum: ['DAMAGED', 'EXPIRED', 'EXCESS', 'DEFECTIVE', 'MISUSE', 'PROJECT_END', 'INVENTORY_ROTATION', 'SURPLUS', 'FAULTY', 'OTHER']
  },
  reasonDescription: {
    type: String,
    trim: true
  },
  
  // Return condition
  condition: {
    type: String,
    required: true,
    enum: ['SERVICEABLE', 'REPAIRABLE', 'UNSERVICEABLE', 'CONSUMABLE', 'BRAND_NEW', 'GOOD', 'DAMAGED']
  },
  
  // Return origin
  returningStaff: {
    type: String,
    required: true
  },
  returningStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  originUnit: {
    type: String,
    required: true
  },
  department: {
    type: String,
    trim: true
  },
  
  // Quality check
  qualityChecked: {
    type: Boolean,
    default: false
  },
  qualityCheckedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  qualityCheckedAt: Date,
  qualityNotes: String,
  
  // Restock decision
  restockQuantity: {
    type: Number,
    default: 0
  },
  discardQuantity: {
    type: Number,
    default: 0
  },
  restockedToWarehouse: {
    type: String,
    default: 'Main Warehouse'
  },
  
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'RESTOCKED', 'QUARANTINED', 'REJECTED', 'COMPLETED'],
    default: 'PENDING'
  },
  
  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: Date,
  
  // Processing metrics
  processingHours: {
    type: Number,
    default: 0
  },
  
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes
stockReturnSchema.index({ itemId: 1, createdAt: -1 });
stockReturnSchema.index({ status: 1, createdAt: -1 });
stockReturnSchema.index({ reason: 1, condition: 1 });
stockReturnSchema.index({ returningStaff: 1, originUnit: 1 });

// Pre-save middleware to generate return ID
stockReturnSchema.pre('save', async function(next) {
  if (!this.returnId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.returnId = `IMS-RTN-${year}-${(count + 5092).toString().padStart(4, '0')}`;
  }
  next();
});

// Static method to get KPIs
stockReturnSchema.statics.getKPIs = async function() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const [totalReturns, pendingReturns, itemsRecovered, damagedItems, avgProcessingHours, totalValue] = await Promise.all([
    this.countDocuments({ createdAt: { $gte: startOfMonth } }),
    this.countDocuments({ status: 'PENDING', createdAt: { $gte: startOfMonth } }),
    this.aggregate([
      { $match: { status: 'RESTOCKED', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$restockQuantity' } } }
    ]),
    this.aggregate([
      { $match: { condition: 'DAMAGED', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$discardQuantity' } } }
    ]),
    this.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, avg: { $avg: '$processingHours' } } }
    ]),
    this.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
    ])
  ]);
  
  // Get previous month for comparison
  const prevMonthStart = new Date();
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  prevMonthStart.setDate(1);
  const prevMonthEnd = new Date();
  prevMonthEnd.setDate(0);
  
  const prevMonthReturns = await this.countDocuments({
    createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd }
  });
  
  const changeFromLastMonth = totalReturns - prevMonthReturns;
  
  return {
    totalReturns: {
      value: totalReturns,
      change: changeFromLastMonth,
      trend: changeFromLastMonth >= 0 ? 'up' : 'down'
    },
    totalValue: {
      value: totalValue[0]?.total || 0,
      label: 'Total financial impact'
    },
    pendingPosting: {
      value: pendingReturns,
      label: 'Awaiting confirmation'
    },
    itemsRecovered: {
      value: itemsRecovered[0]?.total || 0,
      label: 'Units back in stock'
    },
    damagedDisposal: {
      value: damagedItems[0]?.total || 0,
      label: 'Flagged for disposal'
    },
    avgProcessingHours: {
      value: Math.round(avgProcessingHours[0]?.avg || 142),
      change: -0.3,
      trend: 'down',
      label: 'hrs faster'
    }
  };
};

// Static method to get monthly trend
stockReturnSchema.statics.getMonthlyTrend = async function(year = 2025) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendData = [];
  
  for (let i = 0; i < months.length; i++) {
    const startDate = new Date(year, i, 1);
    const endDate = new Date(year, i + 1, 0);
    
    const returns = await this.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['RESTOCKED', 'COMPLETED'] }
    });
    
    trendData.push({
      month: months[i],
      returns: returns,
      baseline: 20
    });
  }
  
  return trendData;
};

// Static method to get reason and condition data
stockReturnSchema.statics.getReasonConditionData = async function() {
  const [reasonData, totalCount] = await Promise.all([
    this.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.countDocuments()
  ]);
  
  const reasonColors = {
    'DAMAGED': '#1e40af',
    'EXPIRED': '#3b82f6',
    'EXCESS': '#60a5fa',
    'DEFECTIVE': '#93c5fd',
    'MISUSE': '#bfdbfe',
    'PROJECT_END': '#1e293b',
    'INVENTORY_ROTATION': '#2563eb',
    'SURPLUS': '#1e40af',
    'FAULTY': '#dc2626',
    'OTHER': '#64748b'
  };
  
  const formattedReasonData = reasonData.map(r => ({
    name: r._id.charAt(0) + r._id.slice(1).toLowerCase(),
    value: r.count,
    color: reasonColors[r._id] || '#1e40af'
  }));
  
  // Condition data for stacked bar chart (by month)
  const conditionData = await this.aggregate([
    {
      $group: {
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        Serviceable: { $sum: { $cond: [{ $eq: ['$condition', 'SERVICEABLE'] }, 1, 0] } },
        Repairable: { $sum: { $cond: [{ $eq: ['$condition', 'REPAIRABLE'] }, 1, 0] } },
        Unserviceable: { $sum: { $cond: [{ $eq: ['$condition', 'UNSERVICEABLE'] }, 1, 0] } },
        Consumables: { $sum: { $cond: [{ $eq: ['$condition', 'CONSUMABLE'] }, 1, 0] } }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ]);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedConditionData = conditionData.map((c, i) => ({
    month: months[c._id.month - 1] || months[i],
    Serviceable: c.Serviceable || 0,
    Repairable: c.Repairable || 0,
    Unserviceable: c.Unserviceable || 0,
    Consumables: c.Consumables || 0
  }));
  
  return { reasonData: formattedReasonData, conditionData: formattedConditionData, totalReturns: totalCount };
};

module.exports = mongoose.model('StockReturn', stockReturnSchema);