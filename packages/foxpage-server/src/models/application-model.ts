import { Application } from '@foxpage/foxpage-server-types';

import { AppInfo, AppSearch } from '../types/app-types';
import { BaseModelAbstract } from './abstracts/base-model-abstract';
import appModel from './schema/application';

/**
 * Application repository related classes
 */
export class ApplicationModel extends BaseModelAbstract<Application> {
  private static _instance: ApplicationModel;

  constructor() {
    super(appModel);
  }

  /**
   * Single instance
   * @returns ApplicationModel
   */
  public static getInstance(): ApplicationModel {
    this._instance || (this._instance = new ApplicationModel());
    return this._instance;
  }

  /**
   * Get application list information containing user name
   * @param  {AppSearch} params
   * @returns {AppInfo[]} Promise
   */
  async getAppList(params: AppSearch): Promise<AppInfo[]> {
    const page = params.page || 1;
    const size = params.size || 20;
    const from = (page - 1) * size;

    const searchParams: { $or?: any[]; deleted: boolean; organizationId?: string } = { deleted: false };

    if (params.organizationId) {
      searchParams.organizationId = params.organizationId;
    }

    if (params.search) {
      searchParams['$or'] = [{ name: { $regex: new RegExp(params.search, 'i') } }, { id: params.search }];
    }

    return this.model
      .find(searchParams, this.ignoreFields)
      .sort('createTime')
      .skip(from)
      .limit(size)
      .lean();
  }

  /**
   * Get the amount of application data under specified search conditions
   * @param  {AppSearch} params
   * @returns {number} Promise
   */
  async getTotal(params: AppSearch): Promise<number> {
    const searchParams: { $or?: any[]; deleted: boolean; organizationId?: string } = { deleted: false };

    if (params.organizationId) {
      searchParams.organizationId = params.organizationId;
    }

    if (params.search) {
      searchParams['$or'] = [{ name: { $regex: new RegExp(params.search, 'i') } }, { id: params.search }];
    }

    return this.model
      .find(searchParams)
      .countDocuments()
      .lean();
  }
}
