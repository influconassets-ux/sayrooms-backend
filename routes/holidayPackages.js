const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const HolidayPackage = require('../models/HolidayPackage');

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

const uploadToCloudinary = async (filePath) => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'sayrooms_holiday_packages',
      use_filename: true,
      unique_filename: true,
      timeout: 120000
    });
    try { fs.unlinkSync(filePath); } catch (e) {}
    return result.secure_url;
  } else {
    return `http://localhost:5000/uploads/${path.basename(filePath)}`;
  }
};

// Get all holiday packages
router.get('/', async (req, res) => {
  try {
    const packages = await HolidayPackage.find().sort({ createdAt: -1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get one package
router.get('/:id', async (req, res) => {
  try {
    const pkg = await HolidayPackage.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Cannot find package' });
    }
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create one package
router.post('/', upload.any(), async (req, res) => {
  try {
    let mainImageUrl = req.body.image || '';
    let galleryUrls = [];
    
    // Parse complex JSON fields
    let itinerary = [];
    if (req.body.itinerary) itinerary = JSON.parse(req.body.itinerary);
    
    let placesToVisit = [];
    if (req.body.placesToVisit) placesToVisit = JSON.parse(req.body.placesToVisit);

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.path);
        
        if (file.fieldname === 'imageFile') {
          mainImageUrl = url;
        } else if (file.fieldname === 'galleryFiles') {
          galleryUrls.push(url);
        } else if (file.fieldname.startsWith('placeImage_')) {
          const index = parseInt(file.fieldname.split('_')[1]);
          if (placesToVisit[index]) {
            placesToVisit[index].image = url;
          }
        }
      }
    }

    const pkg = new HolidayPackage({
      title: req.body.title,
      duration: req.body.duration,
      shortDescription: req.body.shortDescription,
      price: req.body.price,
      pricingModel: req.body.pricingModel || 'per_person',
      extraChildPrice: req.body.extraChildPrice ? Number(req.body.extraChildPrice) : 0,
      image: mainImageUrl,
      about: req.body.about,
      quickInfo: req.body.quickInfo ? JSON.parse(req.body.quickInfo) : [],
      highlights: req.body.highlights ? JSON.parse(req.body.highlights) : [],
      inclusions: req.body.inclusions ? JSON.parse(req.body.inclusions) : [],
      itinerary: itinerary,
      gallery: galleryUrls,
      placesToVisit: placesToVisit
    });

    const newPkg = await pkg.save();
    res.status(201).json(newPkg);
  } catch (err) {
    console.error('Error creating holiday package:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update one package
router.put('/:id', upload.any(), async (req, res) => {
  try {
    const pkg = await HolidayPackage.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Cannot find package' });
    }

    let mainImageUrl = req.body.image || pkg.image;
    let galleryUrls = req.body.existingGallery ? JSON.parse(req.body.existingGallery) : pkg.gallery;
    
    let itinerary = req.body.itinerary ? JSON.parse(req.body.itinerary) : pkg.itinerary;
    let placesToVisit = req.body.placesToVisit ? JSON.parse(req.body.placesToVisit) : pkg.placesToVisit;

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.path);
        
        if (file.fieldname === 'imageFile') {
          mainImageUrl = url;
        } else if (file.fieldname === 'galleryFiles') {
          galleryUrls.push(url);
        } else if (file.fieldname.startsWith('placeImage_')) {
          const index = parseInt(file.fieldname.split('_')[1]);
          if (placesToVisit[index]) {
            placesToVisit[index].image = url;
          }
        }
      }
    }

    pkg.title = req.body.title || pkg.title;
    pkg.duration = req.body.duration !== undefined ? req.body.duration : pkg.duration;
    pkg.shortDescription = req.body.shortDescription !== undefined ? req.body.shortDescription : pkg.shortDescription;
    pkg.price = req.body.price || pkg.price;
    if (req.body.pricingModel) pkg.pricingModel = req.body.pricingModel;
    if (req.body.extraChildPrice !== undefined) pkg.extraChildPrice = Number(req.body.extraChildPrice);
    pkg.image = mainImageUrl;
    pkg.about = req.body.about !== undefined ? req.body.about : pkg.about;
    
    if (req.body.quickInfo) pkg.quickInfo = JSON.parse(req.body.quickInfo);
    if (req.body.highlights) pkg.highlights = JSON.parse(req.body.highlights);
    if (req.body.inclusions) pkg.inclusions = JSON.parse(req.body.inclusions);
    
    pkg.itinerary = itinerary;
    pkg.gallery = galleryUrls;
    pkg.placesToVisit = placesToVisit;

    const updatedPkg = await pkg.save();
    res.json(updatedPkg);
  } catch (err) {
    console.error('Error updating holiday package:', err);
    res.status(400).json({ message: err.message });
  }
});

// Delete one package
router.delete('/:id', async (req, res) => {
  try {
    const pkg = await HolidayPackage.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Cannot find package' });
    }
    
    await pkg.deleteOne();
    res.json({ message: 'Deleted Package' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
