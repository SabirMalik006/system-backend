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
    
    const newVendor = await Vendor.create({
      name,
      vendorId,
      shippingItems,
      totalOrders: totalOrders || 0,
      onTimePercentage: onTimePercentage || 100,
      rating: rating || 0,
      status: status || 'Active',
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      vendor: newVendor
    });

    await logAudit({
      user: req.user,
      action: 'CREATE',
      module: 'Vendors',
      resource: `Vendor ${newVendor.name}`,
      status: 'SUCCESS',
      details: { vendorId: newVendor._id, name: newVendor.name }
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
    if (shippingItems !== undefined) vendor.shippingItems = shippingItems;
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
