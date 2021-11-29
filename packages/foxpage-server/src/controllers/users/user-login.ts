import 'reflect-metadata';

import { UsersLoginReq, UsersLoginRes } from '@foxpage/foxpage-server-types';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { LoginReq, LoginRes } from '../../types/validates/user-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('users')
export class UserLogin extends BaseController {
  constructor() {
    super();
  }

  /**
   * User account login
   * @param  {LoginReq} params
   * @returns {LoginResData}
   */
  @Post('/login')
  @OpenAPI({
    summary: i18n.sw.userLogin,
    description: '',
    tags: ['User'],
    operationId: 'user-login',
  })
  @ResponseSchema(LoginRes)
  async index(@Body() params: LoginReq): Promise<ResData<UsersLoginRes>> {
    try {
      // Decrypt password
      const userLoginInfo: UsersLoginReq = {
        account: params.account,
        password: params.password,
      };

      // Check the validity of login information
      const loginStatus = await this.service.user.checkLogin(userLoginInfo);

      // Login failed
      if (!loginStatus) {
        return Response.warning(i18n.user.namePwdError);
      }

      // 获取用户基础信息, 用户所属组织信息
      const userInfo = await this.service.user.getUserDetailByAccount(params.account);
      const userOrgInfo = await this.service.org.getUserOrgById(userInfo.id || '');

      // Create token
      const privateKey = fs.readFileSync('./config/keys/private-key.pem');
      const token: string = jwt.sign(
        {
          id: userInfo.id,
          account: userInfo.account,
        },
        privateKey,
        { expiresIn: 86400 * 100, algorithm: 'RS256' },
      );

      return Response.success({
        userInfo: Object.assign(
          { organizationId: userOrgInfo.id || '' },
          _.pick(userInfo, ['id', 'account', 'email', 'nickName', 'changePwdStatus']),
        ),
        token,
      });
    } catch (err) {
      return Response.error(err, i18n.user.loginFailed);
    }
  }
}
