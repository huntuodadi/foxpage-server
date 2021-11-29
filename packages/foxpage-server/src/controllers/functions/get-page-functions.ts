import 'reflect-metadata';

import { ContentVersion, File, FileTypes } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { FUNCTION_TYPE } from '../../../config/constant';
import { ContentInfo, FileContentAndVersion } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import { AppContentListRes, AppTypePageListCommonReq } from '../../types/validates/page-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('function-searchs')
export class GetPageFunctionList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the function list information of the page under the file
   * @param  {AppPageListCommonReq} params
   * @returns {ContentInfo}
   */
  @Get('')
  @OpenAPI({
    summary: i18n.sw.getAppPageFunctions,
    description: '',
    tags: ['Function'],
    operationId: 'get-page-function-list',
  })
  @ResponseSchema(AppContentListRes)
  async index(@QueryParams() params: AppTypePageListCommonReq): Promise<ResData<ContentInfo[]>> {
    try {
      if (params.folderId) {
        const folderDetail = await this.service.folder.info.getDetailById(params.folderId);
        if (!folderDetail || folderDetail.deleted || folderDetail.applicationId !== params.applicationId) {
          return Response.warning(i18n.folder.invalidFolderId);
        }
      } else {
        params.folderId = await this.service.folder.info.getAppTypeFolderId({
          applicationId: params.applicationId,
          type: FUNCTION_TYPE,
        });
      }

      this.service.folder.info.setPageSize(params);
      const fileList = await this.service.file.list.getFileListByFolderId(params.folderId, {
        type: FUNCTION_TYPE as FileTypes,
      });

      let fileVersion: FileContentAndVersion[] = [];
      const pageFileList = _.chunk(fileList, params.size)[params.page - 1] || [];
      if (pageFileList.length > 0) {
        // Get the live details of the content of the file
        const contentList = await this.service.content.file.getContentByFileIds(_.map(pageFileList, 'id'));
        const versionList = await this.service.version.number.getContentByIdNumber(
          _.map(contentList, (content) => {
            return { contentId: content.id, versionNumber: content.liveVersionNumber };
          }),
        );
        const fileObject: Record<string, File> = _.keyBy(pageFileList, 'id');
        const versionObject: Record<string, ContentVersion> = _.keyBy(versionList, 'contentId');

        contentList.forEach((content) => {
          fileVersion.push({
            id: fileObject?.[content.fileId].id,
            name: fileObject?.[content.fileId].name,
            type: fileObject?.[content.fileId].type,
            version: versionObject?.[content.id]?.version || '',
            versionNumber: content.liveVersionNumber || versionObject?.[content.id]?.versionNumber,
            contentId: content.id,
            content: versionObject?.[content.id]?.content || {},
          });
        });
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
      return Response.error(err, i18n.function.getPageFunctionFailed);
    }
  }
}
