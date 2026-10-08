import { APP_NAME, NODE_ENV, PORT } from '@/config/env';
import logger from '@/config/logger';
import app from './app';

const server = app.listen(PORT, () => {
  logger.info(`🚀 ${APP_NAME} running on http://localhost:${PORT}`);
  logger.info(`📚 Environment: ${NODE_ENV}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});