import { Log } from '@foxpage/foxpage-server-types';
import _ from 'lodash';

import {
  EDITOR_TYPE,
  LOG_CATEGORY_APPLICATION,
  LOG_CATEGORY_ORGANIZATION,
  LOG_CONTENT_REMOVE,
  LOG_CONTENT_TAG,
  LOG_FILE_REMOVE,
  LOG_FILE_TAG,
  LOG_LIVE,
  PRE_APP,
  PRE_CONTENT,
  PRE_CONTENT_VERSION,
  PRE_FILE,
  PRE_FOLDER,
  PRE_LOG,
  PRE_TRAN,
} from '../../config/constant';
import * as Model from '../models';
import * as Service from '../services';
import { ContentChange, NewLog } from '../types/log-types';
import { generationId } from '../utils/tools';
import { LogServiceAbstract } from './abstracts/log-service-abstract';

export class LogService extends LogServiceAbstract {
  private static _instance: LogService;

  protected transactionId: string = '';
  protected logData: any[] = [];

  constructor() {
    super();
    this.logData = [];
    this.transactionId = generationId(PRE_TRAN);
  }

  /**
   * Single instance
   * @returns LogService
   */
  public static getInstance(newInstance: boolean = false): LogService {
    if (newInstance) {
      LogService._instance = new LogService();
    }

    return LogService._instance;
  }

  /**
   * Add the change log that needs to be saved
   * @param  {} params={}
   * @returns void
   */
  addLogData(params = {}): void {
    this.logData.push(params);
  }

  /**
   * Save the change log of the current request
   * @returns Promise
   */
  async saveChangeLogs(): Promise<void> {
    if (this.logData.length > 0) {
      const allLogs: Log[] = [];
      const operator = Service.userSingleton.getInstance().getCurrentUserBase().id || 'unknown';
      for (const log of this.logData) {
        if (!log.content.after) {
          log.content.after = await this.getDataDetail(log.content.id);
        }
        allLogs.push(
          Object.assign({}, log, {
            transactionId: this.transactionId,
            id: generationId(PRE_LOG),
            category: _.isString(log.category) ? this.getLogCategory(log.category) : log.category,
            operator: operator,
            deleted: false,
          }),
        );
      }

      await Model.log.addDetail(allLogs);
    }
  }

  /**
   * Save operation log
   * @param  {NewLog} params
   * @returns Promise
   */
  async saveLog(params: NewLog): Promise<void> {
    const logDetail: Log = Object.assign({}, params, {
      transactionId: this.transactionId,
      id: generationId(PRE_LOG),
      category: _.isString(params.category) ? this.getLogCategory(params.category) : params.category,
      operator: Service.userSingleton.getInstance().getCurrentUserBase().id || 'unknown',
      deleted: false,
    });
    await Model.log.addDetail(logDetail);
  }

  /**
   * Save current request log
   * @param  {any} params
   * @returns Promise
   */
  async saveRequest(params: any): Promise<void> {
    const logDetail: Log = Object.assign({}, params, {
      transactionId: this.transactionId,
      id: generationId(PRE_LOG),
      action: 'request',
      category: _.isString(params.category) ? this.getLogCategory(params.category) : params.category,
      operator: Service.userSingleton.getInstance().getCurrentUserBase().id || 'unknown',
      deleted: false,
    });
    await Model.log.addDetail(logDetail);
  }

  /**
   * Obtain log classification data
   * @param  {string} type
   */
  getLogCategory(type: string): Record<string, string> {
    if (type === LOG_CATEGORY_APPLICATION) {
      return { type, id: Service.appSingleton.getInstance().getApplicationId() };
    } else if (type === LOG_CATEGORY_ORGANIZATION) {
      return { type, id: Service.appSingleton.getInstance().getOrganizationId() };
    }

    return {};
  }

