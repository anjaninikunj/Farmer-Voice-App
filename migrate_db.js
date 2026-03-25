require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  console.log('--- Starting Database Migration ---');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // We append a DROP statement to ensure we start fresh
    const fullSql = `
      DROP TABLE IF EXISTS expenses CASCADE;
      DROP TABLE IF EXISTS seasons CASCADE;
      DROP TABLE IF EXISTS farms CASCADE;
      ${schemaSql}
    `;

    console.log('Executing SQL schema...');
    await pool.query(fullSql);
    console.log('Migration Successful! Database is now synchronized.');
  } catch (err) {
    console.error('Migration Failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
