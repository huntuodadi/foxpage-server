import { Folder, StoreGoods } from '@foxpage/foxpage-server-types';
import _ from 'lodash';

import {
  PAGE_TYPE,
  PRE_CONTENT,
  PRE_CONTENT_VERSION,
  PRE_FILE,
  PRE_FOLDER,
  PROJECT_TYPE,
  TEMPLATE_TYPE,
} from '../../../config/constant';
import * as Model from '../../models';
import { PageContentRelationInfos } from '../../types/content-types';
import { PageData } from '../../types/index-types';
import { StoreFileStatus, StorePageParams } from '../../types/store-types';
import { generationId } from '../../utils/tools';
import { BaseServiceAbstract } from '../abstracts/base-service-abstract';
import * as Service from '../index';

export class StoreGoodsService extends BaseServiceAbstract<StoreGoods> {
  private static _instance: StoreGoodsService;

  constructor() {
    super(Model.storeGoods);
  }

  /**
   * Single instance
   * @returns StoreGoodsService
   */
  public static getInstance(): StoreGoodsService {
    this._instance || (this._instance = new StoreGoodsService());
    return this._instance;
  }

  /**
   * Get goods details by store target id
   * @param  {string} typeId
   * @returns Promise
   */
  async getDetailByTypeId(typeId: string): Promise<StoreGoods> {
    const goodsList = await this.find({ 'details.id': typeId });
    return goodsList?.[0] || undefined;
  }

  /**
   * Get store goods paging data
   * @param  {StorePageParams} params
   * @returns Promise
   */
  async getPageList(params: StorePageParams): Promise<PageData<StoreGoods | Folder>> {
    let pageData = [];
    let count = 0;

    // Get page and template goods by project
    if (params.type && [PAGE_TYPE, TEMPLATE_TYPE].indexOf(params.type) !== -1) {
      const match: any = { 'details.projectId': { $exists: true }, 'type': params.type };
      if (params.appIds && params.appIds.length > 0) {
        match['details.applicationId'] = { $in: params.appIds };
      }

      const [projectGoods, projectCount] = await Promise.all([
        this.model.aggregate([
          { $match: match },
          { $group: { _id: '$details.projectId', createTime: { $max: '$createTime' } } },
          { $sort: { createTime: -1 } },
          { $skip: ((params.page || 1) - 1) * (params.size || 10) },
          { $limit: params.size || 10 },
        ]),
        this.model.aggregate([{ $match: match }, { $group: { _id: '$details.projectId' } }]),
      ]);
      const projectIds = _.map(projectGoods, '_id');
      pageData = await Service.folder.list.getDetailByIds(projectIds);
      count = projectCount.length || 0;
    } else {
      [pageData, count] = await Promise.all([
        Model.storeGoods.getGoodsPageList(params),
        Model.storeGoods.getGoodsCount(params),
      ]);
    }

    return { count: count, list: pageData };
  }

  /**
   * Query product details through the file and application ID of the product
   * @param  {string} applicationId
   * @param  {string} fileId
   * @returns Promise
   */
  async getDetailByAppFileId(applicationId: string, fileId: string): Promise<StoreGoods> {
    return this.getDetail({ 'details.id': fileId, 'details.applicationId': applicationId });
  }

  /**
   * Get the status of the product on the shelf through the application ID and file IDs
   * Return the file ID and file status
   * @param  {string} applicationId
   * @param  {string[]} fileIds
   * @returns Promise
   */
  async getAppFileStatus(applicationId: string, fileIds: string[]): Promise<StoreFileStatus[]> {
    const goodsList = await this.find({
      'details.applicationId': applicationId,
      'details.id': { $in: fileIds },
    });

    return _.map(goodsList, (goods) => {
      return { id: goods.details.id, status: goods.status };
    });
  }

  async addToApp(appId: string, goodsDetail: StoreGoods): Promise<void> {
    const goodsFileId = goodsDetail?.details?.id;

    const fileDetail = await Service.file.info.getDetailById(goodsFileId);
    const [folderDetail, contentList] = await Promise.all([
      Service.folder.info.getDetailById(fileDetail.folderId),
      Service.content.list.find({ fileId: goodsFileId, liveVersionNumber: { $gt: 0 }, deleted: false }),
    ]);

    const contentVersionList = await Service.version.live.getContentAndRelationVersion(
      _.map(contentList, 'id'),
    );
    const contentVersionObject: Record<string, PageContentRelationInfos> = _.keyBy(contentVersionList, 'id');

    // 创建项目
    const projectId = generationId(PRE_FOLDER);
    const projectParams = { id: projectId, applicationId: appId, name: folderDetail.name };
    const projectInfo = await Service.folder.info.addTypeFolderDetail(projectParams, PROJECT_TYPE);

    // Create file
    const newFileId = generationId(PRE_FILE);
    const fileParams = {
      id: newFileId,
      name: fileDetail.name,
      applicationId: appId,
      type: fileDetail.type,
      folderId: projectId,
      suffix: fileDetail.suffix || '',
      intro: fileDetail.intro || '',
      tags: [{ store: { goodsId: goodsDetail.id } }],
    };
    Service.file.info.create(fileParams);

    // Create content and relations content
    for (const content of contentList) {
      const contentId = generationId(PRE_CONTENT);
      const contentParams = { id: contentId, fileId: newFileId, title: content.title };
      Service.content.info.create(contentParams);

      // Create content version
      const versionParams = {
        id: generationId(PRE_CONTENT_VERSION),
        contentId,
        version: '0.0.1',
        content: contentVersionObject[content.id],
      };
      Service.version.info.create(versionParams);
    }

    console.log(projectInfo);
  }
}
