const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const Collection = require('../models/Collection');

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

// Get all collections
router.get('/', async (req, res) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    res.json(collections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get one collection
router.get('/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Cannot find collection' });
    }
    res.json(collection);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create one collection
router.post('/', upload.single('imageFile'), async (req, res) => {
  try {
    let publicUrl = req.body.image || '';

    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'sayrooms_collections',
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

    const collection = new Collection({
      name: req.body.name,
      image: publicUrl,
      linkedProperties: linkedProps
    });

    const newCollection = await collection.save();
    res.status(201).json(newCollection);
  } catch (err) {
    console.error('Error creating collection:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update one collection
router.put('/:id', upload.single('imageFile'), async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (collection == null) {
      return res.status(404).json({ message: 'Cannot find collection' });
    }

    let publicUrl = req.body.image;

    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'sayrooms_collections',
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

    if (req.body.name != null) collection.name = req.body.name;
    if (publicUrl) collection.image = publicUrl;
    
    if (req.body.linkedProperties != null) {
      try {
        collection.linkedProperties = JSON.parse(req.body.linkedProperties);
      } catch (e) {}
    }

    const updatedCollection = await collection.save();
    res.json(updatedCollection);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete one collection
router.delete('/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (collection == null) {
      return res.status(404).json({ message: 'Cannot find collection' });
    }
    
    await collection.deleteOne();
    res.json({ message: 'Deleted Collection' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
