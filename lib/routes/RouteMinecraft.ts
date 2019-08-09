import { Server, RouteBase } from '../internals';
import * as RouteName from '../types/RouteName';

export class RouteMinecraft extends RouteBase {
  constructor (ctx: Server) {
    super(ctx, RouteName['RouteMinecraft']);
  }
}
