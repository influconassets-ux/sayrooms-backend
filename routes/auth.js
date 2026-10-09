const express = require('express');
const router = express.Router();
const { auth } = require('../firebaseAdmin');
const User = require('../models/User');

// POST /api/auth/verify
// Verifies the Firebase token sent from the client and syncs the user in MongoDB
router.post('/verify', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'No ID token provided' });
  }

  try {
    // 1. Verify the token with Firebase Admin
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, phone_number, name, picture, firebase } = decodedToken;

    // Determine provider based on sign-in provider
    const provider = firebase.sign_in_provider || 'unknown';

    // 2. Check if user exists in MongoDB, otherwise create them
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Check if user exists with the same email or phone number
      let existingUser = null;
      if (email) existingUser = await User.findOne({ email });
      if (!existingUser && phone_number) existingUser = await User.findOne({ phoneNumber: phone_number });

      if (existingUser) {
        // Link the new firebaseUid to the existing account
        existingUser.firebaseUid = uid;
        if (!existingUser.provider) existingUser.provider = provider;
        await existingUser.save();
        user = existingUser;
      } else {
        user = new User({
          firebaseUid: uid,
          email: email || undefined,
          phoneNumber: phone_number || undefined,
          displayName: name || '',
          photoURL: picture || '',
          provider: provider
        });
        await user.save();
      }
    } else {
      // Optional: Update user info if it has changed
      let updated = false;
      if (email && user.email !== email) { user.email = email; updated = true; }
      if (phone_number && user.phoneNumber !== phone_number) { user.phoneNumber = phone_number; updated = true; }
      if (name && user.displayName !== name) { user.displayName = name; updated = true; }
      
      if (updated) await user.save();
    }

    // 3. Return the synced MongoDB user back to the client
    res.status(200).json({ message: 'User verified', user });
    
  } catch (error) {
    console.error('Error verifying token or syncing user:', error);
    res.status(401).json({ error: error.message || 'Unauthorized or token expired' });
  }
});

// PUT /api/auth/profile
// Updates the user's profile information
router.put('/profile', async (req, res) => {
  const { firebaseUid, displayName, email, phoneNumber, dob, address } = req.body;
  
  if (!firebaseUid) {
    return res.status(400).json({ error: 'Missing firebaseUid' });
  }

  try {
    let user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (displayName) user.displayName = displayName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (dob) user.dob = dob;
    if (address) user.address = address;

    await user.save();
    res.status(200).json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email or Phone Number is already registered to another account.' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/auth/user/:uid
// Fetch user details by Firebase UID
router.get('/user/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
