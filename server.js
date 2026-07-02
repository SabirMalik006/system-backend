const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const stockInRoutes = require('./routes/ims/stockInRoutes');
const stockOutRoutes = require('./routes/ims/stockOutRoutes');
const stockReturnRoutes = require('./routes/ims/stockReturnRoutes');
const itemRoutes = require('./routes/ims/itemRoutes');
const seedDatabase = require('./utils/db');

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://system-two-lime.vercel.app',
  'https://theprimelinksolutions.com',
  'https://www.theprimelinksolutions.com',
  'https://api.theprimelinksolutions.com'
];

// CORS - MUST be before rate limiter for preflight requests
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 100,
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Database connection (cached for Vercel serverless)
let cachedClient = null;
const connectDB = async () => {
  if (cachedClient && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 1) {
    cachedClient = mongoose.connection;
    return cachedClient;
  }
  mongoose.connection.on('connected', () => { cachedClient = mongoose.connection; });
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 1
    });
    console.log('✅ MongoDB Connected');
    await seedDatabase();
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    if (process.env.NODE_ENV !== 'production') process.exit(1);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stockin', stockInRoutes);
app.use('/api/stockout', stockOutRoutes);
app.use('/api/returns', stockReturnRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/vendors', require('./routes/ims/vendorRoutes'));
app.use('/api/dashboard', require('./routes/ims/dashboardRoutes'));
app.use('/api/reports', require('./routes/ims/reportRoutes'));
app.use('/api/purchase-requests', require('./routes/ims/purchaseRequestRoutes'));
app.use('/api/employees', require('./routes/ims/employeeRoutes'));
app.use('/api/incidents', require('./routes/ims/incidentRoutes'));
app.use('/api/transfers', require('./routes/ims/transferRoutes'));
app.use('/api/training', require('./routes/ims/trainingRoutes'));
app.use('/api/attendance', require('./routes/ims/attendanceRoutes'));
app.use('/api/leaves', require('./routes/ims/leaveRoutes'));
app.use('/api/hrm-dashboard', require('./routes/hrmDashboardRoutes'));
app.use('/api/toolkits', require('./routes/ims/toolKitRoutes'));
app.use('/api/seed', require('./routes/seedRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};
start();