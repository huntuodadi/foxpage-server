import 'reflect-metadata';

import crypto from 'crypto';
import { Get, JsonController } from 'routing-controllers';

import * as Response from '../../utils/response';

@JsonController('common')
export class UserLogin {
  @Get('/key')
  async index(): Promise<{}> {
    try {
      const keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 520,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: '',
        },
      });

      return Response.success(keyPair);
    } catch (err) {
      return Response.error(err, 'error');
    }
  }
}
