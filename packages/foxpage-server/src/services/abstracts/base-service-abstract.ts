import { DateTime } from '@foxpage/foxpage-shared';
import _ from 'lodash';
import mongoose from 'mongoose';
import pLimit from 'p-limit';

import { BaseModelAbstract } from '../../models/abstracts/base-model-abstract';
import { PageSize, SearchModel } from '../../types/index-types';
import { BaseServerInterface } from '../interfaces/base-service-interface';
import { TransactionService } from '../transaction-service';

export abstract class BaseServiceAbstract<T> implements BaseServerInterface<T> {
  public model: BaseModelAbstract<T>;

  constructor(model: BaseModelAbstract<T>) {
    this.model = model;
  }

  transaction() {
    return TransactionService.getInstance();
  }

  async runTransaction(): Promise<Record<string, string>> {
    return this.model.exec(this.transaction().getQueries());
  }

  /**
   * Set the default value of the paging parameters
   * @param  {Partial<PageSize>} params
   * @returns Partial
   */
  setPageSize(params: Partial<PageSize>): PageSize {
    params.page = Number(params.page) || 1;
    params.size = Number(params.size) || 10;

    return { page: params.page, size: params.size };
  }

  /**
   * Search data list
   * @param  {SearchModel} params
   * @returns Promise
   */
  async getList(params: SearchModel): Promise<T[]> {
    return this.model.getList(params);
  }

  /**
   * Get the number of data with specified conditions
   * @param  {any} params
   * @returns Promise
   */
  async getCount(params: any): Promise<number> {
    return this.model.getCountDocuments(params);
  }

  /**
   * Get data through custom parameters
   * @param  {any} params
   * @returns Promise
   */
  async find(params: any, projection?: string, options?: object): Promise<T[]> {
    if (!options) {
      options = { sort: { createTime: 'desc' } };
    }

    return this.model.find(params, projection, options);
  }

  /**
   * Find data by multiple IDs
   * @param  {string[]} objectIds
   * @returns Promise
   */
  async getDetailByIds(objectIds: string[], projection?: string): Promise<T[]> {
    if (objectIds.length === 0) {
      return [];
    }

    // Batch query, 1 concurrent request, 200 ids each time
    let promises: any[] = [];
    const limit = pLimit(1);
    _.chunk(objectIds, 200).forEach((ids) => {
      promises.push(limit(() => this.model.getDetailByIds(ids, projection)));
    });

    return _.flatten(await Promise.all(promises));
  }

  /**
   * Query data arbitrarily
   * @param  {T} paramsT
   * @returns Promise
   */
  async getDetail(params: mongoose.FilterQuery<T>): Promise<T> {
    return this.model.findOne(params);
  }

  /**
   * Find data by a single ID
   * @param  {string} objectId
   * @returns Promise
   */
  async getDetailById(objectId: string): Promise<T> {
    return this.model.findOne({ id: objectId } as mongoose.FilterQuery<{}>);
  }

  /**
   * Query to generate new data
   * @param  {T} detail
   */
  addDetailQuery(detail: T): T {
    this.transaction().addInsertQuery({ model: this.model, data: detail });
    return detail;
  }

  /**
   * Create data
   * @param  {T} detail
   * @returns Promise
   */
  addDetail(detail: T): Promise<T[]> {
    return this.model.addDetail(detail);
  }

  /**
   * Generate query to update data
   * @param  {string} id
   * @param  {Partial<T&CommonFields>} data
   */
  updateDetailQuery(id: string, data: Partial<T>): void {
    this.transaction().addUpdateQuery({
      model: this.model,
      data: [{ id }, Object.assign({ updateTime: new DateTime() }, data)],
    });
  }

  /**
   * Bulk settings update
   * @param  {Record<string} filter
   * @param  {} any>
   * @param  {Partial<T&CommonFields>} data
   * @returns void
   */
  batchUpdateDetailQuery(filter: Record<string, any>, data: Partial<T>): void {
    this.transaction().addUpdateQuery({
      model: this.model,
      data: [filter, Object.assign({ updateTime: new DateTime() }, data)],
    });
  }

  /**
   * update data
   * @param  {string} id
   * @param  {Partial<T&CommonFields>} data
   * @returns Promise
   */
  async updateDetail(id: string, data: Partial<T>): Promise<any> {
    return this.model.updateDetail(
      { id } as mongoose.FilterQuery<{}>,
      Object.assign({ updateTime: new DateTime() }, data) as mongoose.UpdateQuery<T>,
    );
  }

  /**
   * Set data deletion status
   * @param  {string} id
   * @param  {boolean} status
   * @returns Promise
   */
  setDeleteStatus(ids: string | string[], status: boolean): void {
    if (typeof ids === 'string') {
      ids = [ids];
    }

    if (ids.length > 0) {
      this.batchUpdateDetailQuery({ id: { $in: ids } }, { deleted: status } as any);
    }
  }

  /**
   * Check whether the data of the specified conditions exists
   * @param  {any} params
   * @returns Promise
   */
  async checkExist(params: any, id?: string): Promise<boolean> {
    const result: any = await this.model.findOne(params);
    return result ? result.id !== id : false;
  }
}
