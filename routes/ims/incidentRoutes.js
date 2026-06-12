const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  createIncident,
  getAllIncidents,
  getIncidentById,
  updateIncident,
  deleteIncident,
  getKPIStats,
  getMonthlyTrend,
  getSeverityDist,
  getTypeDist,
} = require('../../controllers/ims/incidentController');

router.use(protect);

router.get('/stats/kpis', checkPermission('hrm_employees', 'read'), getKPIStats);
router.get('/stats/monthly-trend', checkPermission('hrm_employees', 'read'), getMonthlyTrend);
router.get('/stats/severity-dist', checkPermission('hrm_employees', 'read'), getSeverityDist);
router.get('/stats/type-dist', checkPermission('hrm_employees', 'read'), getTypeDist);

router.get('/', checkPermission('hrm_employees', 'read'), getAllIncidents);
router.post('/', checkPermission('hrm_employees', 'create'), createIncident);
router.get('/:id', checkPermission('hrm_employees', 'read'), getIncidentById);
router.put('/:id', checkPermission('hrm_employees', 'update'), updateIncident);
router.delete('/:id', checkPermission('hrm_employees', 'delete'), deleteIncident);

module.exports = router;
