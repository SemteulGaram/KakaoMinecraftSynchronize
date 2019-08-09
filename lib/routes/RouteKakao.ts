import { Server, RouteBase } from '../internals';
import * as RouteName from '../types/RouteName';

export class RouteKakao extends RouteBase {
  constructor (ctx: Server) {
    super(ctx, RouteName['RouteKakao']);
  }
}
