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

dotenv.config();

const app = express();

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
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://system-two-lime.vercel.app'],
  credentials: true
}));
app.use('/api', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stockin', stockInRoutes);
app.use('/api/stockout', stockOutRoutes);
app.use('/api/returns', stockReturnRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/vendors', require('./routes/ims/vendorRoutes'));
app.use('/api/dashboard', require('./routes/ims/dashboardRoutes'));
app.use('/api/reports', require('./routes/ims/reportRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});