import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import {
  ContentVersionDetailRes,
  VersionPublishStatusReq,
} from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('components')
export class SetComponentVersionPublishStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set the release status of the component content version,
   * only the base status can be changed to other statuses, such as beta, release, etc.
   * @param  {AppContentStatusReq} params
   * @returns {Content}
   */
  @Put('/version-publish')
  @OpenAPI({
    summary: i18n.sw.setComponentVersionPublishStatus,
    description: '',
    tags: ['Component'],
    operationId: 'set-component-version-public-status',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: VersionPublishStatusReq): Promise<ResData<ContentVersion>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.version(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // TODO Need to check whether the value of status is within the specified range

      // Set publishing status
      const result = await this.service.version.live.setVersionPublishStatus(params);

      if (result.code === 1) {
        return Response.warning(i18n.component.componentVersionHasPublished);
      }

      await this.service.version.live.runTransaction();
      const versionDetail = await this.service.version.info.getDetailById(params.id);

      return Response.success(versionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.component.setComponentPublishStatusFailed);
    }
  }
}
