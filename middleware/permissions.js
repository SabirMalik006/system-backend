const User = require('../models/User');

// Check if user can access a specific module
exports.canAccessModule = (moduleName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (req.user.role === 'super_admin' || req.user.role === 'dwece') {
      return next();
    }
    
    if (!req.user.canAccessModule(moduleName)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You don't have access to ${moduleName} module.`,
        yourRole: req.user.role,
        accessibleModules: req.user.accessibleModules
      });
    }
    
    next();
  };
};

// Check specific permission on module
exports.checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      // Super admin / DWECE has all permissions
      if (user.role === 'super_admin' || user.role === 'dwece') {
        return next();
      }
      
      // Role-based restrictions
      if (user.role === 'ims_manager' && action === 'delete') {
        return res.status(403).json({
          success: false,
          message: 'IMS Manager cannot delete records',
          role: user.role,
          allowedActions: ['create', 'read', 'update', 'export'],
          requestedAction: action
        });
      }
      
      if (user.role === 'ims_viewer' && action !== 'read') {
        return res.status(403).json({
          success: false,
          message: 'IMS Viewer has read-only access',
          role: user.role,
          allowedAction: 'read',
          requestedAction: action
        });
      }
      
      if (user.role === 'hr_viewer' && action !== 'read') {
        return res.status(403).json({
          success: false,
          message: 'HR Viewer has read-only access',
          role: user.role,
          allowedAction: 'read',
          requestedAction: action
        });
      }
      
      // Check specific permission
      const hasPermission = user.hasPermission(module, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `No permission to ${action} on ${module}`,
          role: user.role,
          requiredModule: module,
          requiredAction: action
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user can access IMS module
exports.canAccessIMS = canAccessModule('ims');

// Check if user can access HRMS module
exports.canAccessHRMS = canAccessModule('hrms');

// Check if user can access Finance module
exports.canAccessFinance = canAccessModule('finance');