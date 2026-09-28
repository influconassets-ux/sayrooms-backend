const express = require('express');
const router = express.Router();
const ContactQuery = require('../models/ContactQuery');

// Submit query (Public)
router.post('/', async (req, res) => {
  try {
    const newQuery = new ContactQuery(req.body);
    await newQuery.save();
    res.status(201).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin get all queries
router.get('/', async (req, res) => {
  try {
    const queries = await ContactQuery.find().sort({ createdAt: -1 });
    res.status(200).json(queries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin update query status
router.put('/:id/status', async (req, res) => {
  try {
    const query = await ContactQuery.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { returnDocument: 'after' }
    );
    res.status(200).json(query);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin delete query
router.delete('/:id', async (req, res) => {
  try {
    await ContactQuery.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Query deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
