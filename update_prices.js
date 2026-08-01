const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.room.updateMany({
    data: {
      extraAdultPrice: 1000,
      extraChildPrice: 500
    }
  });
  console.log("Updated rooms:", result.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
