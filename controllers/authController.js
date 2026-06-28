const User = require('../models/User');
const Role = require('../models/Role');
const Session = require('../models/Session');
const { generateTokens, verifyToken } = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// Generate tokens and set cookies
const sendTokenResponse = async (user, statusCode, res, req) => {
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();
  
  // Create session record
  await Session.create({
    userId: user._id,
    token: accessToken,
    refreshToken: refreshToken,
    deviceInfo: {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  // Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  
  res.status(statusCode).json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      accessibleModules: user.accessibleModules
    }
  });
};

// @desc    Register user (Admin only)
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Only super_admin / dwece can create new users
    if (req.user && req.user.role !== 'super_admin' && req.user.role !== 'dwece') {
      return res.status(403).json({ 
        message: 'Only Super Admin can create new users',
        yourRole: req.user.role 
      });
    }
    
    // Validate role - only these roles can be created
    const allowedRoles = ['ims_manager', 'ims_viewer', 'hr_manager', 'hr_viewer', 'finance', 'employee', 'dwece'];
    
    if (!role) {
      return res.status(400).json({ 
        message: `Role is required. Allowed roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        message: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    // Get role permissions
    const Role = require('../models/Role');
    const roleData = Role.getPermissionsByRole(role);
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      permissions: roleData.permissions || []
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessibleModules: user.accessibleModules
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { email, password } = req.body;
    
    // Check for user - don't validate role here
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    sendTokenResponse(user, 200, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }
    
    // Verify refresh token
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user with valid refresh token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Update user refresh token
    user.refreshToken = newRefreshToken;
    await user.save();
    
    // Update session
    await Session.findOneAndUpdate(
      { refreshToken: refreshToken },
      { token: accessToken, refreshToken: newRefreshToken }
    );
    
    // Set new cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ success: true, message: 'Token refreshed', accessToken });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Find and delete session
      await Session.findOneAndDelete({ refreshToken });
      
      // Clear user's refresh token
      const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
      if (decoded) {
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      }
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password -refreshToken').populate('role');
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete all sessions for this user
    await Session.deleteMany({ userId: user._id });
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};