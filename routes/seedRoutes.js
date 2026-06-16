const express = require('express');
const router = express.Router();
const { seedAttendance, seedLeaves } = require('../controllers/seedController');

router.post('/attendance', seedAttendance);
router.post('/leaves', seedLeaves);

module.exports = router;
