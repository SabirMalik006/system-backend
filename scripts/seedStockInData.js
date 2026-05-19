const mongoose = require('mongoose');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Vendor = require('../models/Vendor');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional)
    await Item.deleteMany({});
    await Transaction.deleteMany({});
    await Vendor.deleteMany({});

    // Create vendors
    const vendors = await Vendor.create([
      { name: 'M/s Berger Paint', rating: 4.5, performanceScore: 92 },
      { name: 'M/s Fast Cables', rating: 4.2, performanceScore: 88 },
      { name: 'M/s Sh Wilayat Ahmed & Sons', rating: 4.0, performanceScore: 85 },
      { name: 'Global Log Ltd', rating: 4.8, performanceScore: 98 },
      { name: 'SafetyFirst', rating: 4.6, performanceScore: 92 },
      { name: 'Industrial T.', rating: 4.3, performanceScore: 84 }
    ]);

    // Create items
    const items = await Item.create([
      { name: 'Polyvinyl Distemper', sku: 'SKU-9920-HD', category: 'Paints', currentStock: 150, threshold: 80, unitPrice: 450, vendorId: vendors[0]._id, vendorName: vendors[0].name },
      { name: 'Strip Light 4ft LED Complete Standard', sku: 'SKU-2021-SAF', category: 'Electrical', currentStock: 440, threshold: 100, unitPrice: 1200, vendorId: vendors[1]._id, vendorName: vendors[1].name },
      { name: 'Circuit Breaker 15 Amp for AC with Plug', sku: 'SKU-3310-FST', category: 'Electrical', currentStock: 45, threshold: 80, unitPrice: 850, vendorId: vendors[2]._id, vendorName: vendors[2].name },
      { name: 'Aluminum Door Handle 175mm', sku: 'SKU-AL-175', category: 'Tools', currentStock: 360, threshold: 100, unitPrice: 320, vendorId: vendors[3]._id, vendorName: vendors[3].name },
      { name: 'Towel rail Plastic', sku: 'SKU-TR-PL', category: 'Sanitary', currentStock: 325, threshold: 100, unitPrice: 280, vendorId: vendors[4]._id, vendorName: vendors[4].name }
    ]);

    // Create stock-in transactions
    await Transaction.create([
      { itemId: items[0]._id, itemName: items[0].name, sku: items[0].sku, type: 'IN', quantity: 50, previousStock: 100, newStock: 150, unitPrice: 450, reference: 'purchase_order', referenceId: 'PO-88291', issuedTo: vendors[0].name, userId: new mongoose.Types.ObjectId(), userName: 'Admin User', transactionDate: new Date('2024-11-24T10:45:00') },
      { itemId: items[1]._id, itemName: items[1].name, sku: items[1].sku, type: 'IN', quantity: 100, previousStock: 340, newStock: 440, unitPrice: 1200, reference: 'purchase_order', referenceId: 'PO-88290', issuedTo: vendors[1].name, userId: new mongoose.Types.ObjectId(), userName: 'Admin User', transactionDate: new Date('2024-11-24T09:32:00') },
      { itemId: items[2]._id, itemName: items[2].name, sku: items[2].sku, type: 'IN', quantity: 20, previousStock: 25, newStock: 45, unitPrice: 850, reference: 'purchase_order', referenceId: 'PO-88285', issuedTo: vendors[2].name, userId: new mongoose.Types.ObjectId(), userName: 'Admin User', transactionDate: new Date('2024-11-24T08:15:00'), notes: 'draft' }
    ]);

    console.log('✅ Seed data inserted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();