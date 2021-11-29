import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { VERSION_STATUS_BASE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { ComponentVersionUpdateReq } from '../../types/validates/component-validate-types';
import { ContentVersionDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('components')
export class UpdateComponentVersionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update component version information
   * @param  {ContentVersionUpdateReq} params
   * @returns {ContentVersion}
   */
  @Put('/versions')
  @OpenAPI({
    summary: i18n.sw.updateComponentVersionDetail,
    description: '/component/version/detail',
    tags: ['Component'],
    operationId: 'update-component-version-detail',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: ComponentVersionUpdateReq): Promise<ResData<ContentVersion>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.version(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Check the validity of the version ID
      const versionDetail = await this.service.version.info.getDetailById(params.id);
      if (!versionDetail || versionDetail.deleted) {
        return Response.warning(i18n.content.invalidVersionId);
      }

      if (versionDetail.status !== VERSION_STATUS_BASE) {
        return Response.warning(i18n.content.unEditedStatus);
      }

      // Check content required fields
      !params.content && (params.content = {} as any);
      params.content.id = versionDetail.contentId;
      const contentDetail = await this.service.content.info.getDetailById(versionDetail.contentId);
      // Check the required fields of content
      const missingFields = await this.service.version.check.contentFields(
        contentDetail.fileId,
        params.content,
      );

      if (missingFields.length > 0) {
        return Response.warning(i18n.content.contentMissFields + ':' + missingFields.join(','));
      }

      // Check the validity of the version
      if (params.version && params.version !== versionDetail.version) {
        const newVersionDetail = await this.service.version.info.getDetail({
          contentId: versionDetail.id,
          version: params.version,
          deleted: false,
        });
        if (newVersionDetail && newVersionDetail.id !== versionDetail.id) {
          return Response.warning(i18n.component.versionExist);
        }
      }

      // Save new version information
      const result = await this.service.component.updateVersionDetail({
        applicationId: params.applicationId,
        id: params.id,
        content: params.content,
        version: params.version || versionDetail.version,
      });

      if (result.code === 1) {
        return Response.warning(i18n.component.missingFields + (result?.data as string[]).join(','));
      }

      await this.service.version.info.runTransaction();
      const newVersionDetail = await this.service.version.info.getDetailById(params.id);

      return Response.success(newVersionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.component.updateComponentVersionFailed);
    }
  }
}
