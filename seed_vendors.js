const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const vendorsData = [
    { name: "M/s Berger Paint", vendorId: "VND-0120-A", shippingItems: "SUPPORTING", totalOrders: 482, onTimePercentage: 100, rating: 4.8 },
    { name: "M/s Fast Cables", vendorId: "VND-0120-B", shippingItems: "SUPPLIES", totalOrders: 30, onTimePercentage: 100, rating: 4.5 },
    { name: "M/s Sh Wilayat Ahmed & Sons", vendorId: "VND-0120-C", shippingItems: "CONTRACTS", totalOrders: 56, onTimePercentage: 100, rating: 4.2 },
    { name: "M/s Three Star Ceramic", vendorId: "VND-0120-D", shippingItems: "SOFTWARE", totalOrders: 322, onTimePercentage: 100, rating: 4.9 },
    { name: "M/s SZ Developers", vendorId: "VND-0120-E", shippingItems: "SUPPORTING", totalOrders: 56, onTimePercentage: 100, rating: 4.3 },
    { name: "M/s Faisal Industries", vendorId: "VND-0120-F", shippingItems: "SUPPORTING", totalOrders: 1432, onTimePercentage: 100, rating: 4.7 },
    { name: "M/s Plasco (PVC) Pipes Industries", vendorId: "VND-0120-G", shippingItems: "INVENTORY", totalOrders: 124, onTimePercentage: 100, rating: 4.4 },
    { name: "M/s Plasco (PVC)", vendorId: "VND-0120-H", shippingItems: "MANUFACTURING", totalOrders: 107, onTimePercentage: 100, rating: 4.6 }
];

const seedVendors = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        for (const v of vendorsData) {
            const existing = await Vendor.findOne({ name: v.name });
            if (!existing) {
                await Vendor.create(v);
                console.log(`Created vendor: ${v.name}`);
            }
        }
        
        console.log('Seeding finished');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

seedVendors();
