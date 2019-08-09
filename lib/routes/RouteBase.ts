import { IncomingMessage, ServerResponse } from 'http';

import { ISendMessage } from '../types/Message';
import { instance as config } from '../config';
import { Server } from '../internals';
import { URL } from 'url';

export abstract class RouteBase {
  readonly MAX_QUEUE_SIZE: number;
  readonly MAX_CONCURRENT_TRANSFER_COUNT: number;
  readonly NAME: string;

  ctx: Server;
  logger: any;
  sendQueue: Array<string> = [];
  targetRoute?: RouteBase;

  constructor (ctx: Server, name: string) {
    this.NAME = name;
    this.MAX_QUEUE_SIZE = config.get('maxQueueSize');
    this.MAX_CONCURRENT_TRANSFER_COUNT = config.get('maxConcurrentTransferCount');

    this.ctx = ctx;
    this.logger = ctx.logger;
  }

  setTargetRoute(route :RouteBase) {
    this.targetRoute = route;
  }

  sendMessage (msgs: Array<string>): void {
    this.sendQueue = this.sendQueue.concat(msgs);
    if (this.sendQueue.length > this.MAX_QUEUE_SIZE) {
      this.logger.warn(`${ this.NAME } 메시지 큐 길이가 초과하여 ${
        this.sendQueue.length - this.MAX_QUEUE_SIZE }개의 메시지가 삭제됨`);
      this.sendQueue.splice(0, this.sendQueue.length - this.MAX_QUEUE_SIZE);
    }
  }

  async middleware (req: IncomingMessage, res: ServerResponse, paths: Array<string>, url: URL)
    : Promise<void> {

    if (this.targetRoute == null) {
      throw new Error('targetRoute not setted');
    }
    const targetRoute: RouteBase = this.targetRoute;

    if (paths[1] === 'c') {                 // connection
      this.logger.connect(`${ this.NAME } 연결됨: ${ req.connection.remoteAddress }`);
      res.statusCode = 200;
      res.end();
      return;
    } else if (paths[1] === 'u') {          // getUpdate
      // Response blank if queue has no content
      if (this.sendQueue.length === 0) {
        res.statusCode = 204;
        res.end();
        return;
      }

      // Prepare payload
      const content: ISendMessage = { m: [] };

      if (this.sendQueue.length > this.MAX_CONCURRENT_TRANSFER_COUNT) {
        content.m = this.sendQueue.splice(0, this.MAX_CONCURRENT_TRANSFER_COUNT);
      } else {
        content.m = this.sendQueue;
        this.sendQueue = [];
      }

      let payload: string = '';
      try {
        payload = JSON.stringify(content);
      } catch (err) {
        this.logger.error('업데이트 내역 전송 stringify 에러:', err);
        res.statusCode = 500;
        res.write('ERR_QUEUE_STRINGIFY');
        res.end();
        return;
      }

      // Send payload
      res.statusCode == 200;
      res.setHeader('Content-Type', 'application/json');
      res.write(payload);
      res.end();
    } else if (paths[1] === 'm') {          // sendMessage
      // MinecraftMod can send POST message but KakaoBot can't
      if (('' + req.method).toUpperCase() === 'POST') {
        new Promise((resolve, reject) => {

          let content: string = '';
          req.on('data', chunk => {
            content += chunk;
          });
  
          req.on('end', () => {
            try {
              const data = JSON.parse(content);
              if (!data || !data.m || !data.m.length) {
                this.logger.warn(`${ this.NAME } 잘못된 요청을 보냄`);
                res.statusCode = 400;
                res.write('ERR_WRONG_REQUEST');
                res.end();
                return reject();
              }
              
              // Send messages to target route
              for (let msg of data.m) {
                this.logger[this.NAME](msg);
              }
              targetRoute.sendMessage(data.m);
            } catch (err) {
              this.logger.error(`${ this.NAME } 응답 JSON 파싱중 오류 발생:`, err);
              res.statusCode = 400;
              res.write('ERR_WRONG_JSON');
              res.end();
              return reject();
            }
            resolve();
          });
  
          req.on('error', err => {
            this.logger.error('소켓 오류 발생');
            reject(err);
          });
        }).then(() => {
          res.statusCode = 200;
          res.write('SUCCESS');
          res.end();
        }).catch(err => {
          if (err) {
            this.logger.error('처리되지 않은 오류 발생:', err);
            res.statusCode = 500;
            res.write('ERR_UNEXPECTED');
            res.end();
          }
        });
      // Plain query request
      } else {
        try {
          const content: string|null = url.searchParams.get('v');
          let data: ISendMessage|null = null;
          try {
            if (content == null) throw new Error('빈 요청');
            data = JSON.parse(content);
          } catch (err) {
            this.logger.error(`${ this.NAME } 응답 JSON 파싱중 오류 발생:`, err);
            res.statusCode = 400;
            res.write('ERR_WRONG_JSON');
            res.end();
            return;
          }

          if (!data || !data.m || data.m.length === 0) {
            this.logger.warn(`${ this.NAME } 잘못된 요청을 보냄`);
            res.statusCode = 400;
            res.write('ERR_WRONG_REQUEST');
            res.end();
            return;
          }

          // Send messages to target route
          this.sendMessage(data.m);
        } catch (err) {
          this.logger.error('처리되지 않은 오류 발생:', err);
          res.statusCode = 500;
          res.write('ERR_UNEXPECTED');
          res.end();
        }
      }
    }
  }
}
