const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for local disk storage to avoid Firebase 404 Bucket errors
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

// POST /api/properties
router.post('/', (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('Multer parsing error:', err);
      return res.status(500).json({ error: 'File upload parsing failed', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const rawData = req.body;
    
    // The frontend sends JSON stringified parts for complex arrays/objects
    const rooms = JSON.parse(rawData.rooms && rawData.rooms !== 'undefined' ? rawData.rooms : '[]');
    const nearbyPlaces = JSON.parse(rawData.nearbyPlaces && rawData.nearbyPlaces !== 'undefined' ? rawData.nearbyPlaces : '[]');
    const amenities = JSON.parse(rawData.amenities && rawData.amenities !== 'undefined' ? rawData.amenities : '[]');
    
    // Handle File Uploads (Cloudinary + Local Fallback)
    const uploadedImages = {};
    const propertyImages = [];
    
    // Upload files to Cloudinary sequentially to avoid network timeouts on local internet
    for (const file of (req.files || [])) {
      try {
        let publicUrl;
        
        // If Cloudinary is configured, upload there
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'sayrooms',
            use_filename: true,
            unique_filename: true,
            timeout: 120000 // 2 minutes timeout per file
          });
          publicUrl = result.secure_url;
          
          // Clean up local file after successful upload
          try {
            fs.unlinkSync(file.path);
          } catch (e) { console.error('Failed to clean up local file', e); }
        } else {
          // Fallback to local
          publicUrl = `http://localhost:5000/uploads/${file.filename}`;
        }

        if (file.fieldname.startsWith('roomImage_')) {
          const parts = file.fieldname.split('_');
          const roomIndex = parts[1];
          if (!uploadedImages[roomIndex]) {
            uploadedImages[roomIndex] = [];
          }
          uploadedImages[roomIndex].push(publicUrl);
        } else if (file.fieldname.startsWith('propertyImage_')) {
          propertyImages.push(publicUrl);
        }
      } catch (uploadError) {
        console.error('Error uploading file to Cloudinary:', uploadError);
        throw new Error('Failed to upload images. Please check your internet connection and try again.');
      }
    }
    
    // Inject image URLs back into the rooms data before saving to DB
    const processedRooms = rooms.map((room, index) => {
      const roomStrIndex = index.toString();
      const uploadedRoomImages = uploadedImages[roomStrIndex] || [];
        const extraData = {
          bed: room.bed || '',
          count: parseInt(room.count) || 1,
          taxes: parseFloat(room.taxes) || 0,
          amenities: room.amenities || [],
          desc: room.description || ''
        };

        return {
          type: room.type || 'Standard Room',
          quantity: parseInt(room.count) || 1,
          price: parseFloat(room.price) || 0,
          capacity: parseInt(room.capacity) || 2,
          size: room.size || '',
          description: JSON.stringify(extraData),
          images: uploadedRoomImages.length > 0 ? uploadedRoomImages : (room.images || [])
        };
    });

    // Insert everything into PostgreSQL using Prisma
    // Ensure no undefined values are passed to required String fields
    const newProperty = await prisma.property.create({
      data: {
        propertyName: rawData.propertyName || 'Unnamed Property',
        propertyType: rawData.propertyType || 'Homestay',
        totalRooms: parseInt(rawData.totalRooms) || 0,
        maxGuests: parseInt(rawData.maxGuests) || 0,
        totalBathrooms: parseInt(rawData.totalBathrooms) || 0,
        pricePerNight: parseFloat(rawData.pricePerNight) || 0,
        
        addressLine1: rawData.addressLine1 || '',
        addressLine2: rawData.addressLine2 || '',
        city: rawData.city || '',
        state: rawData.state || '',
        pincode: rawData.pincode || '',
        country: rawData.country || '',
        latitude: parseFloat(rawData.latitude) || 0,
        longitude: parseFloat(rawData.longitude) || 0,
        
        hostName: rawData.hostName || 'Unknown Host',
        contactEmail: rawData.contactEmail || 'no-email@example.com',
        contactPhone: rawData.contactPhone || '0000000000',
        alternatePhone: rawData.alternatePhone || '',
        
        propertyIdStr: rawData.propertyId || '',
        description: rawData.description || '',
        tags: rawData.tags ? JSON.parse(rawData.tags) : [],
        
        checkInTime: '12:00 PM',
        checkOutTime: '11:00 AM',
        petsAllowed: rawData.petsAllowed === 'true',
        smokingAllowed: rawData.smokingAllowed === 'true',
        eventsAllowed: rawData.eventsAllowed === 'true',
        unmarriedCouplesAllowed: rawData.unmarriedCouplesAllowed === 'true',
        cancellationPolicy: rawData.cancellationPolicy || '',
        houseRules: rawData.houseRules || '',
        
        amenities: amenities,
        images: propertyImages,
        
        rooms: {
          create: processedRooms
        },
        nearbyPlaces: {
          create: nearbyPlaces.map(place => ({
            name: place.name || 'Nearby Place',
            distance: place.distance || '0 km'
          }))
        }
      },
      include: {
        rooms: true,
        nearbyPlaces: true
      }
    });

    res.status(201).json({ message: 'Property created successfully', property: newProperty });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property', details: error.message });
  }
});

