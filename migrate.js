const { Client } = require('pg');

const sourceUrl = 'postgresql://postgres:oAmVWTBzfMXgFctnEHSPETOjTNDWjWDM@reseau.proxy.rlwy.net:55454/railway';
const targetUrl = 'postgresql://postgres.yxiicrxjgritdiojalcr:Influcon@369@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function migrate() {
  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });

  try {
    console.log("Connecting to databases...");
    await source.connect();
    await target.connect();
    console.log("Connected!");

    const tables = [
      '"Property"', 
      '"Room"', 
      '"NearbyPlace"', 
      '"Booking"', 
      '"DraftProperty"'
    ];

    for (const table of tables) {
      console.log(`\nMigrating table: ${table}`);
      
      const { rows, fields } = await source.query(`SELECT * FROM ${table}`);
      console.log(`Found ${rows.length} rows.`);

      if (rows.length === 0) continue;

      const columns = fields.map(f => `"${f.name}"`).join(', ');
      
      for (const row of rows) {
        const values = fields.map(f => {
          let val = row[f.name];
          if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
             // Stringify json objects/arrays
             return JSON.stringify(val);
          }
          return val;
        });
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        
        try {
          await target.query(`
            INSERT INTO ${table} (${columns})
            VALUES (${placeholders})
            ON CONFLICT ("id") DO UPDATE SET 
            ${fields.filter(f => f.name !== 'id').map((f, i) => `"${f.name}" = EXCLUDED."${f.name}"`).join(', ')}
          `, values);
        } catch (e) {
          console.error(`Error inserting row in ${table}:`, e.message);
        }
      }
      
      const rawTableName = table.replace(/"/g, '');
      try {
        await target.query(`SELECT setval('"${rawTableName}_id_seq"', (SELECT MAX(id) FROM ${table}) + 1);`);
        console.log(`Sequence updated for ${table}`);
      } catch(e) {}
      
      console.log(`Migrated ${table} successfully!`);
    }

    console.log("\nMigration completed!");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await source.end();
    await target.end();
  }
}

migrate();
