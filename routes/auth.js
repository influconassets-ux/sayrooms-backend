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
      user = new User({
        firebaseUid: uid,
        email: email || undefined,
        phoneNumber: phone_number || undefined,
        displayName: name || '',
        photoURL: picture || '',
        provider: provider
      });
      await user.save();
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
    res.status(401).json({ error: 'Unauthorized or token expired' });
  }
});

module.exports = router;
