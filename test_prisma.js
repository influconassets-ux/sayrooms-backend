require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const newBooking = await prisma.booking.create({
      data: {
        propertyId: null,
        propertyName: 'Test Package',
        roomId: null,
        roomQuantity: 1,
        adults: 2,
        children: 0,
        customerName: 'Test',
        customerEmail: 'test',
        customerPhone: 'test',
        checkIn: new Date(),
        checkOut: new Date(),
        totalPrice: 100,
        bookingType: 'package'
      }
    });
    console.log("Success:", newBooking);
  } catch (e) {
    console.error("Prisma Error:", e);
  }
}

main().finally(() => prisma.$disconnect());
