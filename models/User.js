const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    sparse: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    sparse: true,
    unique: true,
  },
  displayName: {
    type: String,
  },
  photoURL: {
    type: String,
  },
  provider: {
    type: String, // 'email', 'phone', 'facebook'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', userSchema);
