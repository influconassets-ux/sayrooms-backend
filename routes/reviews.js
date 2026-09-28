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

// POST /api/reviews
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { type, name, rating, content, fileUrl } = req.body;
    let uploadedFileUrl = fileUrl || null;

    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'sayrooms/reviews',
          use_filename: true,
          unique_filename: true,
          resource_type: 'auto'
        });
        uploadedFileUrl = result.secure_url;
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      } else {
        uploadedFileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      }
    }

    const reviewData = {
      type: type || 'text',
      name: name || 'Anonymous',
      rating: parseInt(rating) || 5,
      content: type === 'video' && uploadedFileUrl ? uploadedFileUrl : (content || ''),
      avatar: type === 'text' ? uploadedFileUrl : null
    };

    const newReview = await prisma.review.create({
      data: reviewData
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Prisma Error in GET /api/reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.review.delete({ where: { id } });
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
