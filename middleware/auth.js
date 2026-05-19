const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  
  // Get token from cookie or header
  if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Check if password changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ message: 'Password recently changed, please login again' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Not authorized' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized to access this resource` 
      });
    }
    next();
  };
};

// Permission-based authorization (UPDATED for IMS + HRMS)
const checkPermission = (module, action) => {
  return (req, res, next) => {
    // Super admin has all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    // IMS Manager cannot delete
    if (req.user.role === 'ims_manager' && action === 'delete') {
      return res.status(403).json({ 
        message: 'IMS Manager does not have permission to delete records',
        role: req.user.role,
        allowedActions: ['create', 'read', 'update', 'export'],
        requestedAction: action
      });
    }
    
    // IMS Viewer can only read
    if (req.user.role === 'ims_viewer' && action !== 'read') {
      return res.status(403).json({ 
        message: 'IMS Viewer has read-only access',
        role: req.user.role,
        allowedAction: 'read',
        requestedAction: action
      });
    }
    
    // HR Viewer can only read
    if (req.user.role === 'hr_viewer' && action !== 'read') {
      return res.status(403).json({ 
        message: 'HR Viewer has read-only access',
        role: req.user.role,
        allowedAction: 'read',
        requestedAction: action
      });
    }
    
    // Check permission from user's permissions array
    const hasPermission = req.user.permissions?.some(
      perm => perm.module === module && perm.actions.includes(action)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        message: `You don't have permission to ${action} ${module}`,
        role: req.user.role,
        requiredModule: module,
        requiredAction: action
      });
    }
    
    next();
  };
};

// Module access guard (NEW - for IMS/HRMS separation)
const canAccessModule = (moduleName) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    if (!req.user.canAccessModule || !req.user.canAccessModule(moduleName)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You don't have access to ${moduleName} module.`,
        role: req.user.role,
        accessibleModules: req.user.accessibleModules || []
      });
    }
    
    next();
  };
};

// IMS Module guard
const canAccessIMS = canAccessModule('ims');

// HRMS Module guard
const canAccessHRMS = canAccessModule('hrms');

// Finance Module guard
const canAccessFinance = canAccessModule('finance');

module.exports = { 
  protect, 
  authorize, 
  checkPermission,
  canAccessIMS,
  canAccessHRMS,
  canAccessFinance,
  canAccessModule
};