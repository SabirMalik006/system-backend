const express = require('express');
const router = express.Router();
const prController = require('../../controllers/ims/purchaseRequestController');
const { protect, checkPermission } = require('../../middleware/auth');

router.use(protect);

router.get('/kpis', checkPermission('ims_stock_in', 'read'), prController.getKPIs);
router.get('/monthly-trend', checkPermission('ims_stock_in', 'read'), prController.getMonthlyTrend);
router.get('/stats/departments', checkPermission('ims_stock_in', 'read'), prController.getDepartmentStats);
router.get('/stats/status-distribution', checkPermission('ims_stock_in', 'read'), prController.getStatusDistribution);
router.get('/stats/spend', checkPermission('ims_stock_in', 'read'), prController.getSpendByDept);
router.get('/stats/approval-rate', checkPermission('ims_stock_in', 'read'), prController.getApprovalRateTrend);
router.get('/stats/units', checkPermission('ims_stock_in', 'read'), prController.getUnitStats);
router.get('/', checkPermission('ims_stock_in', 'read'), prController.getAll);
router.get('/:id', checkPermission('ims_stock_in', 'read'), prController.getById);
router.post('/', checkPermission('ims_stock_in', 'create'), prController.create);
router.put('/:id', checkPermission('ims_stock_in', 'update'), prController.update);
router.delete('/:id', checkPermission('ims_stock_in', 'delete'), prController.delete);

module.exports = router;
