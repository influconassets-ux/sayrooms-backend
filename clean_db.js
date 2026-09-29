require('dotenv').config();
const prisma = require('./prismaClient');

async function clean() {
  try {
    const p = await prisma.property.findUnique({ where: { id: 24 } });
    if (p && p.rooms) {
      let changed = false;
      p.rooms.forEach(r => {
        if (r.images) {
          const origLen = r.images.length;
          r.images = r.images.filter(img => typeof img === 'string' && !img.includes('blob:'));
          if (r.images.length !== origLen) changed = true;
        }
      });
      if (changed) {
        await prisma.property.update({
          where: { id: 24 },
          data: { rooms: p.rooms }
        });
        console.log('Cleaned Property 24!');
      } else {
        console.log('No blob URLs found in Property 24');
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
clean();
