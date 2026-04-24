const { Pool } = require("pg");
require("dotenv").config();

// This creates a "Pool" of connections to your Postgres DB
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Export the query function to be used in other files
module.exports = {
  query: (text, params) => pool.query(text, params),
};
