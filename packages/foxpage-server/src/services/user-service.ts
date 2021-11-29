import { User, UserRegisterType } from '@foxpage/foxpage-server-types';
import crypto from 'crypto';
import _ from 'lodash';

import * as appConfig from '../../app.config';
import { LOG_CATEGORY_APPLICATION, LOG_CREATE, PRE_USER } from '../../config/constant';
import * as Model from '../models';
import thirdPartyLogin from '../third-parties/login';
import { Creator } from '../types/index-types';
import { LoginParams, NewUser, RegisterParams, UserAccountInfo } from '../types/user-types';
import { generationId } from '../utils/tools';
import { UserServiceAbstract } from './abstracts/user-service-abstract';
import * as Service from './index';

export class UserService extends UserServiceAbstract {
  private static _instance: UserService;
  protected userBase: Creator;

  constructor() {
    super();
  }

  /**
   * Single instance
   * @returns UserService
   */
  public static getInstance(newInstance: boolean = false): UserService {
    if (newInstance) {
      UserService._instance = new UserService();
    }
    return this._instance;
  }

  /**
   * Set the currently requested user information
   *
   * @param {UserBase} userBase
   * @memberof UserService
   */
  setCurrentUser(userBase: Creator): void {
    this.userBase = userBase;
  }

  /**
   * Get the currently requested user information
   *
   * @returns
   * @memberof UserService
   */
  getCurrentUserBase(): Creator {
    return this.userBase || {};
  }

  /**
   * Manually add a user, wait for the transaction to execute, and return the user id
   * @param  {Partial<User>} params
   * @returns string
   */
  addNewUser(params: Partial<User>): string {
    const newUserParams: User = {
      id: params.id || generationId(PRE_USER),
      account: params.account || '',
      email: params.email || '',
      nickName: params.nickName || '',
      registerType: params.registerType as UserRegisterType,
      deleted: false,
      password: params.password
        ? crypto
            .createHash('md5')
            .update(params.password)
            .digest('hex')
        : '',
    };
    this.addDetailQuery(newUserParams);
    return newUserParams.id || '';
  }

  /**
   * User registration service
   * @param  {RegisterParams} params
   * @returns {User} Promise
   */
  async register(params: RegisterParams): Promise<Partial<User>> {
    // Check if the user already exists
    const userDetail = await Model.user.getUserByAccount(params.account);
    if (userDetail && userDetail.account) {
      return {};
    }

    // Create User
    const newUserParams: Partial<NewUser> = {
      id: generationId(PRE_USER),
      account: params.account,
      email: params.email,
      nickName: params.nickName || '',
      registerType: params.registerType as UserRegisterType,
      password: params.password
        ? crypto
            .createHash('md5')
            .update(params.password)
            .digest('hex')
        : '',
    };

    const userData = await Model.user.addUser(newUserParams);

    Service.logSingleton.getInstance().addLogData({
      action: LOG_CREATE,
      category: LOG_CATEGORY_APPLICATION,
      content: { id: newUserParams.id, after: newUserParams },
    });

    return _.pick(userData, ['id', 'account', 'email']);
  }

  /**
   * Check user login information
   * @param  {LoginParams} params
   * @returns {Boolean} Promise
   */
  async checkLogin(params: LoginParams): Promise<Boolean> {
    // 第三方登录
    if (appConfig.config.login) {
      // TODO Need to check whether the current user has organization information
      const userInfo: UserAccountInfo = await thirdPartyLogin.signIn(params);
      // Save current user information
      await this.checkAndSaveUserInfo(userInfo);

      return userInfo.account !== '';
    } else {
      const userPwd = await Model.user.getUserPwdByAccount(params.account);
      const pwdMd5 = crypto
        .createHash('md5')
        .update(params.password)
        .digest('hex');

      // verify password
      return userPwd === pwdMd5;
    }
  }

  /**
   * When logging in through a third-party, check whether the specified user exists,
   * does not exist or is disabled, then enable or add
   * @param  {UserAccountInfo} userInfo
   * @returns Promise
   */
  async checkAndSaveUserInfo(userInfo: UserAccountInfo): Promise<string> {
    let userId: string = '';
    const userDetail = await this.getUserDetailByAccount(userInfo.account);

    if (!userDetail.account) {
      const userRegister: RegisterParams = {
        account: userInfo.account,
        email: userInfo.email || '',
        nickName: userInfo.nickName || '',
        password: '',
        registerType: 2,
      };
      const newUserInfo = await this.register(userRegister);
      userId = newUserInfo.id || '';
    } else {
      userId = userDetail.id || '';
      if (userDetail.deleted) {
        await this.updateDetail(userId, { deleted: false });
      }
    }

    return userId;
  }

  /**
   * Get user details through account
   * @param  {string} account
   * @returns Promise
   */
  async getUserDetailByAccount(account: string): Promise<Partial<User>> {
    const userDetail = await Model.user.getUserByAccount(account);
    return userDetail || {};
  }

  /**
   * Return user data object keyed by user id
   * @param  {string[]} userIds
   * @returns userList
   */
  async getUserBaseObjectByIds(userIds: string[]): Promise<Record<string, Creator>> {
    const userList = await this.getDetailByIds(userIds);
    return _.keyBy(_.map(userList, (user) => _.pick(user, ['id', 'account'])) as Creator[], 'id');
  }

  /**
   * Replace creatorId in the specified data with user basic information {id, account}
   * @param  {T[]} dataList
   * @param  {string} userKey
   * @returns Promise
   */
  async replaceDataUserId<
    T extends { creator: string },
    K extends Exclude<T, 'creator'> & { creator: Creator }
  >(dataList: T[], userKey: string = 'creator'): Promise<K[]> {
    const userIds: string[] = _.map(dataList, userKey);
    if (userIds.length === 0) {
      return [];
    }

    let newDataList: K[] = [];
    const userObject = await this.getUserBaseObjectByIds(userIds);
    dataList.map((item) => {
      const dataItem: K = Object.assign(_.omit(item, [userKey]), { creator: userObject[item.creator] }) as K;
      newDataList.push(dataItem);
    });

    return newDataList;
  }
}
