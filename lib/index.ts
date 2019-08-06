import http from 'http';
import url from 'url';

import Logger from './logger';
import { instance as config } from './config';

interface IContent {
  m: Array<string>;
}

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
  
  const port = config.get('serverPort');
  const maxQueueSize = config.get('maxQueueSize');
  const maxConcurrentTransferCount = config.get('maxConcurrentTransferCount');
  let kQueue: Array<string> = [];
  let mQueue: Array<string> = [];
  

  const callback: http.RequestListener = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
    const mUrl = new url.URL(req.url || '/', 'http://localhost');
    const paths = mUrl.pathname.replace(/^\/|\/+$/g, '').split('/');
    if (paths[0] === 'k') {           // KakaoTalk Bot
      if (paths[1] === 'u') {         // getUpdate
        if (kQueue.length === 0) {
          res.statusCode = 204;
          res.end();
          return;
        }

        const content: IContent = { m: [] };

        if (kQueue.length > maxConcurrentTransferCount) {
          content.m = kQueue.splice(0, maxConcurrentTransferCount);
        } else {
          content.m = kQueue;
          kQueue = [];
        }

        let payload: string = '';
        try {
          payload = JSON.stringify(content);
        } catch (err) {
          logger.error('업데이트 내역 전송 stringify 에러:', err);
          res.statusCode = 500;
          res.end();
          return;
        }

        res.statusCode == 200;
        res.write(payload);
        res.end();
      } else if (paths[1] === 'm') {  // sendMessage
        if (('' + req.method).toUpperCase() !== 'POST') {
          res.statusCode = 400;
          res.statusMessage = 'Wrong method';
          res.end();
          return;
        }

        return new Promise((resolve, reject) => {
          let content: string = '';
          req.on('data', chunk => {
            content += chunk;
          });
  
          req.on('end', () => {
            try {
              const data = JSON.parse(content);
              if (!data || !data.m || data.m.length === 0) {
                logger.warn('카카오톡 봇이 잘못된 요청을 보냄');
                return reject();
              }
              mQueue = mQueue.concat(data.m);
              for (var v of data.m) logger.k2m(v);
              if (mQueue.length > maxQueueSize) {
                logger.warn(`메시지 큐 길이가 초과하여 ${ mQueue.length - maxQueueSize }개의 메시지가 삭제됨`);
                mQueue.splice(0, mQueue.length - maxQueueSize);
              }
            } catch (err) {
              logger.error('카카오톡 봇의 응답 분석중 오류 발생:', err);
              reject();
            }
            resolve();
          });
  
          req.on('error', err => {
            logger.error('소켓 오류 발생:', err);
            reject();
          });
        }).then(() => {
          res.statusCode = 200;
          res.end();
        }).catch(err => {
          if (err) {
            logger.error('처리되지 않은 오류 발생:', err);
            res.statusCode = 500;
            res.end();
          } else {
            res.statusCode = 400;
            res.statusMessage = 'Wrong request';
            res.end();
          }
        });
      } else if (paths[1] === 'c') {  // connection
        logger.connect(`카카오톡 봇과 연결됨: ${ req.connection.remoteAddress }`);
        res.statusCode = 200;
        res.end();
        return;
      }
    } else if (paths[0] === 'm') {    // Minecraft Mod
      if (paths[1] === 'u') {         // getUpdate
        if (mQueue.length === 0) {
          res.statusCode = 204;
          res.end();
          return;
        }

        const content: IContent = { m: [] };

        if (mQueue.length > maxConcurrentTransferCount) {
          content.m = mQueue.splice(0, maxConcurrentTransferCount);
        } else {
          content.m = mQueue;
          mQueue = [];
        }

        let payload: string = '';
        try {
          payload = JSON.stringify(content);
        } catch (err) {
          logger.error('업데이트 내역 전송 stringify 에러:', err);
          res.statusCode = 500;
          res.end();
          return;
        }

        res.statusCode == 200;
        res.write(payload);
        res.end();
      } else if (paths[1] === 'm') {  // sendMessage
        if (('' + req.method).toUpperCase() !== 'POST') {
          res.statusCode = 400;
          res.statusMessage = 'Wrong method';
          res.end();
          return;
        }

        return new Promise((resolve, reject) => {
          let content: string = '';
          req.on('data', chunk => {
            content += chunk;
          });
  
          req.on('end', () => {
            try {
              const data = JSON.parse(content);
              if (!data || !data.m || data.m.length === 0) {
                logger.warn('마인크래프트 모드가 잘못된 요청을 보냄');
                return reject();
              }
              kQueue = kQueue.concat(data.m);
              for (var v of data.m) logger.m2k(v);
              if (kQueue.length > maxQueueSize) {
                logger.warn(`메시지 큐 길이가 초과하여 ${ kQueue.length - maxQueueSize }개의 메시지가 삭제됨`);
                kQueue.splice(0, kQueue.length - maxQueueSize);
              }
            } catch (err) {
              logger.error('마인크래프트 모드의 응답 분석중 오류 발생:', err);
              reject();
            }
            resolve();
          });
  
          req.on('error', err => {
            logger.error('소켓 오류 발생:', err);
            reject();
          });
        }).then(() => {
          res.statusCode = 200;
          res.end();
        }).catch(err => {
          if (err) {
            logger.error('처리되지 않은 오류 발생:', err);
            res.statusCode = 500;
            res.end();
          } else {
            res.statusCode = 400;
            res.statusMessage = 'Wrong request';
            res.end();
          }
        });
      } else if (paths[1] === 'c') {  // connection
        logger.connect(`마인크래프트 모드와 연결됨: ${ req.connection.remoteAddress }`);
        res.statusCode = 200;
        res.end();
        return;
      }
    }
    res.statusCode = 400;
    res.statusMessage = 'Unknown request';
    res.end();
  };
  const server: http.Server = http.createServer(callback);
  server.on('listening', () => {
    logger.running(`서버가 ${ port }포트에서 시작되었습니다. 카카오톡 봇과 마인크래프트 모드 연결 대기중...`);
  });
  server.listen(port);
})();
