const express = require('express');
const router = express.Router();
const { getLogs, getStats } = require('../../controllers/ims/reportController');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/logs', getLogs);
router.get('/stats', getStats);

module.exports = router;
