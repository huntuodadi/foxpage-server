import { AppFolderTypes, Folder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';

import { LOG_CREATE, LOG_DELETE, LOG_UPDATE, PRE_FOLDER } from '../../../config/constant';
import * as Model from '../../models';
import {
  AppDefaultFolderSearch,
  AppFolderType,
  AppsFolderType,
  AppTypeFolderUpdate,
  FolderPathSearch,
} from '../../types/file-types';
import { TypeStatus } from '../../types/index-types';
import { formatToPath, generationId } from '../../utils/tools';
import { FolderServiceAbstract } from '../abstracts/folder-service-abstract';
import * as Service from '../index';

export class FolderInfoService extends FolderServiceAbstract {
  private static _instance: FolderInfoService;

  constructor() {
    super();
  }

  /**
   * Single instance
   * @returns ContentInfoService
   */
  public static getInstance(): FolderInfoService {
    this._instance || (this._instance = new FolderInfoService());
    return this._instance;
  }

  /**
   * Add the details of the new folder, return to the new query
   * @param  {Partial<Folder>} params
   * @returns Folder
   */
  create(params: Partial<Folder>): Folder {
    const folderDetail: Folder = {
      id: params.id || generationId(PRE_FOLDER),
      name: params.name || '',
      intro: params.intro || '',
      applicationId: params.applicationId || '',
      folderPath: params.folderPath || formatToPath(params.name as string),
      parentFolderId: params.parentFolderId || '',
      tags: params.tags || [],
      creator: params.creator || Service.userSingleton.getInstance().getCurrentUserBase().id,
      deleted: false,
    };
    this.addDetailQuery(folderDetail);

    Service.logSingleton.getInstance().addLogItem(LOG_CREATE, folderDetail);

    return folderDetail;
  }

  /**
   * Get the id of the specified default folder of the specified application
   * @param  {AppFolderType} params
   * @returns Promise
   */
  async getAppTypeFolderId(params: AppFolderType): Promise<string> {
    const folderIds = await this.getAppDefaultFolderIds({
      applicationIds: [params.applicationId],
      type: params.type,
    });

    return [...folderIds][0] || '';
  }

  /**
   * Get app multi default folder ids
   * @param  {AppsFolderType} params
   * @returns Promise
   */
  async getAppsTypeFolderId(params: AppsFolderType): Promise<Record<string, string>> {
    const folderList = await Model.folder.find({
      applicationId: { $in: params.applicationIds },
      'tags.type': params.type,
    });

    const appFolder: Record<string, string> = {};
    _.map(folderList, (folder) => {
      if (folder.tags?.[0]?.type === params.type) {
        appFolder[folder.applicationId] = folder.id;
      }
    });
    return appFolder;
  }

  /**
   * Get the default folder Ids of the specified type under the specified application
   * @param  {AppDefaultFolderSearch} params
   * @returns {string[]} Promise
   */
  async getAppDefaultFolderIds(params: AppDefaultFolderSearch): Promise<Set<string>> {
    const folderList = await Model.folder.find({
      applicationId: { $in: params.applicationIds },
      'tags.type': params.type,
    });

    const folderDetails = _.filter(folderList, (folder) => {
      return folder.tags?.[0]?.type === params.type;
    });

    return new Set(_.map(folderDetails, 'id'));
  }

  /**
   * Get the id of the folder by path
   * @param  {string} parentFolderId
   * @param  {string[]} pathList
   * @returns Promise
   */
  async getFolderIdByPathRecursive(params: FolderPathSearch, createFolder: boolean = false): Promise<string> {
    const folderPath = params.pathList.shift() || '';
    if (!folderPath) {
      return '';
    }

    let folderDetail = await this.getDetail({
      parentFolderId: params.parentFolderId,
      folderPath: folderPath,
      deleted: false,
    });

    // Create folder
    if (!folderDetail && createFolder) {
      folderDetail = this.create({
        applicationId: params.applicationId,
        name: folderPath,
        folderPath,
        parentFolderId: params.parentFolderId,
      });
    }

    let folderId = folderDetail?.id || '';
    if (folderId && params.pathList.length > 0) {
      folderId = await this.getFolderIdByPathRecursive(
        {
          applicationId: params.applicationId,
          parentFolderId: folderId,
          pathList: params.pathList,
        },
        createFolder,
      );
    }

    return folderId;
  }

  /**
   * Add folders of specified types under the application, such as items, variables, conditions, etc.
   * @param  {Folder} folderDetail
   * @param  {Record<string, number | Folder>} type
   * @returns Promise
   */
  async addTypeFolderDetail(
    folderDetail: Partial<Folder>,
    type: AppFolderTypes,
  ): Promise<Record<string, number | Folder>> {
    // Get the folder Id of the specified type under the application
    const typeDetail = await Model.folder.findOne({
      applicationId: folderDetail.applicationId,
      parentFolderId: '',
      'tags.type': type,
      deleted: false,
    });

    if (!typeDetail) {
      return { code: 1 };
    }

    // Check if the folder is duplicate
    const existFolder = await Model.folder.findOne({
      applicationId: folderDetail.applicationId,
      parentFolderId: typeDetail.id,
      name: folderDetail.name,
      deleted: false,
    });

    if (existFolder) {
      return { code: 2 };
    }

    // Create folder
    folderDetail.parentFolderId = typeDetail.id;
    const newFolderDetail = this.create(folderDetail);

    // TODO Save logs

    return { code: 0, data: newFolderDetail };
  }

  /**
   * Update the file details of the specified type under the application
   * @param  {AppTypeFolderUpdate} folderDetail
   * @param  {AppFolderTypes} type
   * @returns Promise
   */
  async updateTypeFolderDetail(folderDetail: AppTypeFolderUpdate): Promise<Record<string, number>> {
    // Get current folder details
    const typeDetail = await this.model.findOne({
      id: folderDetail.id,
      applicationId: folderDetail.applicationId,
    });

    if (!typeDetail) {
      return { code: 2 }; // Invalid folder
    }

    if (folderDetail.name && folderDetail.name !== typeDetail.name) {
      const existDetail = await Model.folder.findOne({
        parentFolderId: typeDetail.parentFolderId,
        applicationId: folderDetail.applicationId,
        name: folderDetail.name,
        deleted: false,
      });

      if (existDetail) {
        return { code: 3 }; // Check if the name is duplicate
      }
    }

    // 更新详情
    const updateDetail = _.omit(folderDetail, ['applicationId', 'id']);

    if (!_.isEmpty(updateDetail)) {
      this.updateDetailQuery(folderDetail.id, updateDetail);
    }

    // TODO Save logs

    return { code: 0 };
  }

  /**
   * Update the specified data directly
   * @param  {string} id
   * @param  {Partial<Content>} params
   * @returns void
   */
  updateContentItem(id: string, params: Partial<Folder>): void {
    this.updateDetailQuery(id, params);
    Service.logSingleton.getInstance().addLogItem(LOG_UPDATE, Object.assign({ id }, params));
  }

  /**
   * Update the delete status of the folder.
   * When deleting, you need to check whether there is any content being referenced.
   * When you enable it, you don’t need to check
   * @param  {TypeStatus} params
   * @returns Promise
   */
  async setFolderDeleteStatus(params: TypeStatus): Promise<Record<string, number>> {
    const folderDetail = await this.getDetailById(params.id);
    if (!folderDetail) {
      return { code: 1 }; // Invalid file information
    }

    // TODO Check whether there is information referenced by content under the folder
    if (params.status) {
    }

    // Set the enabled state
    this.setDeleteStatus(params.id, params.status);

    // TODO Save logs

    return { code: 0 };
  }

  /**
   * Set the delete status of specified folders in batches,
   * @param  {Folder[]} folderList
   * @returns void
   */
  batchSetFolderDeleteStatus(folderList: Folder[], status: boolean = true): void {
    this.setDeleteStatus(_.map(folderList, 'id'), status);
    Service.logSingleton.getInstance().addLogItem(LOG_DELETE, folderList);
  }
}
