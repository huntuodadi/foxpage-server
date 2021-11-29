import fs from 'fs';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import { KoaMiddlewareInterface, Middleware } from 'routing-controllers';

import { config, i18n } from '../../app.config';
import * as Service from '../services';

@Middleware({ type: 'before' })
export class TokenMiddleware implements KoaMiddlewareInterface {
  async use(ctx: any, next: (err?: any) => Promise<any>): Promise<any> {
    Service.transaction.getInstance(true);
    const appInstance = Service.appSingleton.getInstance(true);
    const userInstance = Service.userSingleton.getInstance(true);

    if (ctx.request.method === 'GET') {
      appInstance.setApplicationId(ctx.request?.query?.applicationId || '');
    } else {
      appInstance.setApplicationId(ctx.request?.body?.applicationId || '');
    }

    // No need to verify the interface of the token
    if (config.ignoreTokenPath.indexOf(ctx.request.path) === -1) {
      // Get request token
      const jwtToken: string = ctx.request.header?.token || '';

      // Parse the token
      let jwtTokenInfo: any = {};
      try {
        const publicKey = fs.readFileSync('./config/keys/public-key.pem');
        jwtTokenInfo = jwt.verify(jwtToken, publicKey, { algorithms: ['RS256'] });
      } catch (err) {
        jwtTokenInfo = {};
      }

      const currentTime: number = new Date().getTime();

      if (!jwtTokenInfo.account || currentTime > jwtTokenInfo.exp * 1000) {
        ctx.body = { code: 401, msg: i18n.system.invalidAccount };
      } else {
        // Add user information to ctx
        ctx.request.header.userInfo = _.pick(jwtTokenInfo, ['id', 'account']);
        ctx.response.log.user = jwtTokenInfo.account || '';
        // Set the currently requested user information
        userInstance.setCurrentUser(ctx.request.header.userInfo);
        await next();
      }
    } else {
      await next();
    }
  }
}
