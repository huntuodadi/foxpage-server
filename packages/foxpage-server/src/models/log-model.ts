import { Log } from '@foxpage/foxpage-server-types';

import { BaseModelAbstract } from './abstracts/base-model-abstract';
import logModel from './schema/log';

/**
 * Log data processing related classes
 *
 * @export
 * @class LogModel
 * @extends {BaseModelAbstract<Log>}
 */
export class LogModel extends BaseModelAbstract<Log> {
  private static _instance: LogModel;

  constructor() {
    super(logModel);
  }

  /**
   * Single instance
   * @returns LogModel
   */
  public static getInstance(): LogModel {
    this._instance || (this._instance = new LogModel());
    return this._instance;
  }
}
