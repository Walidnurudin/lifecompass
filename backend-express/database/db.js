const { Pool } = require('pg');
const config = require('../config/config');

const ssl = config.dbSSLMode === 'disable'
  ? false
  : { rejectUnauthorized: false };

const pool = new Pool({
  host: config.dbHost,
  port: parseInt(config.dbPort, 10),
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  ssl: ssl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle postgres client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
