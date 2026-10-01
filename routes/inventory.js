const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// GET /api/inventory/calendar?roomId=...&month=...&year=...
router.get('/calendar', inventoryController.getInventoryCalendar);

// POST /api/inventory/update-day
router.post('/update-day', inventoryController.updateInventoryDay);

module.exports = router;
