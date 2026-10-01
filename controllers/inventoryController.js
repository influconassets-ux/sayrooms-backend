const prisma = require('../prismaClient');

// Get calendar data for a room in a specific month
exports.getInventoryCalendar = async (req, res) => {
  try {
    const { roomId, month, year } = req.query;
    
    if (!roomId || !month || !year) {
      return res.status(400).json({ error: 'roomId, month, and year are required' });
    }

    const roomIdInt = parseInt(roomId);
    const monthInt = parseInt(month); // 1-12
    const yearInt = parseInt(year);

    const room = await prisma.room.findUnique({ where: { id: roomIdInt } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Start and end dates for the requested month
    // Note: monthInt is 1-indexed (1 = Jan). Date constructor uses 0-indexed months.
    const startDate = new Date(Date.UTC(yearInt, monthInt - 1, 1));
    const endDate = new Date(Date.UTC(yearInt, monthInt, 0, 23, 59, 59, 999));

    // Get overrides
    const inventories = await prisma.roomInventory.findMany({
      where: {
        roomId: roomIdInt,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const inventoryMap = {};
    inventories.forEach(inv => {
      // Create a string key like YYYY-MM-DD
      const dateKey = inv.date.toISOString().split('T')[0];
      inventoryMap[dateKey] = inv;
    });

    // Get overlapping bookings
    const bookings = await prisma.booking.findMany({
      where: {
        roomId: roomIdInt,
        status: { in: ['pending', 'confirmed'] },
        checkOut: { gt: startDate },
        checkIn: { lte: endDate }
      }
    });

    const calendar = [];
    const daysInMonth = endDate.getUTCDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(Date.UTC(yearInt, monthInt - 1, day));
      const dateKey = currentDayDate.toISOString().split('T')[0];

      // Determine price and allotted quantity
      let currentPrice = room.price;
      let allottedRooms = room.quantity;
      let isAvailable = true;

      const override = inventoryMap[dateKey];
      if (override) {
        if (override.price !== null) currentPrice = override.price;
        if (override.quantity !== null) allottedRooms = override.quantity;
        isAvailable = override.isAvailable;
      }

      // Calculate booked rooms for this specific day
      let bookedCount = 0;
      bookings.forEach(b => {
        const bIn = new Date(b.checkIn).getTime();
        const bOut = new Date(b.checkOut).getTime();
        const curTime = currentDayDate.getTime();
        
        // A booking overlaps this day if checkIn is <= current day AND checkOut > current day
        if (bIn <= curTime && bOut > curTime) {
          bookedCount += (b.roomQuantity || 1);
        }
      });

      let availableRooms = isAvailable ? (allottedRooms - bookedCount) : 0;
      if (availableRooms < 0) availableRooms = 0;

      calendar.push({
        date: dateKey,
        day: day,
        price: currentPrice,
        allotted: allottedRooms,
        booked: bookedCount,
        available: availableRooms,
        isManuallyBlocked: !isAvailable,
        hasOverride: !!override
      });
    }

    res.status(200).json({ room, calendar });
  } catch (error) {
    console.error('Error fetching inventory calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update inventory for a specific day
exports.updateInventoryDay = async (req, res) => {
  try {
    const { roomId, date, price, quantity, isAvailable } = req.body;
    
    if (!roomId || !date) {
      return res.status(400).json({ error: 'roomId and date are required' });
    }

    const roomIdInt = parseInt(roomId);
    const targetDate = new Date(date); // should be 'YYYY-MM-DD'
    
    // Normalize to UTC midnight
    const utcDate = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));

    const upsertData = {
      price: price !== undefined && price !== '' ? parseFloat(price) : null,
      quantity: quantity !== undefined && quantity !== '' ? parseInt(quantity) : null,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
    };

    const updated = await prisma.roomInventory.upsert({
      where: {
        roomId_date: {
          roomId: roomIdInt,
          date: utcDate
        }
      },
      update: upsertData,
      create: {
        roomId: roomIdInt,
        date: utcDate,
        ...upsertData
      }
    });

    res.status(200).json({ message: 'Inventory updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating inventory day:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
