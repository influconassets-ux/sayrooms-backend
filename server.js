require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const holidayPackagesRoutes = require('./routes/holidayPackages');

// Start background workers
require('./workers/bookingWorker');

const path = require('path');

const app = express();
app.set('trust proxy', 1); // Trust the reverse proxy (Render) to get correct IP for rate limiting

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting to protect the free tier from being overwhelmed
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// Force browsers to not cache API responses locally (prevents the "2 refresh" issue)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use('/api', limiter); // Apply only to API routes

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Database connection resilience
mongoose.connection.on('disconnected', () => {
  console.warn('Lost MongoDB connection. Mongoose will attempt to reconnect...');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB error after initial connection:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/properties', require('./routes/properties'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/drafts', require('./routes/drafts'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/top-destinations', require('./routes/topDestinations'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/holiday-packages', holidayPackagesRoutes);
app.use('/api/partners', require('./routes/partners'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/contact', require('./routes/contact'));

app.get('/api/keep-alive', (req, res) => {
  res.status(200).json({ status: "alive", message: "Sayrooms backend is awake!" });
});

app.get('/', (req, res) => {
  res.send('Sayrooms API Running');
});

// Global Error Handler to prevent app crashes on unhandled exceptions
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'An unexpected error occurred on the server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
