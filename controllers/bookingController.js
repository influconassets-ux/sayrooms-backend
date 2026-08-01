const admin = require('../firebaseAdmin');
const prisma = require('../prismaClient');

exports.createBooking = async (req, res) => {
  try {
    console.log('CREATE BOOKING PAYLOAD:', req.body);
    const { propertyId, propertyName, roomId, roomQuantity, adults, children, customerName, customerEmail, customerPhone, checkIn, checkOut, totalPrice, bookingType, packageDetails } = req.body;
    
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

    const data = {
      propertyId: propertyId ? parseInt(propertyId) : null,
      propertyName,
      roomId: roomId ? parseInt(roomId) : null,
      roomQuantity: roomQuantity ? parseInt(roomQuantity) : 1,
      adults: adults ? parseInt(adults) : 2,
      children: children ? parseInt(children) : 0,
      customerName,
      customerEmail,
      customerPhone,
      checkIn: inDate,
      checkOut: outDate,
      totalPrice: parseFloat(totalPrice),
      bookingType: bookingType || 'property'
    };
    
    if (packageDetails) {
      data.packageDetails = packageDetails;
    }

    const newBooking = await prisma.booking.create({ data });

    res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'An unexpected error occurred while processing your booking. Please try again later.' });
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
    res.status(500).json({ error: 'Failed to fetch bookings. Please try again later.' });
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
    res.status(500).json({ error: 'Failed to delete booking. Please try again later.' });
  }
};

exports.deleteAllBookings = async (req, res) => {
  try {
    await prisma.booking.deleteMany({});
    res.status(200).json({ message: 'All bookings deleted successfully' });
  } catch (error) {
    console.error('Error deleting all bookings:', error);
    res.status(500).json({ error: 'Failed to delete all bookings. Please try again later.' });
  }
};
