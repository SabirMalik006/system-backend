const mongoose = require('mongoose');
const Item = require('./models/Item');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cats = await Item.distinct('category', { isActive: true });
        console.log('Categories:', cats.length);
        const ls = await Item.countDocuments({ isActive: true, status: { $in: ['low_stock', 'critical'] } });
        console.log('Low stock:', ls);
        process.exit(0);
    } catch(err) {
        console.log(err);
        process.exit(1);
    }
}
connectDB();
