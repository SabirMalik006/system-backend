const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    // UPDATE THIS ENUM - New roles for IMS + HRMS
    enum: ['super_admin', 'ims_manager', 'ims_viewer', 'hr_manager', 'hr_viewer', 'finance', 'employee'],
    default: 'employee'
  },
  // Which modules this user can access
  accessibleModules: [{
    type: String,
    enum: ['ims', 'hrms', 'finance', 'dashboard']
  }],
  permissions: [{
    module: String,
    actions: [String]
  }],
  // Employee specific fields (for HRMS)
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  department: {
    type: String,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  joinDate: Date,
  phone: String,
  profileImage: String,
  
  // Common fields
  isActive: {
    type: Boolean,
    default: true
  },
  refreshToken: String,
  lastLogin: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Pre-save: Set accessible modules and permissions based on role
userSchema.pre('save', async function(next) {
  if (this.isModified('role')) {
    const Role = require('./Role');
    const roleData = Role.getPermissionsByRole(this.role);
    
    // Set accessible modules
    if (this.role === 'super_admin') {
      this.accessibleModules = ['ims', 'hrms', 'finance', 'dashboard'];
    } else if (this.role.startsWith('ims_')) {
      this.accessibleModules = ['ims', 'dashboard'];
    } else if (this.role.startsWith('hr_')) {
      this.accessibleModules = ['hrms', 'dashboard'];
    } else if (this.role === 'finance') {
      this.accessibleModules = ['finance', 'dashboard'];
    } else if (this.role === 'employee') {
      this.accessibleModules = ['hrms', 'dashboard'];
    } else {
      this.accessibleModules = ['dashboard'];
    }
    
    // Set permissions
    this.permissions = roleData.permissions || [];
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password changed after JWT issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime()  / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Check if user can access a module
userSchema.methods.canAccessModule = function(moduleName) {
  return this.accessibleModules.includes(moduleName);
};

// Check permission
userSchema.methods.hasPermission = function(module, action) {
  const Role = require('./Role');
  return Role.hasPermission(this.role, module, action);
};

module.exports = mongoose.model('User', userSchema);