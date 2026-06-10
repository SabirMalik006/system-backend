const Vendor = require('../../models/Vendor');
const { logAudit } = require('../../utils/auditLogger');

// @desc    Get all vendors
// @route   GET /api/vendors
exports.getVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const search = req.query.search || '';
    
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { vendorId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Vendor.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    // Handle Mongo duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Vendor with this name or ID already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get top performing vendors
// @route   GET /api/vendors/top
exports.getTopVendors = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const topVendors = await Vendor.getTopVendors(limit);
    
    res.json({
      success: true,
      vendors: topVendors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get vendor performance stats for charts
// @route   GET /api/vendors/stats/performance
exports.getPerformanceStats = async (req, res) => {
  try {
    const allVendors = await Vendor.find({ isActive: true });

    // Rating distribution
    let excellent = 0, good = 0, average = 0, poor = 0;
    allVendors.forEach(v => {
      if (v.rating >= 4) excellent++;
      else if (v.rating >= 3) good++;
      else if (v.rating >= 2) average++;
      else poor++;
    });
    const total = allVendors.length || 1;
    const ratingDistribution = [
      { name: 'Excellent', value: Math.round((excellent / total) * 100), color: '#1E88E5', darkColor: '#1565C0' },
      { name: 'Good',      value: Math.round((good / total) * 100),      color: '#1a3a8f', darkColor: '#0d2257' },
      { name: 'Average',   value: Math.round((average / total) * 100),    color: '#455a8a', darkColor: '#2c3d6b' },
      { name: 'Poor',      value: Math.round((poor / total) * 100),      color: '#EF5350', darkColor: '#b71c1c' },
    ];

    // On-time delivery vs total orders
    const deliveryData = allVendors
      .filter(v => v.totalOrders > 0)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10)
      .map(v => ({
        vendor: v.name,
        onTime: v.onTimePercentage || 0,
        total: v.totalOrders,
      }));

    res.json({
      success: true,
      data: { ratingDistribution, deliveryData },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single vendor
// @route   GET /api/vendors/:id
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new vendor
// @route   POST /api/vendors
exports.createVendor = async (req, res) => {
  try {
    const {
      name,
      vendorId,
      shippingItems,
      totalOrders,
      onTimePercentage,
      rating,
      status
    } = req.body;
    
    // Check if vendor name or ID already exists
    const existingVendor = await Vendor.findOne({ 
      $or: [{ name }, { vendorId }]
    });
    
    if (existingVendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor with this name or ID already exists' 
      });
    }
    
    // Ensure shippingItems is one of the allowed enum values; otherwise default to empty string
    const allowedShippingItems = ['SUPPORTING', 'SUPPLIES', 'CONTRACTS', 'SOFTWARE', 'INVENTORY', 'MANUFACTURING', ''];
    const normalizedShippingItems = allowedShippingItems.includes(shippingItems) ? shippingItems : '';

    const newVendor = await Vendor.create({
      name,
      vendorId,
      shippingItems: normalizedShippingItems,
      totalOrders: totalOrders || 0,
      onTimePercentage: onTimePercentage || 100,
      rating: rating || 0,
      status: status || 'Active',
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    // Fire-and-forget audit log so failures don't cause a duplicate response error
    logAudit({
      user: req.user,
      action: 'CREATE',
      module: 'Vendors',
      resource: `Vendor ${newVendor.name}`,
      status: 'SUCCESS',
      details: { vendorId: newVendor._id, name: newVendor.name },
      req
    }).catch((err) => console.error('Audit log error:', err));

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      vendor: newVendor
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update vendor
// @route   PUT /api/vendors/:id
exports.updateVendor = async (req, res) => {
  try {
    const {
      name,
      vendorId,
      shippingItems,
      totalOrders,
      onTimePercentage,
      rating,
      status
    } = req.body;
    
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    
    // Update fields
    if (name) vendor.name = name;
    if (vendorId) vendor.vendorId = vendorId;
    if (shippingItems !== undefined) {
      const allowedShippingItems = ['SUPPORTING', 'SUPPLIES', 'CONTRACTS', 'SOFTWARE', 'INVENTORY', 'MANUFACTURING', ''];
      vendor.shippingItems = allowedShippingItems.includes(shippingItems) ? shippingItems : '';
    }
    if (totalOrders !== undefined) vendor.totalOrders = totalOrders;
    if (onTimePercentage !== undefined) vendor.onTimePercentage = onTimePercentage;
    if (rating !== undefined) vendor.rating = rating;
    if (status) vendor.status = status;
    
    vendor.updatedBy = req.user.id;
    await vendor.save();
    
    res.json({
      success: true,
      message: 'Vendor updated successfully',
      vendor
    });

    await logAudit({
      user: req.user,
      action: 'UPDATE',
      module: 'Vendors',
      resource: `Vendor ${vendor.name}`,
      status: 'SUCCESS',
      details: { vendorId: vendor._id, name: vendor.name }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete vendor
// @route   DELETE /api/vendors/:id
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    
    // Perform hard delete
    await vendor.deleteOne();
    
    res.json({
      success: true,
      message: 'Vendor permanently deleted'
    });

    await logAudit({
      user: req.user,
      action: 'DELETE',
      module: 'Vendors',
      resource: `Vendor ${vendor.name}`,
      status: 'SUCCESS',
      details: { vendorId: vendor._id }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
