const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

router.get('/stats', async (req, res) => {
  try {
    const totalProperties = await prisma.property.count();
    const totalBookings = await prisma.booking.count();
    const totalDrafts = await prisma.draftProperty.count();
    
    const allBookings = await prisma.booking.findMany({
      select: { totalPrice: true, status: true }
    });
    
    // Calculate total revenue from confirmed bookings (or all if not strictly using status yet)
    // Looking at schema, default status is "pending". We'll sum all for now or just confirmed if available.
    const totalRevenue = allBookings
      .filter(b => b.status === 'confirmed' || b.status === 'pending') // Usually we count confirmed, but pending can also be expected revenue
      .reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);

    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      totalProperties,
      totalBookings,
      totalDrafts,
      totalRevenue,
      recentBookings
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
