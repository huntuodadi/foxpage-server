import 'reflect-metadata';

import crypto from 'crypto';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AddUserResData } from '../../types/user-types';
import { AddUserRes, UpdateUserPassword } from '../../types/validates/user-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('users')
export class AddUsers extends BaseController {
  constructor() {
    super();
  }

  /**
   * User modify password
   * @param  {AddUserReq} params
   * @returns {AddUserResData}
   */
  @Put('/password')
  @OpenAPI({
    summary: i18n.sw.changeUserPassword,
    description: '',
    tags: ['User'],
    operationId: 'update-user-password',
  })
  @ResponseSchema(AddUserRes)
  async index(@Body() params: UpdateUserPassword): Promise<ResData<AddUserResData>> {
    try {
      // Check permissions
      const userInfo = this.service.userSingleton.getInstance().getCurrentUserBase();

      if (userInfo.id !== params.id) {
        return Response.warning(i18n.user.canNotChangeCurrentPwd);
      }

      // Check the validity of the original password
      const validOldPwd = await this.service.user.checkLogin({
        account: userInfo.account,
        password: params.oldPassword,
      });

      if (!validOldPwd) {
        return Response.warning(i18n.user.invalidOldPwd);
      }

      // 更新密码
      await this.service.user.updateDetail(params.id, {
        password: crypto
          .createHash('md5')
          .update(params.newPassword)
          .digest('hex'),
      });

      return Response.success(i18n.user.pwdChangeSuccess);
    } catch (err) {
      return Response.error(err, i18n.user.pwdChangeFailed);
    }
  }
}
