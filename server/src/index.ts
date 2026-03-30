import './env';
import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './socket';
import { db } from './db';
import { config } from './config';
import { logger } from './utils/logger';
import { authService } from './services/auth.service';
import { setLiveAlertIO } from './services/liveAlert.service';
import { obligateService } from './services/obligate.service';

async function main() {
  // 1. Run pending migrations
  logger.info('Running database migrations...');
  await db.migrate.latest();
  logger.info('Migrations complete');

  // 2. Ensure default admin user exists
  await authService.ensureDefaultAdmin(
    config.defaultAdminUsername,
    config.defaultAdminPassword,
  );

  // 3. Create Express app
  const app = createApp();

  // 4. Create HTTP server
  const server = http.createServer(app);

  // 5. Attach Socket.io
  const io = createSocketServer(server);

  // Store io instance for later use
  app.set('io', io);

  // Provide io to live alert service for real-time notification delivery
  setLiveAlertIO(io);

  // 6. Listen
  server.listen(config.port, () => {
    logger.info(`Oblifield server listening on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);

    // Sync capability schemas with Obligate (non-blocking)
    obligateService.syncCapabilitySchemas().catch(() => {});
  });

  // 7. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close();
    await db.destroy();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal(err, 'Failed to start server');
  process.exit(1);
});
