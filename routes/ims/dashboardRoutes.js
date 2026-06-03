const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/ims/dashboardController');
const alertController = require('../../controllers/ims/alertController');
const { protect, checkPermission } = require('../../middleware/auth');

router.use(protect);

// Dashboard main routes - using 'dashboard' module
router.get('/inventory-status',
  checkPermission('dashboard', 'read'),
  dashboardController.getInventoryStatus
);

router.get('/depletion',
  checkPermission('dashboard', 'read'),
  dashboardController.getDepletionTimeline
);

router.get('/health',
  checkPermission('dashboard', 'read'),
  dashboardController.getDashboardHealth
);

router.get('/stats',
  checkPermission('dashboard', 'read'),
  dashboardController.getKPIStats
);

router.get('/stock-movement',
  checkPermission('dashboard', 'read'),
  dashboardController.getStockMovementBreakdown
);

router.get('/all',
  checkPermission('dashboard', 'read'),
  dashboardController.getAllDashboardData
);

// Alert routes - using 'dashboard' module
router.get('/alerts',
  checkPermission('dashboard', 'read'),
  alertController.getAlerts
);

router.put('/alerts/:id/dismiss',
  checkPermission('dashboard', 'update'),
  alertController.dismissAlert
);

router.delete('/alerts/clear',
  checkPermission('dashboard', 'update'),
  alertController.clearAllAlerts
);

module.exports = router;