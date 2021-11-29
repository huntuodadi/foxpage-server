import { createLogger } from '@foxpage/foxpage-shared';
import _ from 'lodash';
import { KoaMiddlewareInterface, Middleware } from 'routing-controllers';

import { i18n } from '../../app.config';
import { LOGGER_LEVEL, RESPONSE_LEVEL } from '../../config/constant';
import * as Service from '../services';

const logger = createLogger('module mark');

@Middleware({ type: 'before' })
export class LoggerMiddleware implements KoaMiddlewareInterface {
  async use(ctx: any, next: (err?: any) => Promise<any>): Promise<any> {
    const logInstance = Service.logSingleton.getInstance(true);
    ctx.response.log = {
      requestTime: new Date().getTime(),
    };

    try {
      await next();
    } catch (err) {
      console.log(err);
      const error = err as any;
      // Return wrong result
      console.log('from log middleware: ' + error.message);

      if (error.httpCode === RESPONSE_LEVEL.ACCESS_DENY) {
        ctx.body = {
          code: RESPONSE_LEVEL.ACCESS_DENY,
          msg: i18n.system.accessDeny,
        };
      } else {
        ctx.body = {
          code: RESPONSE_LEVEL.WARNING,
          msg: error.message,
          err: error.errors || {},
        };
      }
    } finally {
      if (!ctx.body) {
        ctx.response.status = RESPONSE_LEVEL.NOT_FOUND;
        ctx.body = { code: RESPONSE_LEVEL.NOT_FOUND, msg: 'API Not Found' };
      }

      // Save logs
      ctx.response.log.responseTime = new Date().getTime();
      ctx.response.log.tooks = ctx.response.log.responseTime - ctx.response.log.requestTime;
      ctx.response.log.request = _.pick(ctx.request, ['method', 'path', 'query', 'body']);
      ctx.response.log.response = ctx.body;

      // Save log to db
      if (ctx.request.url !== '/healthcheck') {
        ctx.body.code === RESPONSE_LEVEL.SUCCESS && logInstance.saveChangeLogs();
        logInstance.saveRequest({ content: ctx.response.log });
      }

      // Print request information to the console
      const logLevel: number =
        ctx.body.code === RESPONSE_LEVEL.SUCCESS
          ? LOGGER_LEVEL.INFO
          : ctx.body.code < RESPONSE_LEVEL.ERROR
          ? LOGGER_LEVEL.WARN
          : LOGGER_LEVEL.ERROR;
      logger.log(logLevel, ctx.body.msg || '', [
        ctx.request.method,
        ctx.request.path,
        ctx.body.code || 0,
        ctx.response.log.tooks + 'ms',
      ]);
    }
  }
}
