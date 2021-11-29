import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppContentStatusReq, ContentDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class SetResourceContentStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set resource content deletion status
   * @param  {AppContentStatusReq} params
   * @returns {Content}
   */
  @Put('/content-status')
  @OpenAPI({
    summary: i18n.sw.setResourceContentStatus,
    description: '',
    tags: ['Resource'],
    operationId: 'set-resource-content-status',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: AppContentStatusReq): Promise<ResData<Content>> {
    params.status = true; // Currently it is mandatory to only allow delete operations

    try {
      const hasAuth = await this.service.auth.content(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.content.info.setContentDeleteStatus(params);
      if (result.code === 1) {
        return Response.warning(i18n.resource.invalidResourceContentId);
      } else if (result.code === 2) {
        return Response.warning(i18n.resource.contentCannotBeDeleted);
      }

      await this.service.content.info.runTransaction();
      const contentDetail = await this.service.content.info.getDetailById(params.id);

      return Response.success(contentDetail || {});
    } catch (err) {
      return Response.error(err, i18n.resource.setResourceContentDeletedFailed);
    }
  }
}
