const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  createLeave,
  getAllLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
  getKPIStats,
  getChartData,
  getLeaveBalances,
  getApprovalQueue,
  approveLeave,
  rejectLeave,
  exportLeaves,
} = require('../../controllers/ims/leaveController');

router.use(protect);

router.get('/export', checkPermission('hrms_leave', 'read'), exportLeaves);
router.get('/stats/kpis', checkPermission('hrms_leave', 'read'), getKPIStats);
router.get('/stats/charts', checkPermission('hrms_leave', 'read'), getChartData);
router.get('/stats/balances', checkPermission('hrms_leave', 'read'), getLeaveBalances);
router.get('/stats/approval-queue', checkPermission('hrms_leave', 'read'), getApprovalQueue);
router.put('/:id/approve', checkPermission('hrms_leave', 'approve'), approveLeave);
router.put('/:id/reject', checkPermission('hrms_leave', 'approve'), rejectLeave);

router.get('/', checkPermission('hrms_leave', 'read'), getAllLeaves);
router.post('/', checkPermission('hrms_leave', 'create'), createLeave);
router.get('/:id', checkPermission('hrms_leave', 'read'), getLeaveById);
router.put('/:id', checkPermission('hrms_leave', 'update'), updateLeave);
router.delete('/:id', checkPermission('hrms_leave', 'delete'), deleteLeave);

module.exports = router;
