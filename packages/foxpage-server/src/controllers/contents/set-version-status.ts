import 'reflect-metadata';

import { ContentStatus, ContentVersion } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { ContentStatusReq, ContentVersionDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('content')
export class SetContentVersionStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set the status of the page version， base, discard, beta, alpha, release...
   * @param  {ContentStatusReq} params
   * @returns {ContentVersion}
   */
  @Put('/version/status')
  @OpenAPI({
    summary: i18n.sw.setContentVersionStatus,
    description: '',
    tags: ['Content'],
    operationId: 'set-content-version-status',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: ContentStatusReq): Promise<ResData<ContentVersion>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.version(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Check the validity of the current page ID
      let contentDetail = await this.service.version.info.getDetailById(params.id);
      if (!contentDetail || contentDetail.deleted) {
        return Response.warning(i18n.content.invalidContentId);
      }

      // TODO: Set the preconditions for the page version status,
      // for example, release needs to check the components in the dsl, and the relation-related status is release

      this.service.version.info.updateVersionItem(params.id, { status: params.status as ContentStatus });

      await this.service.version.info.runTransaction();
      contentDetail = await this.service.version.info.getDetailById(params.id);

      return Response.success(contentDetail);
    } catch (err) {
      return Response.error(err, i18n.content.setContentVersionStatusFailed);
    }
  }
}
