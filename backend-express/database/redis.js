const { createClient } = require('redis');
const config = require('../config/config');

let redisClient = null;

async function connectRedis() {
  if (!config.redisUrl) {
    console.log('No REDIS_URL configured. Caching will be disabled.');
    return null;
  }

  try {
    const client = createClient({
      url: config.redisUrl,
    });

    client.on('error', (err) => {
      // Log redis errors, but do not crash the app
      console.warn('Redis Client Error:', err.message);
    });

    await client.connect();
    console.log('Redis connected successfully');
    redisClient = client;
    return redisClient;
  } catch (err) {
    console.warn(`Warning: Failed to connect to Redis: ${err.message}. Caching will be disabled.`);
    redisClient = null;
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

module.exports = {
  connectRedis,
  getRedisClient,
};
