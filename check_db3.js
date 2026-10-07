const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.booking.findUnique({ where: { id: 143 } })
  .then(b => console.log(JSON.stringify(b, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
