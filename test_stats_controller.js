const mongoose = require('mongoose');
const Item = require('./models/Item');
const Transaction = require('./models/Transaction');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const testGetStats = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');
        
        const categories = await Item.distinct('category', { isActive: true });
        const totalCategories = categories.length;
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const newCategoriesThisMonth = await Item.distinct('category', {
          isActive: true,
          createdAt: { $gte: startOfMonth }
        });
        
        const lowStockCount = await Item.countDocuments({
          isActive: true,
          status: { $in: ['low_stock', 'critical'] }
        });
        
        const lastTransaction = await Transaction.findOne()
          .sort({ createdAt: -1 })
          .limit(1);
        
        let lastSyncText = '4 MINS AGO';
        if (lastTransaction) {
          const minutesAgo = Math.floor((new Date() - lastTransaction.createdAt) / (1000 * 60));
          if (minutesAgo < 60) {
            lastSyncText = `${minutesAgo} MINS AGO`;
          } else if (minutesAgo < 1440) {
            lastSyncText = `${Math.floor(minutesAgo / 60)} HRS AGO`;
          } else {
            lastSyncText = `${Math.floor(minutesAgo / 1440)} DAYS AGO`;
          }
        }
        
        const recentTransactions = await Transaction.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
        
        const systemHealthStatus = recentTransactions > 0 ? 'HEALTHY STATUS' : 'STABLE';
        
        const result = {
          categories: {
            label: "TOTAL CATEGORIES",
            value: totalCategories.toString(),
            subtext: "ACTIVE",
            trend: `+${newCategoriesThisMonth.length} THIS MONTH`,
            image: "/Background (4).svg",
            borderColor: "#1A8FA0"
          },
          lowStock: {
            label: "LOW STOCK",
            value: lowStockCount.toString(),
            subtext: "ITEMS",
            trend: "ACTION REQUIRED",
            image: "/Background (3).svg",
            borderColor: "#640404",
            trendColor: "text-red-600"
          },
          systemHealth: {
            label: "SYSTEM HEALTH",
            value: "",
            subtext: "Last Sync",
            trend: lastSyncText,
            status: systemHealthStatus,
            image: "/Background (5).svg",
            borderColor: "#1E4D7B",
            trendColor: "text-[#06B6D4]"
          }
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch(err) {
        console.log(err);
        process.exit(1);
    }
}
testGetStats();
