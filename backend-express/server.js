const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const db = require('./database/db');
const { connectRedis } = require('./database/redis');
const { setupRouter } = require('./routes/routes');

const app = express();

// Standard parsers
app.use(express.json());
app.use(cookieParser());

// Setup application router synchronously (critical for Vercel/serverless)
setupRouter(app);

// Connect to Redis in the background (caching)
connectRedis();

// Only start the listening server when run directly (local development)
if (require.main === module || !process.env.VERCEL) {
  const PORT = config.port || 8080;
  app.listen(PORT, () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

module.exports = app;
