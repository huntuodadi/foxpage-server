import 'reflect-metadata';

import { Content, ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_CONTENT_VERSION } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { ContentVersionDetailRes } from '../../types/validates/content-validate-types';
import { UpdateResourceContentReq } from '../../types/validates/resource-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class AddAssetContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update resource content information, need to update file name, content name
   * @param  {ContentVersionDetailRes} params
   * @param  {Header} headers
   * @returns {ContentVersion}
   */
  @Put('/contents')
  @OpenAPI({
    summary: i18n.sw.updateResourceContentDetail,
    description: '',
    tags: ['Resource'],
    operationId: 'update-resource-content-detail',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: UpdateResourceContentReq): Promise<ResData<ContentVersion>> {
    try {
      const hasAuth = await this.service.auth.file(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // TODO Need to optimize access to content details and check the validity of the content
      const [fileDetail, contentList] = await Promise.all([
        this.service.file.info.getDetailById(params.id),
        this.service.content.file.getContentByFileIds([params.id]),
      ]);

      const newFileName = _.last(params.content.realPath.split('/')) || '';
      if (!newFileName) {
        return Response.warning(i18n.resource.invalidName);
      }

      const contentDetail: Content = contentList[0] || {};
      const folderId = fileDetail.folderId || '';

      // Get resource version details
      let [versionDetail, checkFileDetail] = await Promise.all([
        this.service.version.info.getDetail({ contentId: contentDetail.id, deleted: false }),
        this.service.file.info.getDetail({
          applicationId: params.applicationId,
          folderId,
          name: newFileName,
          deleted: false,
        }),
      ]);

      if (checkFileDetail && checkFileDetail.id !== fileDetail.id) {
        return Response.warning(i18n.resource.nameExist);
      }

      const versionId: string = versionDetail ? versionDetail.id : generationId(PRE_CONTENT_VERSION);
      if (versionDetail) {
        this.service.version.info.updateVersionItem(versionDetail.id, { content: params.content });
        this.service.content.info.updateContentItem(contentDetail.id, { title: newFileName });
        this.service.file.info.updateFileItem(params.id, { name: newFileName });
      } else {
        // Create version details if it does not exist
        const newVersionDetail: Partial<ContentVersion> = {
          id: versionId,
          contentId: params.id,
          status: 'release',
          version: '',
          versionNumber: 0,
          content: params.content,
        };
        this.service.version.info.create(newVersionDetail);
        this.service.content.info.updateContentItem(params.id, { title: newFileName });
        this.service.file.info.updateFileItem(fileDetail.id, { name: newFileName });
      }

      await this.service.content.info.runTransaction();

      versionDetail = await this.service.version.info.getDetailById(versionId);

      return Response.success(versionDetail);
    } catch (err) {
      return Response.error(err, i18n.resource.updateAssetContentFailed);
    }
  }
}
