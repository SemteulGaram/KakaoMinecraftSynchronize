import  { Signale } from 'signale';
import * as RouteName from './types/RouteName';

const options: any = {
  types: {
    debug: {
      badge: '-',
      color: 'gray',
      label: 'Debug',
      logLevel: 'debug'
    },
    info: {
      badge: '*',
      color: 'cyan',
      label: 'Info',
      logLevel: 'info'
    },
    warn: {
      badge: '!',
      color: 'red',
      label: 'Warning',
      logLevel: 'warn'
    },
    error: {
      badge: '×',
      color: 'red',
      label: 'Error',
      logLevel: 'error'
    },
    running: {
      badge: '▶',
      color: 'blue',
      label: 'Running',
      logLevel: 'info'
    },
    connect: {
      badge: '■',
      color: 'blue',
      label: 'Connection',
      logLevel: 'info'
    },
    [RouteName['RouteKakao']]: {
      badge: '*',
      color: 'yellow',
      label: 'Kakao',
      logLevel: 'info'
    },
    [RouteName['RouteMinecraft']]: {
      badge: '*',
      color: 'green',
      label: 'Minecraft',
      logLevel: 'info'
    }
  }
};

const signale: any = new Signale(options);
const logger = {
  isDebug: false,

  // TODO: can't fix now :(
  // @ts-ignore
  bind({ isDebug: newDebugMode }) {
    this.isDebug = !!newDebugMode;
    return this;
  },

  _logger(...args: Array<any>) {
    if (!this.isDebug) return;
    signale._logger(...args);
  }
}

export default new Proxy(signale, {
  get: function(obj: any, prop: any): any {
    // @ts-ignore
    if (logger[prop]) return logger[prop];

    return obj[prop];
  }
})
