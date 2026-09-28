const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// POST /api/bookings
router.post('/', bookingController.createBooking);

// POST /api/bookings/create-cashfree-order
router.post('/create-cashfree-order', bookingController.createCashfreeOrder);

// POST /api/bookings/verify-payment
router.post('/verify-payment', bookingController.verifyPayment);

// POST /api/bookings/webhook
router.post('/webhook', bookingController.cashfreeWebhook);

// GET /api/bookings/admin/all
router.get('/admin/all', bookingController.getAllAdminBookings);

// GET /api/bookings
router.get('/', bookingController.getAllBookings);

// DELETE /api/bookings/:id
router.delete('/:id', bookingController.deleteBooking);

// DELETE /api/bookings
router.delete('/', bookingController.deleteAllBookings);

module.exports = router;
