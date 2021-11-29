import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import {
  ContentVersionDetailRes,
  ContentVersionUpdateReq,
} from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('conditions')
export class UpdateConditionVersionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update condition content version information, including version number and content
   * @param  {ContentVersionUpdateReq} params
   * @returns {ContentVersion}
   */
  @Put('/versions')
  @OpenAPI({
    summary: i18n.sw.updateConditionVersionDetail,
    description: '/condition/version/detail',
    tags: ['Condition'],
    operationId: 'update-condition-version-detail',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: ContentVersionUpdateReq): Promise<ResData<ContentVersion>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.content(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.version.info.updateVersionDetail(params);

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
      const contentVersionDetail = await this.service.content.info.getDetailById(result.data as string);

      return Response.success(contentVersionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.content.updateConditionVersionFailed);
    }
  }
}
