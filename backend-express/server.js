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

// Bootstrap database and Redis connections
async function bootstrap() {
  try {
    // 1. Test database connection
    await db.query('SELECT NOW()');
    console.log('Database connected successfully');

    // 2. Connect to Redis (optional/warning on failure, doesn't crash the server)
    await connectRedis();

    // 3. Setup application router
    setupRouter(app);

    // 4. Start listening
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server starting on port ${PORT}`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

bootstrap();
