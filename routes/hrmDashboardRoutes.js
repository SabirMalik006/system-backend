const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/hrmDashboardController');

router.use(protect);

router.get('/stats', checkPermission('hrm_employees', 'read'), getDashboardStats);

module.exports = router;
