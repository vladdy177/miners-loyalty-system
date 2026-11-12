require("dotenv").config();
const { Pool } = require("pg");

// This creates a "Pool" of connections to local Postgres DB
const isProduction = process.env.NODE_ENV === 'production';

let pool;

if (isProduction) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: false
  });
}

pool.on('connect', (client) => {
  client.query("SET client_encoding = 'UTF8'");
});
// Export the query function for single statements, plus connect() to grab a
// dedicated client when a multi-statement transaction (BEGIN/COMMIT) is needed.
module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};