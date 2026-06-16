const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  createAttendance,
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getKPIStats,
  getMonthlyTrend,
  getTodayStatus,
  getShiftOverview,
  getClockInDistribution,
  getHeatmap,
  getRecentActivity,
  getDeptAttendanceRate,
  getWorkingHoursAnalysis,
  getPendingApprovals,
  exportAttendance,
  bulkCreateAttendance,
} = require('../../controllers/ims/attendanceController');

router.use(protect);

router.get('/export', checkPermission('hrms_attendance', 'read'), exportAttendance);
router.get('/stats/kpis', checkPermission('hrms_attendance', 'read'), getKPIStats);
router.get('/stats/monthly-trend', checkPermission('hrms_attendance', 'read'), getMonthlyTrend);
router.get('/stats/today-status', checkPermission('hrms_attendance', 'read'), getTodayStatus);
router.get('/stats/shift-overview', checkPermission('hrms_attendance', 'read'), getShiftOverview);
router.get('/stats/clock-in-distribution', checkPermission('hrms_attendance', 'read'), getClockInDistribution);
router.get('/stats/heatmap', checkPermission('hrms_attendance', 'read'), getHeatmap);
router.get('/stats/recent-activity', checkPermission('hrms_attendance', 'read'), getRecentActivity);
router.get('/stats/dept-rate', checkPermission('hrms_attendance', 'read'), getDeptAttendanceRate);
router.get('/stats/working-hours', checkPermission('hrms_attendance', 'read'), getWorkingHoursAnalysis);
router.get('/stats/pending-approvals', checkPermission('hrms_attendance', 'read'), getPendingApprovals);
router.post('/bulk', checkPermission('hrms_attendance', 'create'), bulkCreateAttendance);

router.get('/', checkPermission('hrms_attendance', 'read'), getAllAttendance);
router.post('/', checkPermission('hrms_attendance', 'create'), createAttendance);
router.get('/:id', checkPermission('hrms_attendance', 'read'), getAttendanceById);
router.put('/:id', checkPermission('hrms_attendance', 'update'), updateAttendance);
router.delete('/:id', checkPermission('hrms_attendance', 'delete'), deleteAttendance);

module.exports = router;
