const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, authorize, checkPermission } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'inventory_manager', 'hr_manager', 'finance', 'viewer', 'employee'])
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/register', protect, authorize('super_admin', 'admin'), registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/change-password', protect, authController.changePassword);

// Admin only routes
router.get('/users', protect, authorize('super_admin', 'admin'), authController.getUsers);
router.put('/users/:id', protect, authorize('super_admin', 'admin'), authController.updateUser);
router.delete('/users/:id', protect, authorize('super_admin'), authController.deleteUser);

// Permission-based routes example
router.get('/inventory', protect, checkPermission('inventory', 'read'), (req, res) => {
  res.json({ message: 'Inventory data' });
});

module.exports = router;