const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// POST /api/bookings
router.post('/', bookingController.createBooking);

// GET /api/bookings
router.get('/', bookingController.getAllBookings);

// DELETE /api/bookings/:id
router.delete('/:id', bookingController.deleteBooking);

// DELETE /api/bookings
router.delete('/', bookingController.deleteAllBookings);

module.exports = router;
