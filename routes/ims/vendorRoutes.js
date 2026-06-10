const express = require('express');
const router = express.Router();
const vendorController = require('../../controllers/ims/vendorController');
const { protect, checkPermission } = require('../../middleware/auth');

// All routes are protected
router.use(protect);

// ==================== READ ROUTES ====================
router.get('/',
  checkPermission('ims_items', 'read'), // Assuming vendors are part of IMS read permissions
  vendorController.getVendors
);

router.get('/top',
  checkPermission('ims_items', 'read'),
  vendorController.getTopVendors
);

router.get('/stats/performance',
  checkPermission('ims_items', 'read'),
  vendorController.getPerformanceStats
);

router.get('/:id',
  checkPermission('ims_items', 'read'),
  vendorController.getVendorById
);

// ==================== CREATE ROUTES ====================
router.post('/',
  checkPermission('ims_items', 'create'),
  vendorController.createVendor
);

// ==================== UPDATE ROUTES ====================
router.put('/:id',
  checkPermission('ims_items', 'update'),
  vendorController.updateVendor
);

// ==================== DELETE ROUTES ====================
router.delete('/:id',
  checkPermission('ims_items', 'delete'),
  vendorController.deleteVendor
);

module.exports = router;
