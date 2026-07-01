const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['super_admin', 'admin', 'dwece', 'charge_head', 'ims_manager', 'ims_viewer', 'hr_manager', 'hr_viewer', 'finance', 'employee', 'cmes', 'ages_ges', 'inventory_manager', 'viewer', 'tradesman']
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  module: {
    type: String,
    enum: ['ims', 'hrms', 'both', 'finance'],
    default: 'ims'
  },
  description: String,
  permissions: [{
    module: {
      type: String,
      required: true
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'manage', 'export', 'approve', 'read_own'],
      required: true
    }]
  }],
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Complete Role Permissions Mapping (IMS + HRMS)
const rolePermissionsMap = {
  // SUPER ADMIN - Full access to everything
  super_admin: {
    level: 1,
    module: 'both',
    description: 'Complete system access - IMS + HRMS + Finance',
    permissions: [
      { module: 'ims_inventory', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'ims_stock_in', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_out', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_return', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_items', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_vendors', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_reports', actions: ['read', 'export'] },
      { module: 'hrm_employees', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'hrms_attendance', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'hrms_leave', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_recruitment', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_training', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrm_performance', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrms_payroll', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'finance', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // DWECE - Full access to everything (same as super admin)
  dwece: {
    level: 1,
    module: 'both',
    description: 'Complete system access - IMS + HRMS + Finance',
    permissions: [
      { module: 'ims_inventory', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'ims_stock_in', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_out', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_return', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_items', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_vendors', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_reports', actions: ['read', 'export'] },
      { module: 'hrm_employees', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'hrms_attendance', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'hrms_leave', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_recruitment', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_training', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrm_performance', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrms_payroll', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'finance', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // CMES - Full access to everything (same as super admin)
  cmes: {
    level: 1,
    module: 'both',
    description: 'Complete system access - IMS + HRMS + Finance',
    permissions: [
      { module: 'ims_inventory', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'ims_stock_in', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_out', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_return', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_items', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_vendors', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_reports', actions: ['read', 'export'] },
      { module: 'hrm_employees', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'hrms_attendance', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'hrms_leave', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_recruitment', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_training', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrm_performance', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrms_payroll', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'finance', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // AGE'S/GE'S - Full access to everything (same as super admin)
  ages_ges: {
    level: 1,
    module: 'both',
    description: 'Complete system access - IMS + HRMS + Finance',
    permissions: [
      { module: 'ims_inventory', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'ims_stock_in', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_out', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_stock_return', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_items', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_vendors', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'ims_reports', actions: ['read', 'export'] },
      { module: 'hrm_employees', actions: ['create', 'read', 'update', 'delete', 'manage', 'export'] },
      { module: 'hrms_attendance', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'hrms_leave', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_recruitment', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'hrm_training', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrm_performance', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrms_payroll', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'finance', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // CHARGE HEAD - Data entry access across all modules (create + read only)
  charge_head: {
    level: 3,
    module: 'both',
    description: 'Data entry access - can create and read across IMS + HRMS but NO update/delete',
    permissions: [
      { module: 'ims_inventory', actions: ['create', 'read'] },
      { module: 'ims_stock_in', actions: ['create', 'read'] },
      { module: 'ims_stock_out', actions: ['create', 'read'] },
      { module: 'ims_stock_return', actions: ['create', 'read'] },
      { module: 'ims_items', actions: ['create', 'read'] },
      { module: 'ims_vendors', actions: ['create', 'read'] },
      { module: 'ims_reports', actions: ['read'] },
      { module: 'hrm_employees', actions: ['create', 'read'] },
      { module: 'hrms_attendance', actions: ['create', 'read'] },
      { module: 'hrms_leave', actions: ['create', 'read', 'approve'] },
      { module: 'hrm_recruitment', actions: ['create', 'read'] },
      { module: 'hrm_training', actions: ['create', 'read'] },
      { module: 'hrm_performance', actions: ['create', 'read'] },
      { module: 'hrms_payroll', actions: ['read'] },
      { module: 'finance', actions: ['create', 'read'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== IMS ROLES ====================
  
  // IMS MANAGER - Full IMS access, can create/edit but NO delete
  ims_manager: {
    level: 2,
    module: 'ims',
    description: 'Complete IMS access - can create, edit but NO delete',
    permissions: [
      { module: 'ims_inventory', actions: ['read'] },
      { module: 'ims_stock_in', actions: ['create', 'read', 'update', 'export'] },
      { module: 'ims_stock_out', actions: ['create', 'read', 'update', 'export'] },
      { module: 'ims_stock_return', actions: ['create', 'read', 'update', 'export'] },
      { module: 'ims_items', actions: ['read', 'update'] },
      { module: 'ims_vendors', actions: ['read', 'update'] },
      { module: 'ims_reports', actions: ['read', 'export'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },
  
  // IMS VIEWER - Read-only IMS
  ims_viewer: {
    level: 3,
    module: 'ims',
    description: 'Read-only access to IMS',
    permissions: [
      { module: 'ims_inventory', actions: ['read'] },
      { module: 'ims_stock_in', actions: ['read'] },
      { module: 'ims_stock_out', actions: ['read'] },
      { module: 'ims_stock_return', actions: ['read'] },
      { module: 'ims_items', actions: ['read'] },
      { module: 'ims_vendors', actions: ['read'] },
      { module: 'ims_reports', actions: ['read'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== HRMS ROLES ====================
  
  // HR MANAGER - Full HRMS access
  hr_manager: {
    level: 2,
    module: 'hrms',
    description: 'Complete HRMS access - can manage employees, attendance, leave',
    permissions: [
      { module: 'hrm_employees', actions: ['create', 'read', 'update', 'export'] },
      { module: 'hrms_attendance', actions: ['create', 'read', 'update', 'export'] },
      { module: 'hrms_leave', actions: ['create', 'read', 'update', 'approve'] },
      { module: 'hrm_recruitment', actions: ['create', 'read', 'update'] },
      { module: 'hrm_training', actions: ['create', 'read', 'update'] },
      { module: 'hrm_performance', actions: ['create', 'read', 'update'] },
      { module: 'hrms_payroll', actions: ['read'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },
  
  // HR VIEWER - Read-only HRMS
  hr_viewer: {
    level: 3,
    module: 'hrms',
    description: 'Read-only access to HRMS',
    permissions: [
      { module: 'hrm_employees', actions: ['read'] },
      { module: 'hrms_attendance', actions: ['read'] },
      { module: 'hrms_leave', actions: ['read'] },
      { module: 'hrm_recruitment', actions: ['read'] },
      { module: 'hrm_training', actions: ['read'] },
      { module: 'hrm_performance', actions: ['read'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== FINANCE ROLE ====================
  
  finance: {
    level: 3,
    module: 'finance',
    description: 'Finance access - can view IMS value and HR payroll',
    permissions: [
      { module: 'ims_inventory', actions: ['read'] },
      { module: 'ims_reports', actions: ['read', 'export'] },
      { module: 'hrms_payroll', actions: ['read', 'update', 'approve'] },
      { module: 'finance', actions: ['create', 'read', 'update', 'export'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== ADMIN ROLE ====================
  
  admin: {
    level: 2,
    module: 'both',
    description: 'Administrative access with user management',
    permissions: [
      { module: 'users', actions: ['create', 'read', 'update'] },
      { module: 'ims_inventory', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrms', actions: ['create', 'read', 'update'] },
      { module: 'ims_reports', actions: ['read', 'create'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== INVENTORY MANAGER ROLE ====================
  
  inventory_manager: {
    level: 3,
    module: 'ims',
    description: 'Complete inventory management',
    permissions: [
      { module: 'ims_inventory', actions: ['create', 'read', 'update'] },
      { module: 'ims_reports', actions: ['read'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== VIEWER ROLE ====================
  
  viewer: {
    level: 5,
    module: 'ims',
    description: 'Read-only access to system',
    permissions: [
      { module: 'ims_inventory', actions: ['read'] },
      { module: 'ims_reports', actions: ['read'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== EMPLOYEE ROLE ====================
  
  employee: {
    level: 4,
    module: 'hrms',
    description: 'Employee self-service - can view own profile, apply leave',
    permissions: [
      { module: 'hrm_employees', actions: ['read_own'] },
      { module: 'hrms_attendance', actions: ['create', 'read_own'] },
      { module: 'hrms_leave', actions: ['create', 'read_own'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  },

  // ==================== TRADESMAN ROLE ====================

  tradesman: {
    level: 4,
    module: 'hrms',
    description: 'Tradesman - can mark, edit and delete attendance, apply for leave',
    permissions: [
      { module: 'hrms_attendance', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrms_leave', actions: ['create', 'read'] },
      { module: 'dashboard', actions: ['read'] }
    ]
  }
};

// Static method to get permissions by role
roleSchema.statics.getPermissionsByRole = function(roleName) {
  return rolePermissionsMap[roleName] || rolePermissionsMap.ims_viewer;
};

// Static method to check if role has permission
roleSchema.statics.hasPermission = function(roleName, module, action) {
  const role = rolePermissionsMap[roleName];
  if (!role) return false;
  
  if (roleName === 'super_admin' || roleName === 'dwece' || roleName === 'cmes' || roleName === 'ages_ges') return true;
  
  // Charge Head cannot update or delete (but can approve leaves)
  if (roleName === 'charge_head' && (action === 'update' || action === 'delete' || action === 'manage')) return false;

  // IMS Manager cannot delete
  if (roleName === 'ims_manager' && action === 'delete') return false;
  
  // IMS Viewer can only read
  if (roleName === 'ims_viewer' && action !== 'read') return false;
  
  // HR Viewer can only read
  if (roleName === 'hr_viewer' && action !== 'read') return false;
  
  
  const modulePerm = role.permissions.find(p => p.module === module);
  if (!modulePerm) return false;
  
  return modulePerm.actions.includes(action);
};

// Static method to get roles by module
roleSchema.statics.getRolesByModule = function(moduleType) {
  const roles = [];
  for (const [name, data] of Object.entries(rolePermissionsMap)) {
    if (data.module === moduleType || data.module === 'both') {
      roles.push({ name, description: data.description, level: data.level });
    }
  }
  return roles.sort((a, b) => a.level - b.level);
};

module.exports = mongoose.model('Role', roleSchema);