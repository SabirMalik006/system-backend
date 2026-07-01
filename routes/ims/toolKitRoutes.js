const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  getAll, getById, create, update, delete: deleteKit,
  getKPIs, getByDepartment, getConditionSummary, getRecentActivity, exportCSV,
} = require('../../controllers/ims/toolKitController');

// Stats & export routes must come before /:id
router.use(protect);

router.get('/stats/kpis', checkPermission('hrm_employees', 'read'), getKPIs);
router.get('/stats/by-department', checkPermission('hrm_employees', 'read'), getByDepartment);
router.get('/stats/condition-summary', checkPermission('hrm_employees', 'read'), getConditionSummary);
router.get('/stats/recent-activity', checkPermission('hrm_employees', 'read'), getRecentActivity);
router.get('/export', checkPermission('hrm_employees', 'read'), exportCSV);

router.get('/', checkPermission('hrm_employees', 'read'), getAll);
router.get('/:id', checkPermission('hrm_employees', 'read'), getById);
router.post('/', checkPermission('hrm_employees', 'create'), create);
router.put('/:id', checkPermission('hrm_employees', 'update'), update);
router.delete('/:id', checkPermission('hrm_employees', 'delete'), deleteKit);

module.exports = router;
