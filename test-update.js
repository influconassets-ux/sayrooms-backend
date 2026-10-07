const prisma = require('./prismaClient');
async function test() {
  try {
    const existingProperty = await prisma.property.findFirst({ include: { rooms: true } });
    if (!existingProperty) return console.log("No property");

    console.log("Updating property ID", existingProperty.id);
    
    await prisma.property.update({
      where: { id: existingProperty.id },
      data: {
        rooms: {
          deleteMany: {},
          create: existingProperty.rooms.map(room => ({
            type: room.type,
            quantity: room.quantity,
            price: room.price,
            capacity: room.capacity,
            mealPlans: room.mealPlans
          }))
        }
      }
    });
    console.log("Success");
  } catch(e) {
    console.error("Error updating property:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
