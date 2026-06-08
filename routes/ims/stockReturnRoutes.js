const express = require('express');
const router = express.Router();
const stockReturnController = require('../../controllers/ims/stockReturnController');
const { protect, checkPermission } = require('../../middleware/auth');

// All routes are protected
router.use(protect);

// ==================== READ ROUTES (ims_stock_return module) ====================
router.get('/kpis', 
  checkPermission('ims_stock_return', 'read'), 
  stockReturnController.getKPIs
);

router.get('/monthly-trend', 
  checkPermission('ims_stock_return', 'read'), 
  stockReturnController.getMonthlyTrend
);

router.get('/reason-condition', 
  checkPermission('ims_stock_return', 'read'), 
  stockReturnController.getReasonCondition
);

router.get('/volume-radar', 
  checkPermission('ims_stock_return', 'read'), 
  stockReturnController.getVolumeRadar
);

router.get('/transactions', 
  checkPermission('ims_stock_return', 'read'), 
  stockReturnController.getReturnsTransactions
);

router.get('/summary', 
  checkPermission('ims_stock_return', 'read'), 
  stockReturnController.getReturnSummary
);

router.get('/export', 
  checkPermission('ims_stock_return', 'read'), 
  stockReturnController.exportReturns
);

// ==================== CREATE ROUTES (Manager+ only) ====================
router.post('/create', 
  checkPermission('ims_stock_return', 'create'), 
  stockReturnController.createStockReturn
);

// ==================== UPDATE ROUTES (Manager+ only) ====================
router.put('/:id', 
  checkPermission('ims_stock_return', 'update'), 
  stockReturnController.updateReturnStatus
);

// ==================== SINGLE RETURN ROUTE ====================
router.get('/:id',
  checkPermission('ims_stock_return', 'read'),
  stockReturnController.getReturnById
);

// ==================== DELETE ROUTES (Super Admin only) ====================
router.delete('/:id',
  checkPermission('ims_stock_return', 'delete'),
  stockReturnController.deleteReturn
);

module.exports = router;