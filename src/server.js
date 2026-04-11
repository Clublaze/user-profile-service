import 'dotenv/config';
import app           from './app.js';
import connectDB     from './config/db.js';
import redis         from './config/redis.js';
import { getProducer, disconnectKafka } from './config/kafka.js';
import logger        from './utils/logger.js';
import env           from './config/env.js';

import { startAuthConsumer } from './messaging/consumers/auth.consumer.js';
import { startClubConsumer } from './messaging/consumers/club.consumer.js';

const startServer = async () => {
  try {
    // ── MongoDB ───────────────────────────────────────────────────────────────
    await connectDB();

    // ── Kafka producer ────────────────────────────────────────────────────────
    try {
      await getProducer();
    } catch (err) {
      logger.warn(`Kafka producer unavailable at startup: ${err.message}. Continuing without it.`);
    }

    // ── Kafka consumers ───────────────────────────────────────────────────────
    // auth.consumer — listens to user-events topic (auth-service)
    try {
      await startAuthConsumer();
    } catch (err) {
      logger.warn(`Auth consumer failed to start: ${err.message}. Continuing without it.`);
    }

    // club.consumer — listens to club-service topics (role.assigned, event.approved etc.)
    try {
      await startClubConsumer();
    } catch (err) {
      logger.warn(`Club consumer failed to start: ${err.message}. Continuing without it.`);
    }

    // ── Redis ─────────────────────────────────────────────────────────────────
    try {
      await redis.ping();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn(`Redis unavailable at startup: ${err.message}. Continuing without it.`);
    }

    // ── HTTP server ───────────────────────────────────────────────────────────
    const server = app.listen(env.port, () => {
      logger.info(`User Profile Service running on port ${env.port}`);
      logger.info(`Environment: ${env.nodeEnv}`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectKafka();
          logger.info('Kafka disconnected');
        } catch (err) {
          logger.error(`Kafka disconnect error: ${err.message}`);
        }

        try {
          await redis.quit();
          logger.info('Redis disconnected');
        } catch (err) {
          logger.error(`Redis disconnect error: ${err.message}`);
        }

        process.exit(0);
      });

      // Force kill after 10s if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled rejection: ${err.message}`);
      shutdown('unhandledRejection');
    });

  } catch (err) {
    logger.error(`Failed to start user-profile-service: ${err.message}`);
    process.exit(1);
  }
};

startServer();
