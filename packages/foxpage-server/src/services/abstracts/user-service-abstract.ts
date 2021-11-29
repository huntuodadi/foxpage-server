import { User } from '@foxpage/foxpage-server-types';

import * as Model from '../../models';
import { LoginParams, RegisterParams } from '../../types/user-types';
import { BaseServiceAbstract } from './base-service-abstract';

export abstract class UserServiceAbstract extends BaseServiceAbstract<User> {
  constructor() {
    super(Model.user);
  }

  abstract register(params: RegisterParams): Promise<{}>;
  abstract checkLogin(params: LoginParams): Promise<{}>;
}
