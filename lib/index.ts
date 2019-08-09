import Logger from './logger';
import { instance as config } from './config';
import { Server } from './internals';

;(async () => {
  const logger = Logger
  logger.bind(global);

  try {
    logger.info('설정파일 읽는중...');
    await config.init();
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  const server = new Server(logger);
  server.start();
})();
