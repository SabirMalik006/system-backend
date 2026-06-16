const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  createTransfer,
  getAllTransfers,
  getTransferById,
  updateTransfer,
  deleteTransfer,
  getKPIStats,
  getTimelineByUnit,
  getInOutSummary,
  getQuickHistory,
  exportTransfers,
} = require('../../controllers/ims/transferController');

router.use(protect);

router.get('/export', checkPermission('hrm_employees', 'read'), exportTransfers);
router.get('/stats/kpis', checkPermission('hrm_employees', 'read'), getKPIStats);
router.get('/stats/timeline-by-unit', checkPermission('hrm_employees', 'read'), getTimelineByUnit);
router.get('/stats/in-out-summary', checkPermission('hrm_employees', 'read'), getInOutSummary);
router.get('/stats/quick-history', checkPermission('hrm_employees', 'read'), getQuickHistory);

router.get('/', checkPermission('hrm_employees', 'read'), getAllTransfers);
router.post('/', checkPermission('hrm_employees', 'create'), createTransfer);
router.get('/:id', checkPermission('hrm_employees', 'read'), getTransferById);
router.put('/:id', checkPermission('hrm_employees', 'update'), updateTransfer);
router.delete('/:id', checkPermission('hrm_employees', 'delete'), deleteTransfer);

module.exports = router;