  /**
   * After obtaining the specified time, the content information list on the right.
   * In the returned content, the content tag data is placed in the tag field,
   * and the file data is placed in the file. Others are placed in the corresponding types, such as
   * {
   *  tag:{updates:{},removes:{}},
   *  file:{updates:{},removes:{}},
   *  page:{updates:{},removes:{}},
   *  template:{updates:{},removes:{}},
   *  variable:{updates:{},removes:{}}
   *  ...
   * }
   * @param  {ContentChange} params
   * @returns Promise
   */
  async getChangesContentList(params: ContentChange): Promise<Record<string, any>> {
    // Get the log data of the specified action
    const changeList: any[] = await Model.log.find({
      createTime: { $gte: new Date(new Date(params.timestamp)) },
      action: {
        $in: [LOG_LIVE, LOG_FILE_REMOVE, LOG_FILE_TAG, LOG_CONTENT_TAG, LOG_CONTENT_REMOVE],
      }, // Get the data set to live, tags updated data
      'category.id': params.applicationId,
      'category.type': LOG_CATEGORY_APPLICATION,
      'content.id': { $exists: true },
    });

    // Filter all content information
    let fileIds: string[] = [];
    let contentIds: string[] = [];
    let contentIdTypes: Record<string, { id: string; type: string }> = {};
    changeList.forEach((log) => {
      contentIdTypes[log.action + '_' + log.content.id] = { id: log.content.id, type: log.action };
      if ([LOG_LIVE, LOG_CONTENT_TAG, LOG_CONTENT_REMOVE].indexOf(log.action) !== -1) {
        contentIds.push(log.content.id);
      } else if ([LOG_FILE_TAG, LOG_FILE_REMOVE].indexOf(log.action) !== -1) {
        fileIds.push(log.content.id);
      }
    });

    // Get content containing fileId
    const contentList = await Service.content.info.getDetailByIds(contentIds);
    const contentObject = _.keyBy(contentList, 'id');

    // Get file information
    fileIds = fileIds.concat(_.map(contentList, 'fileId'));
    const fileTypeInfo = await Service.file.info.getDetailByIds(fileIds);
    const fileTypeObject = _.keyBy(fileTypeInfo, 'id');

    // Set the return structure
    let [logFileId, logItemType, logTypeName] = ['', '', ''];
    let logChangeObject: Record<string, any> = {};
    for (const logType in contentIdTypes) {
      const logItem = contentIdTypes[logType];
      if ([LOG_FILE_TAG, LOG_FILE_REMOVE].indexOf(logItem.type) !== -1) {
        logFileId = logItem.id;
      } else {
        logFileId = contentObject[logItem.id]?.fileId || '';
      }

      [LOG_FILE_TAG, LOG_FILE_REMOVE].indexOf(logItem.type) !== -1 && (logTypeName = 'file');
      logItem.type === LOG_CONTENT_TAG && (logTypeName = 'tag');
      logItem.type === LOG_CONTENT_REMOVE && (logTypeName = fileTypeObject[logFileId]?.type);
      logItem.type === LOG_LIVE && (logTypeName = fileTypeObject[logFileId]?.type);

      // Does not return invalid file types or editor components
      if (!logTypeName || logTypeName === EDITOR_TYPE) {
        continue;
      }

      !logChangeObject[logTypeName] && (logChangeObject[logTypeName] = { updates: [], removes: [] });

      logItemType =
        [LOG_FILE_REMOVE, LOG_CONTENT_REMOVE].indexOf(logItem.type) !== -1 ? 'removes' : 'updates';
      logChangeObject[logTypeName][logItemType].push(logItem.id);
    }

    return logChangeObject;
  }

  /**
   * Get the content of the specified id
   * @param  {string} id
   * @returns Promise
   */
  async getDataDetail(id: string): Promise<any> {
    const idPre = id.split('_')[0] || '';
    let afterData: any = {};

    switch (idPre) {
      case PRE_APP:
        afterData = await Service.application.getDetailById(id);
        break;
      case PRE_FOLDER:
        afterData = await Service.folder.info.getDetailById(id);
        break;
      case PRE_FILE:
        afterData = await Service.file.info.getDetailById(id);
        break;
      case PRE_CONTENT:
        afterData = await Service.content.info.getDetailById(id);
        break;
      case PRE_CONTENT_VERSION:
        afterData = await Service.version.info.getDetailById(id);
        break;
    }

    return afterData;
  }

  /**
   * Special log records, the classification is designated as application level,
   * and the content only contains the field data of id and before
   * @param  {string} action
   * @param  {any} data
   * @returns void
   */
  addLogItem<T extends { id: string; contentId?: string }>(action: string, data: T | T[]): void {
    !_.isArray(data) && (data = [data]);

    data.forEach((cell) => {
      this.addLogData({
        action: action,
        category: LOG_CATEGORY_APPLICATION,
        content: { id: cell?.id || '', contentId: cell?.contentId || '', before: cell },
      });
    });
  }
}
