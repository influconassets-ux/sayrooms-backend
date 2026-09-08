const admin = require('../firebaseAdmin');
const prisma = require('../prismaClient');
const axios = require('axios');
const crypto = require('crypto');
const { sendBookingConfirmationEmail } = require('../utils/emailService');
const { sendBookingConfirmationWhatsApp } = require('../utils/whatsappService');

// Cashfree Configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_URL = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' 
  ? 'https://api.cashfree.com/pg' 
  : 'https://sandbox.cashfree.com/pg';
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
      where: { paymentStatus: 'success' },
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

exports.createCashfreeOrder = async (req, res) => {
  try {
    const { propertyId, propertyName, roomId, roomQuantity, adults, children, customerName, customerEmail, customerPhone, checkIn, checkOut, totalPrice, bookingType, packageDetails } = req.body;
    
    // First, create a pending booking in the database
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    
    const bookingData = {
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
      bookingType: bookingType || 'property',
      status: 'pending',
      paymentStatus: 'pending'
    };

    if (packageDetails) {
      bookingData.packageDetails = packageDetails;
    }

    const newBooking = await prisma.booking.create({ data: bookingData });
    
    // Generate a unique order ID for Cashfree
    const orderId = `order_${newBooking.id}_${Date.now()}`;
    
    // Create Cashfree Order
    const requestData = {
      order_id: orderId,
      order_amount: parseFloat(totalPrice),
      order_currency: 'INR',
      customer_details: {
        customer_id: `cust_${newBooking.id}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone
      }
    };

    const headers = {
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await axios.post(`${CASHFREE_API_URL}/orders`, requestData, { headers });
    
    const paymentSessionId = response.data.payment_session_id;

    // Update booking with the cashfree order ID and session ID
    await prisma.booking.update({
      where: { id: newBooking.id },
      data: { cashfreeOrderId: orderId, paymentSessionId: paymentSessionId }
    });

    res.status(200).json({ 
      payment_session_id: paymentSessionId, 
      order_id: orderId,
      booking_id: newBooking.id
    });
  } catch (error) {
    console.error('Error creating Cashfree order:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate payment. Please try again.' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { order_id } = req.body;
    
    if (!order_id) return res.status(400).json({ error: 'Order ID is required' });

    const headers = {
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'x-api-version': '2023-08-01',
      'Accept': 'application/json'
    };

    const response = await axios.get(`${CASHFREE_API_URL}/orders/${order_id}`, { headers });
    const orderStatus = response.data.order_status;

    // Find the booking
    const booking = await prisma.booking.findFirst({
      where: { cashfreeOrderId: order_id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found for this order ID' });
    }

    if (orderStatus === 'PAID') {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { 
          status: 'confirmed', 
          paymentStatus: 'success' 
        }
      });

      // Send notifications asynchronously
      if (booking.customerEmail) {
        sendBookingConfirmationEmail(booking.customerEmail, booking.customerName, booking.id, booking.checkIn, booking.checkOut, booking.propertyName).catch(console.error);
      }
      if (booking.customerPhone) {
        sendBookingConfirmationWhatsApp(booking.customerPhone, booking.customerName, booking.id, booking.propertyName).catch(console.error);
      }

      res.status(200).json({ success: true, message: 'Payment verified and booking confirmed', status: 'PAID' });
    } else {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'failed' }
      });
      res.status(200).json({ success: false, message: 'Payment failed or pending', status: orderStatus });
    }
  } catch (error) {
    console.error('Error verifying payment:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to verify payment status' });
  }
};
