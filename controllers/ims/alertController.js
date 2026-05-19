const Alert = require('../../models/Alert');
const Item = require('../../models/Item');
const Vendor = require('../../models/Vendor');

// @desc    Get all active alerts for dashboard
// @route   GET /api/alerts
exports.getAlerts = async (req, res) => {
  try {
    // First, generate real-time alerts from data
    await generateRealTimeAlerts();
    
    const alerts = await Alert.getActiveAlerts();
    const newCount = await Alert.getNewAlertsCount();
    
    // Format for frontend
    const formattedAlerts = alerts.map(alert => ({
      type: alert.type === 'critical_stock' ? 'warning' : 'success',
      title: alert.title,
      desc: alert.description,
      text: alert.message,
      action: alert.action,
      actionColor: '#ffffff',
      actionBg: alert.type === 'critical_stock' ? '#dc2626' : '#094440'
    }));
    
    res.json({
      success: true,
      alerts: formattedAlerts,
      newCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Dismiss an alert
// @route   PUT /api/alerts/:id/dismiss
exports.dismissAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isDismissed: true, isRead: true },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    
    res.json({ success: true, message: 'Alert dismissed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all alerts
// @route   DELETE /api/alerts/clear
exports.clearAllAlerts = async (req, res) => {
  try {
    await Alert.updateMany(
      { isDismissed: false },
      { isDismissed: true, isRead: true }
    );
    
    res.json({ success: true, message: 'All alerts cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to generate real-time alerts
async function generateRealTimeAlerts() {
  // Check for critical stock items
  const criticalItems = await Item.find({
    isActive: true,
    status: 'critical'
  }).limit(2);
  
  for (const item of criticalItems) {
    const existingAlert = await Alert.findOne({
      type: 'critical_stock',
      itemId: item._id,
      isDismissed: false
    });
    
    if (!existingAlert) {
      await Alert.create({
        type: 'critical_stock',
        title: 'Critical Stock',
        description: `${item.name} ${item.vendorName || ''}`,
        message: `Remaining units below threshold (${item.threshold} units)`,
        action: 'Reorder Now',
        itemId: item._id
      });
    }
  }
  
  // Check for pending vendor approvals
  const pendingVendors = await Vendor.find({
    status: 'inactive',
    isActive: true
  }).limit(1);
  
  for (const vendor of pendingVendors) {
    const existingAlert = await Alert.findOne({
      type: 'approval_required',
      vendorId: vendor._id,
      isDismissed: false
    });
    
    if (!existingAlert) {
      await Alert.create({
        type: 'approval_required',
        title: 'Approval Required',
        description: `New Vendor Registration: ${vendor.name}`,
        message: 'Compliance check completed. Ready for final review.',
        action: 'Approve',
        vendorId: vendor._id
      });
    }
  }
}