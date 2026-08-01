require('dotenv').config();
const prisma = require('./prismaClient');
prisma.booking.findUnique({ where: { id: 23 } })
  .then(b => { console.log(b); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
