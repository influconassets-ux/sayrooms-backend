const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  try {
    const properties = await prisma.property.findMany();
    console.log('SUCCESS. IDs in DB:', properties.map(p => p.id));
  } catch (err) {
    console.error('Prisma error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
