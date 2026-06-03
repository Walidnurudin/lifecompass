require('dotenv').config();

const config = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || '5432',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'postgres',
  dbName: process.env.DB_NAME || 'lifecompass',
  dbSSLMode: process.env.DB_SSLMODE || 'require',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
  port: process.env.PORT || '8080',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0'
};

module.exports = config;
