const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  try {
    console.log("Adding columns to Room table...");
    await client.query('ALTER TABLE "Room" ADD COLUMN "extraAdultPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;');
    await client.query('ALTER TABLE "Room" ADD COLUMN "extraChildPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;');
    console.log("Success!");
  } catch (err) {
    if (err.code === '42701') {
      console.log("Columns already exist.");
    } else {
      console.error(err);
    }
  } finally {
    await client.end();
  }
}
main();
