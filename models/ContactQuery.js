const mongoose = require('mongoose');

const contactQuerySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  inquiryType: { type: String, enum: ['Cabs', 'Packages', 'Hotels', 'Trains', 'Flights', 'Other'], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('ContactQuery', contactQuerySchema);
