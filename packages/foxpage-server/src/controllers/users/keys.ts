import 'reflect-metadata';

import { publicEncrypt } from 'crypto';
import fs from 'fs';
import { Get, JsonController } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { LoginKeyRes } from '../../types/validates/user-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('user')
export class GetRegisterPublicKey extends BaseController {
  constructor() {
    super();
  }

  /**
   * Obtain the password encryption public key when logging in and registering
   * @param params
   */
  @Get('/key')
  @OpenAPI({
    summary: i18n.sw.userLoginKey,
    description: '',
    tags: ['User'],
    operationId: 'user-login-key',
  })
  @ResponseSchema(LoginKeyRes)
  async index(): Promise<ResData<{ key: string }>> {
    try {
      const keyString: string = fs.readFileSync('config/crypto-key.json', 'utf8').toString();
      const cryptokey: { publicKey: string; privateKey: string } = JSON.parse(keyString);

      console.log(publicEncrypt(cryptokey.publicKey, Buffer.from('123456', 'utf-8')).toString('base64'));

      return Response.success({ key: cryptokey.publicKey || '' });
    } catch (err) {
      return Response.error(err, i18n.user.userLoginFailed);
    }
  }
}
