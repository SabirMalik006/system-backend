const express = require('express');
const router = express.Router();
const stockInController = require('../../controllers/ims/stockInController');
const { protect, checkPermission } = require('../../middleware/auth');

// Sab routes protected hain
router.use(protect);

// ==================== READ ROUTES (ims_stock_in module) ====================
router.get('/transactions',
  checkPermission('ims_stock_in', 'read'),
  stockInController.getStockInTransactions
);

router.get('/transactions/:id',
  checkPermission('ims_stock_in', 'read'),
  stockInController.getStockInTransactionById
);

router.get('/analytics/trend',
  checkPermission('ims_stock_in', 'read'),
  stockInController.getGoodsReceiptTrend
);

router.get('/analytics/category-distribution',
  checkPermission('ims_stock_in', 'read'),
  stockInController.getCategoryDistribution
);

router.get('/analytics/vendor-performance',
  checkPermission('ims_stock_in', 'read'),
  stockInController.getVendorPerformance
);

router.get('/analytics/efficiency-ranking',
  checkPermission('ims_stock_in', 'read'),
  stockInController.getEfficiencyRanking
);

// ==================== CREATE ROUTES (Manager+ only) ====================
router.post('/transactions',
  checkPermission('ims_stock_in', 'create'),
  stockInController.createStockInTransaction
);

router.post('/create-item',
  checkPermission('ims_stock_in', 'create'),
  stockInController.createNewItem
);

// ==================== UPDATE ROUTES (Manager+ only) ====================
router.put('/transactions/:id',
  checkPermission('ims_stock_in', 'update'),
  stockInController.updateStockInTransaction
);

// ==================== DELETE ROUTES (Super Admin only) ====================
router.delete('/transactions/:id',
  checkPermission('ims_stock_in', 'delete'),
  stockInController.deleteStockInTransaction
);

module.exports = router;