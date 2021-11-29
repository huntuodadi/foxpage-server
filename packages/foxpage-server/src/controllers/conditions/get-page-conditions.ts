import 'reflect-metadata';

import { FileTypes } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { CONDITION_TYPE } from '../../../config/constant';
import { ContentInfo, FileContentAndVersion } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import { AppContentListRes, AppTypePageListCommonReq } from '../../types/validates/page-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('condition-searchs')
export class GetConditionList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get conditional pagination list
   * @param  {AppPageListCommonReq} params
   * @returns {ContentInfo}
   */
  @Get('')
  @OpenAPI({
    summary: i18n.sw.getAppPageConditions,
    description: '',
    tags: ['Condition'],
    operationId: 'get-condition-list',
  })
  @ResponseSchema(AppContentListRes)
  async index(@QueryParams() params: AppTypePageListCommonReq): Promise<ResData<ContentInfo[]>> {
    try {
      let isAppScope = false;
      if (params.folderId) {
        const folderDetail = await this.service.folder.info.getDetailById(params.folderId);
        if (!folderDetail || folderDetail.deleted || folderDetail.applicationId !== params.applicationId) {
          return Response.warning(i18n.folder.invalidFolderId);
        }
      } else {
        params.folderId = await this.service.folder.info.getAppTypeFolderId({
          applicationId: params.applicationId,
          type: CONDITION_TYPE,
        });
        isAppScope = true;
      }

      this.service.folder.info.setPageSize(params);
      const fileList = await this.service.file.list.find({
        folderId: params.folderId,
        type: CONDITION_TYPE as FileTypes,
        name: { $regex: '^(?!__).*' }, // Exclude system or default generated conditions starting with __ (double underscore)
      });

      let fileVersion: FileContentAndVersion[] = [];
      const pageFileList = _.chunk(fileList, params.size)[params.page - 1] || [];
      if (pageFileList.length > 0) {
        // Get the live details of the content of the file
        const contentList = await this.service.content.file.getContentByFileIds(_.map(pageFileList, 'id'));
        const versionObject = await this.service.version.list.getContentMaxVersionDetail(
          _.map(contentList, 'id'),
        );

        const fileObject = _.keyBy(pageFileList, 'id');
        const versionItemRelation = await this.service.version.list.getVersionListRelations(
          _.toArray(versionObject),
          isAppScope,
        );

        for (const content of contentList) {
          const itemRelations = await this.service.relation.formatRelationDetailResponse(
            versionItemRelation[content.id],
          );

          fileVersion.push({
            id: fileObject?.[content.fileId].id,
            name: fileObject?.[content.fileId].name,
            type: fileObject?.[content.fileId].type,
            version: versionObject?.[content.id]?.version || '',
            versionNumber: content.liveVersionNumber || versionObject?.[content.id]?.versionNumber,
            contentId: content.id,
            content: versionObject?.[content.id]?.content || {},
            relations: itemRelations,
          });
        }
      }

      return Response.success({
        pageInfo: {
          total: fileList.length,
          page: params.page,
          size: params.size,
        },
        data: fileVersion,
      });
    } catch (err) {
      return Response.error(err, i18n.condition.getPageConditionFailed);
    }
  }
}
