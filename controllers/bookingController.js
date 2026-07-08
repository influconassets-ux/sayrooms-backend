const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

exports.createBooking = async (req, res) => {
  try {
    const { propertyId, propertyName, roomId, roomQuantity, customerName, customerEmail, customerPhone, checkIn, checkOut, totalPrice } = req.body;
    
    // Convert dates
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    // Double check availability if roomId is provided
    if (propertyId && roomId) {
      const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) } });
      if (!room) return res.status(404).json({ error: 'Room not found' });

      const overlappingBookings = await prisma.booking.findMany({
        where: {
          roomId: parseInt(roomId),
          status: { in: ['pending', 'confirmed'] },
          AND: [
            { checkIn: { lt: outDate } },
            { checkOut: { gt: inDate } }
          ]
        }
      });

      const bookedQuantity = overlappingBookings.reduce((sum, b) => sum + (b.roomQuantity || 1), 0);
      const requestedQuantity = parseInt(roomQuantity) || 1;
      
      if (room.quantity - bookedQuantity < requestedQuantity) {
        return res.status(400).json({ error: 'Room is no longer available for the selected dates' });
      }
    }

    const newBooking = await prisma.booking.create({
      data: {
        propertyId: propertyId ? parseInt(propertyId) : null,
        propertyName,
        roomId: roomId ? parseInt(roomId) : null,
        roomQuantity: roomQuantity ? parseInt(roomQuantity) : 1,
        customerName,
        customerEmail,
        customerPhone,
        checkIn: inDate,
        checkOut: outDate,
        totalPrice: parseFloat(totalPrice)
      }
    });

    res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.booking.delete({
      where: { id: parseInt(id) }
    });
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
};

exports.deleteAllBookings = async (req, res) => {
  try {
    await prisma.booking.deleteMany({});
    res.status(200).json({ message: 'All bookings deleted successfully' });
  } catch (error) {
    console.error('Error deleting all bookings:', error);
    res.status(500).json({ error: 'Failed to delete all bookings' });
  }
};
