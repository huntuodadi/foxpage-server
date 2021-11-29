import 'reflect-metadata';

import { UserRegisterType } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AddUserResData } from '../../types/user-types';
import { AddUserReq, AddUserRes } from '../../types/validates/user-validate-types';
import * as Response from '../../utils/response';
import { randStr } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('users')
export class AddUsers extends BaseController {
  constructor() {
    super();
  }

  /**
   * The administrator manually creates a new user
   * @param  {AddUserReq} params
   * @returns {AddUserResData}
   */
  @Post('/new')
  @OpenAPI({
    summary: i18n.sw.addNewUser,
    description: '',
    tags: ['User'],
    operationId: 'add-new-user',
  })
  @ResponseSchema(AddUserRes)
  async index(@Body() params: AddUserReq): Promise<ResData<AddUserResData>> {
    try {
      // Check if the username already exists
      const userDetail = await this.service.user.getUserDetailByAccount(params.account);
      if (userDetail && userDetail.account) {
        return Response.warning(i18n.user.exist);
      }

      const newUserParams = {
        account: params.account,
        email: params.email,
        password: randStr(10),
        registerType: 1 as UserRegisterType,
        changePwdStatus: true,
      };
      const userId = this.service.user.addNewUser(newUserParams);
      this.service.org.addNewMembers(params.organizationId, [userId]);

      await this.service.org.runTransaction();

      return Response.success({
        account: params.account,
        email: params.email,
        password: newUserParams.password,
      });
    } catch (err) {
      return Response.error(err, i18n.user.loginFailed);
    }
  }
}
