const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const TopDestination = require('../models/TopDestination');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, ''));
  }
});
const upload = multer({ storage: storage });

// Get all destinations
router.get('/', async (req, res) => {
  try {
    const destinations = await TopDestination.find().sort({ createdAt: -1 });
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get one destination
router.get('/:id', async (req, res) => {
  try {
    const destination = await TopDestination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: 'Cannot find destination' });
    }
    res.json(destination);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create one destination
router.post('/', upload.single('imageFile'), async (req, res) => {
  try {
    let publicUrl = req.body.image || '';

    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'sayrooms_destinations',
          use_filename: true,
          unique_filename: true,
          timeout: 120000
        });
        publicUrl = result.secure_url;
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      } else {
        publicUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      }
    }

    let linkedProps = [];
    if (req.body.linkedProperties) {
      try {
        linkedProps = JSON.parse(req.body.linkedProperties);
      } catch (e) {
        // if not valid JSON, ignore
      }
    }

    const destination = new TopDestination({
      name: req.body.name,
      homestays: req.body.homestays,
      image: publicUrl,
      tabCategory: req.body.tabCategory,
      linkedProperties: linkedProps
    });

    const newDestination = await destination.save();
    res.status(201).json(newDestination);
  } catch (err) {
    console.error('Error creating destination:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update one destination
router.put('/:id', upload.single('imageFile'), async (req, res) => {
  try {
    const destination = await TopDestination.findById(req.params.id);
    if (destination == null) {
      return res.status(404).json({ message: 'Cannot find destination' });
    }

    let publicUrl = req.body.image;

    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'sayrooms_destinations',
          use_filename: true,
          unique_filename: true,
          timeout: 120000
        });
        publicUrl = result.secure_url;
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      } else {
        publicUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      }
    }

    if (req.body.name != null) destination.name = req.body.name;
    if (req.body.homestays != null) destination.homestays = req.body.homestays;
    if (publicUrl) destination.image = publicUrl;
    if (req.body.tabCategory != null) destination.tabCategory = req.body.tabCategory;
    
    if (req.body.linkedProperties != null) {
      try {
        destination.linkedProperties = JSON.parse(req.body.linkedProperties);
      } catch (e) {}
    }

    const updatedDestination = await destination.save();
    res.json(updatedDestination);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete one destination
router.delete('/:id', async (req, res) => {
  try {
    const destination = await TopDestination.findById(req.params.id);
    if (destination == null) {
      return res.status(404).json({ message: 'Cannot find destination' });
    }
    
    await destination.deleteOne();
    res.json({ message: 'Deleted Destination' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
