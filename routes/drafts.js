const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../prismaClient');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create uploads directory if it doesn't exist
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
    cb(null, 'draft-' + uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, ''));
  }
});

const upload = multer({ storage: storage });

// POST /api/drafts
router.post('/', upload.any(), async (req, res) => {
  try {
    const rawData = req.body;
    let draftId = req.query.draftId || req.body.draftId;
    
    // We store whatever the frontend sends as JSON. 
    // To handle images in drafts, we upload them so they persist across sessions.
    const propertyImages = [];
    const uploadedImages = {};

    for (const file of (req.files || [])) {
      try {
        let publicUrl;
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'sayrooms_drafts',
            use_filename: true,
            unique_filename: true,
            timeout: 120000
          });
          publicUrl = result.secure_url;
          try { fs.unlinkSync(file.path); } catch (e) {}
        } else {
          publicUrl = `http://localhost:5000/uploads/${file.filename}`;
        }

        if (file.fieldname.startsWith('roomImage_')) {
          const parts = file.fieldname.split('_');
          const roomIndex = parts[1];
          if (!uploadedImages[roomIndex]) uploadedImages[roomIndex] = [];
          uploadedImages[roomIndex].push(publicUrl);
        } else if (file.fieldname.startsWith('propertyImage_')) {
          propertyImages.push(publicUrl);
        }
      } catch (err) {
        console.error('Draft image upload failed', err);
      }
    }

    // Merge new image URLs into rawData JSON strings
    // Drafts just need to store the exact JSON representation the frontend uses to rehydrate
    
    // Convert arrays back to objects for storage
    let rooms = [];
    try {
      rooms = JSON.parse(rawData.rooms && rawData.rooms !== 'undefined' ? rawData.rooms : '[]');
    } catch(e) {}
    
    rooms = rooms.map((room, index) => {
      const roomStrIndex = index.toString();
      const newImages = uploadedImages[roomStrIndex] || [];
      return {
        ...room,
        images: [...(room.images || []), ...newImages]
      };
    });
    
    rawData.rooms = JSON.stringify(rooms);
    
    // Note: To rehydrate property images on frontend, we might need a specific field.
    // We'll append propertyImages to an existing 'images' array if passed as JSON, 
    // but in rawData, it might just be the raw strings.
    let existingPropertyImages = [];
    try {
       existingPropertyImages = JSON.parse(rawData.images || '[]');
    } catch(e) {}
    rawData.images = JSON.stringify([...existingPropertyImages, ...propertyImages]);

    const propertyName = rawData.propertyName || 'Untitled Draft';

    if (draftId && draftId !== 'undefined' && draftId !== 'null') {
      draftId = parseInt(draftId);
      const updatedDraft = await prisma.draftProperty.update({
        where: { id: draftId },
        data: {
          name: propertyName,
          data: rawData
        }
      });
      return res.status(200).json({ message: 'Draft updated', draft: updatedDraft });
    } else {
      const newDraft = await prisma.draftProperty.create({
        data: {
          name: propertyName,
          data: rawData
        }
      });
      return res.status(201).json({ message: 'Draft created', draft: newDraft });
    }

  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft', details: error.message });
  }
});

// GET /api/drafts
router.get('/', async (req, res) => {
  try {
    const drafts = await prisma.draftProperty.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.status(200).json(drafts);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// GET /api/drafts/:id
router.get('/:id', async (req, res) => {
  try {
    const draftId = parseInt(req.params.id);
    const draft = await prisma.draftProperty.findUnique({
      where: { id: draftId }
    });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    res.status(200).json(draft);
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft details' });
  }
});

// DELETE /api/drafts/:id
router.delete('/:id', async (req, res) => {
  try {
    const draftId = parseInt(req.params.id);
    await prisma.draftProperty.delete({
      where: { id: draftId }
    });
    res.status(200).json({ message: 'Draft deleted' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

module.exports = router;
