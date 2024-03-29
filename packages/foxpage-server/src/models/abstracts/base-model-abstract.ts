import mongoose from 'mongoose';

import { SearchModel } from '../../types/index-types';

export abstract class BaseModelAbstract<T> {
  protected model: mongoose.Model<T>;
  protected ignoreFields: string = ' -_id -members._id -tags._id -resources._id';

  constructor(model: mongoose.Model<T>) {
    this.model = model;
  }

  /**
   * queries: {
   *  'updates': [
   *      {model: Object, data:[{},{}]
   *  ],
   *  'inserts': [
   *      {model: Object, data: {}}
   *  ]
   * }
   */
  async exec(queries: any): Promise<Record<string, any>> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      for (const type of ['inserts', 'updates']) {
        for (const query of queries[type]) {
          if (type === 'updates') {
            await query.model.model.updateMany(...query.data, { session });
          } else if (type === 'inserts') {
            await query.model.addDetail(query.data, { session });
          }
        }
      }
      await session.commitTransaction();
      await session.endSession();
      return { status: true };
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      console.log(error);
      return { status: false, msg: (error as Error).message };
    }
  }

  /**
   * Query list
   * @param  {SearchModel} params
   * @returns Promise
   */
  async getList(params: SearchModel): Promise<T[]> {
    const search: object = params.search || {};
    const page: number = (params && params.page) || 1;
    const size: number = (params && params.size) || 10;
    const from: number = (page - 1) * size;

    return this.model
      .find(search, this.ignoreFields, {
        sort: { createTime: 1 },
        skip: from,
        limit: size,
      })
      .lean();
  }

  /**
   * Find details by a single ID
   * @param  {string} objectId
   * @returns Promise
   */
  async getById(objectId: string): Promise<T> {
    return this.model.findById(objectId).lean();
  }

  /**
   * Get the number of data for the specified filter condition
   * @param  {mongoose.FilterQuery<T>} filter
   * @returns Promise
   */
  async getCountDocuments(filter: mongoose.FilterQuery<T>): Promise<number> {
    return this.model.countDocuments(filter);
  }

  /**
   * Query data with custom conditions
   * @param  {mongoose.FilterQuery<T>} filter
   * @param  {Object={}} projection
   * @param  {mongoose.QueryOptions={}} options
   * @returns Promise
   */
  async find(
    filter: mongoose.FilterQuery<T>,
    projection: string = '',
    options: mongoose.QueryOptions = {},
  ): Promise<T[]> {
    projection = projection || this.ignoreFields;
    return this.model.find(filter, projection, options).lean();
  }

  /**
   * Find a single record by condition
   * @param  {mongoose.FilterQuery<T>} condition
   * @param  {Object} projection?
   * @param  {mongoose.QueryOptions} options?
   * @returns Promise
   */
  async findOne(
    condition: mongoose.FilterQuery<T>,
    projection: string = '',
    options: mongoose.QueryOptions = {},
  ): Promise<T> {
    projection = projection || this.ignoreFields;
    return this.model.findOne(condition, projection, options).lean();
  }

  /**
   * Get details by Id
   * @param  {string[]} objectIds
   * @returns Promise
   */
  async getDetailByIds(objectIds: string[], projection: string = ''): Promise<T[]> {
    projection = projection || this.ignoreFields;
    return this.model.find({ id: { $in: objectIds }, deleted: false } as any, projection, {}).lean();
  }

  /**
   * Create data
   * @param  {T|T[]} detail
   * @returns Promise
   */
  async addDetail(detail: T | T[], options: mongoose.SaveOptions = {}): Promise<T[]> {
    const data: T[] = detail instanceof Array ? detail : [detail];
    return this.model.create(data, options);
  }

  /**
   * Update data
   * @param  {mongoose.FilterQuery<T>} filter
   * @param  {mongoose.UpdateQuery<T>} doc
   * @returns Promise
   */
  async updateDetail(filter: mongoose.FilterQuery<T>, doc: mongoose.UpdateQuery<T>): Promise<any> {
    return this.model.updateMany(filter, doc);
  }

  /**
   * Set data status
   * @param  {string} id
   * @param  {boolean} status
   * @returns Promise
   */
  async setDeleteStatus(ids: string | string[], status: boolean): Promise<any> {
    return this.model.updateMany(
      { id: { $in: ids } } as mongoose.FilterQuery<{}>,
      { deleted: status } as mongoose.UpdateQuery<{}>,
    );
  }

  /**
   * query aggregate data list
   * @param  {any={}} params
   * @returns Promise
   */
  async aggregate(params: any = {}): Promise<any> {
    return this.model.aggregate(params);
  }
}
