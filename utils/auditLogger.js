const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry
 * @param {Object} params
 * @param {Object} params.user - The user performing the action (should have _id and name)
 * @param {String} params.action - CREATE, UPDATE, DELETE, READ, REJECT, APPROVE
 * @param {String} params.module - Inventory, Sales, Vendors, Approvals, System, Purchases, Returns
 * @param {String} params.resource - Description of the resource (e.g., "Product PROD-123")
 * @param {String} params.status - SUCCESS or FAILED
 * @param {Object} params.details - Any additional details (before/after states, error messages)
 * @param {Object} req - Optional Express request object to extract IP
 */
exports.logAudit = async ({ user, action, module, resource, status = 'SUCCESS', details = {}, req = null }) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : '127.0.0.1';
    
    await AuditLog.create({
      user: user._id || user.id,
      userName: user.name || user.username || 'System User',
      action,
      module,
      resource,
      status,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};
