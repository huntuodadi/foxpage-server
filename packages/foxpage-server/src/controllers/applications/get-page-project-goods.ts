import 'reflect-metadata';

import { Content, File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppPackageListRes, AppProjectGoodsListReq } from '../../types/validates/app-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('applications')
export class GetApplicationProjectGoodsList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get special type goods paging list in application
   * @param  {AppProjectGoodsListReq} params
   * @returns {GetPageTemplateListRes}
   */
  @Get('/project-goods-searchs')
  @OpenAPI({
    summary: i18n.sw.getAppGoodsList,
    description: '',
    tags: ['Application'],
    operationId: 'get-application-page-goods-list',
  })
  @ResponseSchema(AppPackageListRes)
  async index(@QueryParams() params: AppProjectGoodsListReq): Promise<ResData<any>> {
    try {
      const pageSize = this.service.store.goods.setPageSize(params);

      // Get all project from store
      const appProjectGoods = await this.service.folder.list.find(
        { applicationId: params.applicationId, 'tags.copyFrom': { $exists: true }, deleted: false },
        '',
        { sort: { createTime: -1 } },
      );
      const pageProjectGoods = _.chunk(appProjectGoods, pageSize.size);
      const currentPageProjectGoods = pageProjectGoods[pageSize.page - 1] || [];

      let appProjectGoodsList: any[] = [];
      if (currentPageProjectGoods.length > 0) {
        const projectIds = _.map(appProjectGoods, 'id');
        const userIds = _.map(appProjectGoods, 'creator');

        // Get project files
        const [fileList, userObject, appDetail] = await Promise.all([
          this.service.file.list.find({ folderId: { $in: projectIds } }),
          this.service.user.getUserBaseObjectByIds(userIds),
          this.service.application.getDetailById(params.applicationId),
        ]);

        const fileIds = _.map(fileList, 'id');
        // Get content list
        const contentObject = await this.service.content.list.getContentObjectByFileIds(fileIds);
        let fileContentObject: Record<string, Content[]> = {};
        for (const id in contentObject) {
          if (!fileContentObject[contentObject[id].fileId]) {
            fileContentObject[contentObject[id].fileId] = [];
          }
          fileContentObject[contentObject[id].fileId].push(contentObject[id]);
        }

        const projectFileObject: Record<string, File[]> = {};
        for (const file of fileList) {
          if (!projectFileObject[file.folderId]) {
            projectFileObject[file.folderId] = [];
          }

          const fileWithContent = Object.assign(file, { contents: fileContentObject[file.id] || [] });

          projectFileObject[file.folderId].push(fileWithContent);
        }

        appProjectGoods.forEach((project) => {
          appProjectGoodsList.push(
            Object.assign(
              {
                files: projectFileObject[project.id] || [],
                creator: userObject[project.creator] || {},
                application: { id: params.applicationId, name: appDetail.name || '' },
              },
              _.omit(project, ['applicationId', 'creator']),
            ),
          );
        });
      }

      return Response.success({
        pageInfo: {
          total: appProjectGoods.length || 0,
          page: params.page,
          size: params.size,
        },
        data: appProjectGoodsList,
      });
    } catch (err) {
      return Response.error(err, i18n.app.getPageGoodsFailed);
    }
  }
}
