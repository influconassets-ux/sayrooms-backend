const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Configure pool to handle idle timeouts to prevent "ConnectionClosed" errors
const pool = new Pool({ 
  connectionString,
  idleTimeoutMillis: 60000, // Close idle connections after 60 seconds
  connectionTimeoutMillis: 15000, // Wait 15 seconds for a connection
  max: 10 // Limit max connections for this instance
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
