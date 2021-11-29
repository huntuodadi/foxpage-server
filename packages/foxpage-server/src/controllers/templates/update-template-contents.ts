import 'reflect-metadata';

import { Content, FileTypes } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { TEMPLATE_TYPE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { ContentDetailRes, UpdateContentReq } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('templates')
export class UpdateTemplateContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update the content information of the template, including title and tags fields
   * @param  {UpdateContentReq} params
   * @returns {Content}
   */
  @Put('/contents')
  @OpenAPI({
    summary: i18n.sw.updateTemplateContentDetail,
    description: '/template/detail',
    tags: ['Template'],
    operationId: 'update-template-content-detail',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: UpdateContentReq): Promise<ResData<Content>> {
    try {
      const hasAuth = await this.service.auth.content(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.content.info.updateContentDetail(
        Object.assign({}, params, { type: TEMPLATE_TYPE as FileTypes }),
      );

      if (result.code === 1) {
        return Response.warning(i18n.template.invalidTemplateContentId);
      } else if (result.code === 2) {
        return Response.warning(i18n.template.invalidIdType);
      } else if (result.code === 3) {
        return Response.warning(i18n.template.templateNameExist);
      }

      await this.service.content.info.runTransaction();
      const contentDetail = await this.service.content.info.getDetailById(params.id);

      return Response.success(contentDetail || {});
    } catch (err) {
      return Response.error(err, i18n.template.updateTemplateContentFailed);
    }
  }
}
