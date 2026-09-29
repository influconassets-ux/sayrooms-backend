const mongoose = require('mongoose');

const packageEnquirySchema = new mongoose.Schema({
  packageName: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  travelDate: { type: String, required: true },
  travellersInfo: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pending', enum: ['pending', 'contacted', 'resolved'] }
});

module.exports = mongoose.model('PackageEnquiry', packageEnquirySchema);