// PUT /api/properties/:id
router.put('/:id', upload.any(), async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    if (isNaN(propertyId)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    const rawData = req.body;
    
    // The frontend sends JSON stringified parts for complex arrays/objects
    const rooms = JSON.parse(rawData.rooms && rawData.rooms !== 'undefined' ? rawData.rooms : '[]');
    const nearbyPlaces = JSON.parse(rawData.nearbyPlaces && rawData.nearbyPlaces !== 'undefined' ? rawData.nearbyPlaces : '[]');
    const amenities = JSON.parse(rawData.amenities && rawData.amenities !== 'undefined' ? rawData.amenities : '[]');
    
    // Handle File Uploads (Cloudinary + Local Fallback)
    const uploadedImages = {};
    const propertyImages = [];
    
    // Upload files to Cloudinary sequentially to avoid network timeouts on local internet
    for (const file of (req.files || [])) {
      try {
        let publicUrl;
        
        // If Cloudinary is configured, upload there
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'sayrooms',
            use_filename: true,
            unique_filename: true,
            timeout: 120000 // 2 minutes timeout per file
          });
          publicUrl = result.secure_url;
          
          // Clean up local file after successful upload
          try {
            fs.unlinkSync(file.path);
          } catch (e) { console.error('Failed to clean up local file', e); }
        } else {
          // Fallback to local
          publicUrl = `http://localhost:5000/uploads/${file.filename}`;
        }

        if (file.fieldname.startsWith('roomImage_')) {
          const parts = file.fieldname.split('_');
          const roomIndex = parts[1];
          if (!uploadedImages[roomIndex]) {
            uploadedImages[roomIndex] = [];
          }
          uploadedImages[roomIndex].push(publicUrl);
        } else if (file.fieldname.startsWith('propertyImage_')) {
          propertyImages.push(publicUrl);
        }
      } catch (uploadError) {
        console.error('Error uploading file to Cloudinary:', uploadError);
        throw new Error('Failed to upload images. Please check your internet connection and try again.');
      }
    }
    
    // Fetch existing property to merge existing images if new ones aren't provided
    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { rooms: true }
    });

    if (!existingProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const finalPropertyImages = propertyImages.length > 0 ? propertyImages : existingProperty.images;

    // Inject image URLs back into the rooms data before saving to DB
    const processedRooms = rooms.map((room, index) => {
      const roomStrIndex = index.toString();
      const uploadedRoomImages = uploadedImages[roomStrIndex] || [];
      const extraData = {
        bed: room.bed || '',
        count: parseInt(room.count) || 1,
        taxes: parseFloat(room.taxes) || 0,
        amenities: room.amenities || [],
        desc: room.description || ''
      };
      
      // If no new images were uploaded for this room, use existing ones if they exist
      let finalRoomImages = uploadedRoomImages;
      if (finalRoomImages.length === 0 && existingProperty.rooms[index]) {
        finalRoomImages = existingProperty.rooms[index].images;
      }

      return {
        type: room.type || 'Standard Room',
        price: parseFloat(room.price) || 0,
        capacity: parseInt(room.capacity) || 2,
        size: room.size || '',
        description: JSON.stringify(extraData),
        images: finalRoomImages
      };
    });

    // Update everything into PostgreSQL using Prisma
    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        propertyName: rawData.propertyName || 'Unnamed Property',
        propertyType: rawData.propertyType || 'Homestay',
        totalRooms: parseInt(rawData.totalRooms) || 0,
        maxGuests: parseInt(rawData.maxGuests) || 0,
        totalBathrooms: parseInt(rawData.totalBathrooms) || 0,
        pricePerNight: parseFloat(rawData.pricePerNight) || 0,
        
        addressLine1: rawData.addressLine1 || '',
        addressLine2: rawData.addressLine2 || '',
        city: rawData.city || '',
        state: rawData.state || '',
        pincode: rawData.pincode || '',
        country: rawData.country || '',
        latitude: parseFloat(rawData.latitude) || 0,
        longitude: parseFloat(rawData.longitude) || 0,
        
        hostName: rawData.hostName || 'Unknown Host',
        contactEmail: rawData.contactEmail || 'no-email@example.com',
        contactPhone: rawData.contactPhone || '0000000000',
        alternatePhone: rawData.alternatePhone || '',
        
        propertyIdStr: rawData.propertyId || '',
        description: rawData.description || '',
        tags: rawData.tags ? JSON.parse(rawData.tags) : [],
        
        checkInTime: '12:00 PM',
        checkOutTime: '11:00 AM',
        petsAllowed: rawData.petsAllowed === 'true',
        smokingAllowed: rawData.smokingAllowed === 'true',
        eventsAllowed: rawData.eventsAllowed === 'true',
        unmarriedCouplesAllowed: rawData.unmarriedCouplesAllowed === 'true',
        cancellationPolicy: rawData.cancellationPolicy || '',
        houseRules: rawData.houseRules || '',
        
        amenities: amenities,
        images: finalPropertyImages,
        
        rooms: {
          deleteMany: {}, // Delete all existing rooms
          create: processedRooms // Re-create with new data
        },
        nearbyPlaces: {
          deleteMany: {}, // Delete all existing nearby places
          create: nearbyPlaces.map(place => ({
            name: place.name || 'Nearby Place',
            distance: place.distance || '0 km'
          }))
        }
      },
      include: {
        rooms: true,
        nearbyPlaces: true
      }
    });

    res.status(200).json({ message: 'Property updated successfully', property: updatedProperty });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property', details: error.message });
  }
});

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        rooms: true,
        nearbyPlaces: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    if (isNaN(propertyId)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        rooms: true,
        nearbyPlaces: true
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error('Error fetching property details:', error);
    res.status(500).json({ error: 'Failed to fetch property details' });
  }
});

// DELETE /api/properties/all
router.delete('/all', async (req, res) => {
  try {
    // Delete all properties (Prisma will handle cascading deletes for rooms/nearbyPlaces if configured)
    await prisma.property.deleteMany({});
    res.status(200).json({ message: 'All properties deleted successfully' });
  } catch (error) {
    console.error('Error deleting all properties:', error);
    res.status(500).json({ error: 'Failed to delete all properties', details: error.message });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    if (isNaN(propertyId)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    // Prisma handles cascading deletes for rooms and nearbyPlaces if properly configured in schema.
    // If not, we might need to delete them manually first, but we will try deleting the property directly.
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    await prisma.property.delete({
      where: { id: propertyId }
    });

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property', details: error.message });
  }
});

module.exports = router;
