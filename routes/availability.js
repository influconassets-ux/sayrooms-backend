const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GET /api/availability/check
// Returns available quantity for each room in a property for the given dates
router.get('/check', async (req, res) => {
  const { propertyId, checkIn, checkOut } = req.query;

  if (!propertyId || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'Missing propertyId, checkIn, or checkOut parameters' });
  }

  try {
    const pId = parseInt(propertyId);
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    // Get all rooms for this property
    const rooms = await prisma.room.findMany({
      where: { propertyId: pId }
    });

    // Find all confirmed/pending bookings that overlap with the requested dates
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        propertyId: pId,
        status: { in: ['pending', 'confirmed'] },
        AND: [
          { checkIn: { lt: outDate } },
          { checkOut: { gt: inDate } }
        ]
      }
    });

    // Calculate availability per room
    const availability = {};
    for (const room of rooms) {
      // Sum the booked quantity for this room in overlapping bookings
      const bookedQuantity = overlappingBookings
        .filter(b => b.roomId === room.id)
        .reduce((sum, b) => sum + (b.roomQuantity || 1), 0);
      
      const availableQuantity = room.quantity - bookedQuantity;
      availability[room.id] = {
        totalQuantity: room.quantity,
        bookedQuantity: bookedQuantity,
        available: Math.max(0, availableQuantity)
      };
    }

    res.json(availability);
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Internal server error during availability check' });
  }
});

// GET /api/availability/admin/:propertyId
// Returns a matrix of availability per room for a given date range
router.get('/admin/:propertyId', async (req, res) => {
  const { propertyId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    const pId = parseInt(propertyId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate array of dates
    const dateArray = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const rooms = await prisma.room.findMany({ where: { propertyId: pId } });
    
    // Find all bookings within the range
    const bookings = await prisma.booking.findMany({
      where: {
        propertyId: pId,
        status: { in: ['pending', 'confirmed'] },
        AND: [
          { checkIn: { lte: end } },
          { checkOut: { gte: start } }
        ]
      }
    });

    const matrix = [];

    for (const room of rooms) {
      const roomAvailability = {
        roomId: room.id,
        roomType: room.type,
        totalQuantity: room.quantity,
        dates: {}
      };

      for (const d of dateArray) {
        const dateStr = d.toISOString().split('T')[0];
        // For a specific date, a booking overlaps if checkIn <= d and checkOut > d
        // (Checkout day is not counted as occupied)
        const overlappingBookings = bookings.filter(b => {
          const bIn = new Date(b.checkIn).getTime();
          const bOut = new Date(b.checkOut).getTime();
          const dTime = d.getTime();
          return b.roomId === room.id && bIn <= dTime && bOut > dTime;
        });

        const booked = overlappingBookings.reduce((sum, b) => sum + (b.roomQuantity || 1), 0);
        roomAvailability.dates[dateStr] = {
          booked,
          available: Math.max(0, room.quantity - booked)
        };
      }
      matrix.push(roomAvailability);
    }

    res.json({ dates: dateArray.map(d => d.toISOString().split('T')[0]), matrix });
  } catch (error) {
    console.error('Admin availability check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/availability/check-bulk
// Returns available quantity for each room across multiple properties for given dates
router.post('/check-bulk', async (req, res) => {
  const { propertyIds, checkIn, checkOut } = req.body;

  if (!propertyIds || !Array.isArray(propertyIds) || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'Missing propertyIds array, checkIn, or checkOut parameters' });
  }

  try {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const pIds = propertyIds.map(id => parseInt(id));

    // Get all rooms for these properties
    const rooms = await prisma.room.findMany({
      where: { propertyId: { in: pIds } }
    });

    // Find all overlapping bookings for these properties
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        propertyId: { in: pIds },
        status: { in: ['pending', 'confirmed'] },
        AND: [
          { checkIn: { lt: outDate } },
          { checkOut: { gt: inDate } }
        ]
      }
    });

    // Calculate availability per property and room
    const availabilityMap = {}; // { propertyId: { roomId: { total, booked, available } } }
    
    for (const room of rooms) {
      const pId = room.propertyId;
      if (!availabilityMap[pId]) {
        availabilityMap[pId] = {};
      }

      const bookedQuantity = overlappingBookings
        .filter(b => b.roomId === room.id)
        .reduce((sum, b) => sum + (b.roomQuantity || 1), 0);
      
      const availableQuantity = room.quantity - bookedQuantity;
      availabilityMap[pId][room.id] = {
        totalQuantity: room.quantity,
        bookedQuantity: bookedQuantity,
        available: Math.max(0, availableQuantity)
      };
    }

    res.json(availabilityMap);
  } catch (error) {
    console.error('Bulk availability check error:', error);
    res.status(500).json({ error: 'Internal server error during bulk availability check' });
  }
});

module.exports = router;
