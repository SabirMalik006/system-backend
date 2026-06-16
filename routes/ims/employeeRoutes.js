const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../../middleware/auth');
const {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getKPIStats,
  getEmploymentTypeDist,
  getJoiningTrend,
  getDepartmentDist,
  getDeptBreakdown,
  getSkillDist,
  deactivateUserAccount,
  deleteEmployeeWithAccount,
  exportEmployees,
} = require('../../controllers/ims/employeeController');

// All routes require authentication
router.use(protect);

// Stats routes - READ only
router.get('/export', checkPermission('hrm_employees', 'read'), exportEmployees);
router.get('/stats/kpis', checkPermission('hrm_employees', 'read'), getKPIStats);
router.get('/stats/employment-type', checkPermission('hrm_employees', 'read'), getEmploymentTypeDist);
router.get('/stats/joining-trend', checkPermission('hrm_employees', 'read'), getJoiningTrend);
router.get('/stats/department-dist', checkPermission('hrm_employees', 'read'), getDepartmentDist);
router.get('/stats/dept-breakdown', checkPermission('hrm_employees', 'read'), getDeptBreakdown);
router.get('/stats/skill-dist', checkPermission('hrm_employees', 'read'), getSkillDist);

// Account management (before :id routes)
router.put('/:id/deactivate-account', checkPermission('hrm_employees', 'update'), deactivateUserAccount);
router.delete('/:id/with-account', checkPermission('hrm_employees', 'delete'), deleteEmployeeWithAccount);

// CRUD
router.get('/', checkPermission('hrm_employees', 'read'), getAllEmployees);
router.post('/', checkPermission('hrm_employees', 'create'), createEmployee);
router.get('/:id', checkPermission('hrm_employees', 'read'), getEmployeeById);
router.put('/:id', checkPermission('hrm_employees', 'update'), updateEmployee);
router.delete('/:id', checkPermission('hrm_employees', 'delete'), deleteEmployee);

module.exports = router;
