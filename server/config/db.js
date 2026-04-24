const { Pool } = require("pg");
require("dotenv").config();

// This creates a "Pool" of connections to your Postgres DB
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Export the query function to be used in other files
module.exports = {
  query: (text, params) => pool.query(text, params),
};
