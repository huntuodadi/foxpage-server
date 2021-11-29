import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import {
  ContentVersionBaseUpdateReq,
  ContentVersionDetailRes,
} from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('conditions')
export class UpdateConditionVersionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update the version content of the conditional content base
   * @param  {ContentVersionBaseUpdateReq} params
   * @returns {ContentVersion}
   */
  @Put('/base-versions')
  @OpenAPI({
    summary: i18n.sw.updateConditionBaseVersionDetail,
    description: '',
    tags: ['Condition'],
    operationId: 'update-condition-base-version-detail',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: ContentVersionBaseUpdateReq): Promise<ResData<ContentVersion>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.content(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Get the version number of base
      const versionDetail = await this.service.version.info.getMaxBaseContentVersionDetail(params.id);
      if (!versionDetail) {
        return Response.warning(i18n.condition.invalidContentId);
      }

      const versionParams = Object.assign({}, params, _.pick(versionDetail, ['id', 'version']));
      const result = await this.service.version.info.updateVersionDetail(versionParams);

      if (result.code === 1) {
        return Response.warning(i18n.condition.invalidVersionId);
      } else if (result.code === 2) {
        return Response.warning(i18n.condition.unEditedStatus);
      } else if (result.code === 3) {
        return Response.warning(i18n.condition.versionExist);
      } else if (result.code === 4) {
        return Response.warning(i18n.condition.missingFields + (result?.data as string[]).join(','));
      }

      await this.service.version.info.runTransaction();
      const contentVersionDetail = await this.service.version.info.getDetailById(params.id);

      return Response.success(contentVersionDetail);
    } catch (err) {
      return Response.error(err, i18n.content.updateConditionVersionFailed);
    }
  }
}
