require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const client = await pool.connect();
    
    // Create the table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "partner_registration" (
        "id" SERIAL PRIMARY KEY,
        "businessName" TEXT NOT NULL,
        "businessType" TEXT NOT NULL,
        "contactPerson" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "location" TEXT NOT NULL,
        "details" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'pending'
      );
    `;
    
    await client.query(createTableQuery);
    console.log('partner_registration table created successfully!');
    
    client.release();
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await pool.end();
  }
}

main();
