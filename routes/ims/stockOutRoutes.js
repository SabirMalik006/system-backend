const express = require('express');
const router = express.Router();
const stockOutController = require('../../controllers/ims/stockOutController');
const { protect, checkPermission } = require('../../middleware/auth');

// All routes are protected
router.use(protect);

// ==================== READ ROUTES (ims_stock_out module) ====================
router.get('/pending-approved', 
  checkPermission('ims_stock_out', 'read'), 
  stockOutController.getPendingVsApproved
);

router.get('/stock-trend', 
  checkPermission('ims_stock_out', 'read'), 
  stockOutController.getStockTrend
);

router.get('/issuance-by-unit', 
  checkPermission('ims_stock_out', 'read'), 
  stockOutController.getIssuanceByUnit
);

router.get('/workflow-status', 
  checkPermission('ims_stock_out', 'read'), 
  stockOutController.getWorkflowStatus
);

router.get('/low-stock-items', 
  checkPermission('ims_stock_out', 'read'), 
  stockOutController.getLowStockItems
);

router.get('/transactions', 
  checkPermission('ims_stock_out', 'read'), 
  stockOutController.getRecentIssuanceHistory
);

router.get('/summary', 
  checkPermission('ims_stock_out', 'read'), 
  stockOutController.getIssuanceSummary
);

// ==================== CREATE ROUTES (Manager+ only) ====================
router.post('/create', 
  checkPermission('ims_stock_out', 'create'), 
  stockOutController.createStockOut
);

// ==================== UPDATE ROUTES (Manager+ only) ====================
router.put('/approve/:id', 
  checkPermission('ims_stock_out', 'update'), 
  stockOutController.approveStockOut
);

router.put('/reject/:id', 
  checkPermission('ims_stock_out', 'update'), 
  stockOutController.rejectStockOut
);

// ==================== DELETE ROUTES (Super Admin only) ====================
// Note: Stock Out records typically shouldn't be deleted, but if needed:
// router.delete('/:id', checkPermission('ims_stock_out', 'delete'), stockOutController.deleteStockOut);

module.exports = router;