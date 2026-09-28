const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Create a new partner registration (Frontend form submission)
router.post('/', async (req, res) => {
  try {
    const { businessName, businessType, contactPerson, phone, email, location, details } = req.body;
    
    const newPartner = await prisma.partnerRegistration.create({
      data: {
        businessName,
        businessType,
        contactPerson,
        phone,
        email,
        location,
        details
      }
    });
    
    res.status(201).json(newPartner);
  } catch (error) {
    console.error("Error creating partner registration:", error);
    res.status(500).json({ error: "Failed to submit registration" });
  }
});

// Get all partner registrations (For Admin Panel)
router.get('/', async (req, res) => {
  try {
    const partners = await prisma.partnerRegistration.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.status(200).json(partners);
  } catch (error) {
    console.error("Error fetching partner registrations:", error);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// Update partner registration status (For Admin Panel)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedPartner = await prisma.partnerRegistration.update({
      where: { id: parseInt(id) },
      data: { status }
    });
    
    res.status(200).json(updatedPartner);
  } catch (error) {
    console.error("Error updating partner status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Delete partner registration (For Admin Panel)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.partnerRegistration.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(200).json({ message: "Registration deleted successfully" });
  } catch (error) {
    console.error("Error deleting partner registration:", error);
    res.status(500).json({ error: "Failed to delete registration" });
  }
});

module.exports = router;
