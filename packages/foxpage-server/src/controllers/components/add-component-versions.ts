import 'reflect-metadata';

import { Content, ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_CONTENT_VERSION } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { ContentVersionDetailRes, ContentVersionReq } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('components')
export class AddComponentVersionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create component version information
   * @param  {ContentVersionReq} params
   * @param  {Header} headers
   * @returns {ContentVersion}
   */
  @Post('/versions')
  @OpenAPI({
    summary: i18n.sw.addComponentVersionDetail,
    description: '',
    tags: ['Component'],
    operationId: 'add-component-version-detail',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: ContentVersionReq): Promise<ResData<ContentVersion>> {
    try {
      // Get versionNumber from version
      const versionNumber = this.service.version.number.createNumberFromVersion(params.version);
      if (!versionNumber) {
        return Response.warning(i18n.content.invalidVersion + '"' + params.version + '"');
      }

      // Check the validity of contents and versions
      let contentDetail: Content;
      let isNewVersion: boolean = false;
      [contentDetail, isNewVersion] = await Promise.all([
        this.service.content.info.getDetailById(params.contentId),
        this.service.version.check.isNewVersion(params.contentId, versionNumber),
      ]);

      if (!contentDetail || contentDetail.deleted || !isNewVersion) {
        return Response.warning(i18n.content.invalidContentIdOrVersionExist);
      }

      // Check the required fields of content
      const missingFields = await this.service.version.check.contentFields(
        contentDetail.fileId,
        params.content || {},
      );

      if (missingFields.length > 0) {
        return Response.warning(i18n.content.contentMissFields + ':' + missingFields.join(','));
      }

      !params.content && (params.content = {});
      params.content.id = params.contentId;

      // Save new version info
      const newVersionDetail: Partial<ContentVersion> = {
        id: generationId(PRE_CONTENT_VERSION),
        contentId: params.contentId,
        version: params.version,
        versionNumber: versionNumber,
        content: params.content,
      };
      this.service.version.info.create(newVersionDetail);

      await this.service.version.info.runTransaction();
      const versionDetail = await this.service.version.info.getDetailById(newVersionDetail.id as string);

      return Response.success(versionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.content.addContentVersionFailed);
    }
  }
}
