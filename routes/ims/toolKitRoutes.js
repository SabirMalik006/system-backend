const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  getAll, getById, create, update, delete: deleteKit,
  getKPIs, getByDepartment, getConditionSummary, getRecentActivity, exportCSV,
} = require('../../controllers/ims/toolKitController');

// Stats & export routes must come before /:id
router.use(protect);
router.use(checkPermission('hrm_employees', 'read'));

router.get('/stats/kpis', getKPIs);
router.get('/stats/by-department', getByDepartment);
router.get('/stats/condition-summary', getConditionSummary);
router.get('/stats/recent-activity', getRecentActivity);
router.get('/export', exportCSV);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', deleteKit);

module.exports = router;
