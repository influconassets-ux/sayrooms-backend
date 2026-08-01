require('dotenv').config();
const prisma = require('./prismaClient');
async function test() {
  const bookings = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' }});
  console.log('Bookings array first item:', bookings[0]);
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
