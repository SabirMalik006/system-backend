const express = require('express');
const router = express.Router();
const itemController = require('../../controllers/ims/itemController');
const { protect, checkPermission } = require('../../middleware/auth');

// All routes are protected
router.use(protect);

// ==================== READ ROUTES (ims_items module) ====================
router.get('/',
  checkPermission('ims_items', 'read'),
  itemController.getItems
);

router.get('/stats',
  checkPermission('ims_items', 'read'),
  itemController.getItemsStats
);

router.get('/summary',
  checkPermission('ims_items', 'read'),
  itemController.getItemsSummary
);

router.get('/categories',
  checkPermission('ims_items', 'read'),
  itemController.getCategories
);

router.get('/low-stock',
  checkPermission('ims_items', 'read'),
  itemController.getLowStockItems
);

router.get('/critical',
  checkPermission('ims_items', 'read'),
  itemController.getCriticalItems
);

router.get('/export',
  checkPermission('ims_items', 'read'),
  itemController.exportItems
);

router.get('/barcode/:barcode',
  checkPermission('ims_items', 'read'),
  itemController.getItemByBarcode
);

router.get('/:id',
  checkPermission('ims_items', 'read'),
  itemController.getItemById
);

// ==================== CREATE ROUTES (Manager+ only) ====================
router.post('/',
  checkPermission('ims_items', 'create'),
  itemController.createItem
);

// ==================== UPDATE ROUTES (Manager+ only) ====================
router.put('/:id',
  checkPermission('ims_items', 'update'),
  itemController.updateItem
);

router.put('/:id/stock',
  checkPermission('ims_items', 'update'),
  itemController.updateStockLevel
);

// ==================== DELETE ROUTES (Super Admin only) ====================
router.delete('/:id',
  checkPermission('ims_items', 'delete'),
  itemController.deleteItem
);

router.delete('/bulk',
  checkPermission('ims_items', 'delete'),
  itemController.bulkDeleteItems
);

module.exports = router;