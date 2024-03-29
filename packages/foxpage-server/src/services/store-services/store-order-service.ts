import { StoreOrder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';

import * as Model from '../../models';
import { BaseServiceAbstract } from '../abstracts/base-service-abstract';

export class StoreOrderService extends BaseServiceAbstract<StoreOrder> {
  private static _instance: StoreOrderService;

  constructor() {
    super(Model.storeOrder);
  }

  /**
   * Single instance
   * @returns StoreOrderService
   */
  public static getInstance(): StoreOrderService {
    this._instance || (this._instance = new StoreOrderService());
    return this._instance;
  }

  /**
   * Get a list of goods order details through goods ID and application ID
   * @param  {string[]} appIds
   * @param  {string[]} goodsIds
   * @returns Promise
   */
  async getListByAppIdAndGoodsIds(appIds: string[], goodsIds: string[]): Promise<StoreOrder[]> {
    return this.find({ 'customer.applicationId': { $in: appIds }, goodsId: { $in: goodsIds } }, '-_id');
  }
}
