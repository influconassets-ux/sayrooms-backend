const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    required: true,
  },
  linkedProperties: [{
    type: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Collection', collectionSchema);
