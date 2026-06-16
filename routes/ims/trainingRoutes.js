const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  createTraining,
  getAllTrainings,
  getTrainingById,
  updateTraining,
  deleteTraining,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  getKPIStats,
  getMonthlyTrend,
  getCategoryDist,
  getEnrollmentStatus,
  getScoreDist,
  getUpcomingSchedule,
  getTopInstructors,
  getAllParticipants,
  exportTrainings,
  exportParticipants,
} = require('../../controllers/ims/trainingController');

router.use(protect);

router.get('/export', checkPermission('hrm_employees', 'read'), exportTrainings);
router.get('/stats/kpis', checkPermission('hrm_employees', 'read'), getKPIStats);
router.get('/stats/monthly-trend', checkPermission('hrm_employees', 'read'), getMonthlyTrend);
router.get('/stats/category-dist', checkPermission('hrm_employees', 'read'), getCategoryDist);
router.get('/stats/enrollment-status', checkPermission('hrm_employees', 'read'), getEnrollmentStatus);
router.get('/stats/score-dist', checkPermission('hrm_employees', 'read'), getScoreDist);
router.get('/stats/upcoming', checkPermission('hrm_employees', 'read'), getUpcomingSchedule);
router.get('/stats/top-instructors', checkPermission('hrm_employees', 'read'), getTopInstructors);
router.get('/stats/participants/export', checkPermission('hrm_employees', 'read'), exportParticipants);
router.get('/stats/participants', checkPermission('hrm_employees', 'read'), getAllParticipants);

router.get('/', checkPermission('hrm_employees', 'read'), getAllTrainings);
router.post('/', checkPermission('hrm_employees', 'create'), createTraining);
router.get('/:id', checkPermission('hrm_employees', 'read'), getTrainingById);
router.put('/:id', checkPermission('hrm_employees', 'update'), updateTraining);
router.delete('/:id', checkPermission('hrm_employees', 'delete'), deleteTraining);
router.post('/:id/participants', checkPermission('hrm_employees', 'create'), addParticipant);
router.put('/:id/participants/:participantId', checkPermission('hrm_employees', 'update'), updateParticipant);
router.delete('/:id/participants/:participantId', checkPermission('hrm_employees', 'delete'), deleteParticipant);

module.exports = router;
