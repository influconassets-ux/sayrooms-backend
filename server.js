require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const holidayPackagesRoutes = require('./routes/holidayPackages');

const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

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

app.get('/', (req, res) => {
  res.send('Sayrooms API Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
