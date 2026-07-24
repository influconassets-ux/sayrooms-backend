const mongoose = require('mongoose');

const topDestinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  homestays: {
    type: String,
    required: true,
    trim: true,
    default: '0 Homestays'
  },
  image: {
    type: String,
    required: true,
  },
  tabCategory: {
    type: String,
    required: true,
    trim: true,
    default: 'All'
  },
  linkedProperties: [{
    type: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('TopDestination', topDestinationSchema);
