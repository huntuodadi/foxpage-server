import 'reflect-metadata';

import { Content, FileTypes } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { VARIABLE_TYPE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { ContentDetailRes, UpdateContentReq } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('variables')
export class UpdateVariableContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update the content information of variables, including title and tags fields
   * @param  {UpdateContentReq} params
   * @returns {Content}
   */
  @Put('/contents')
  @OpenAPI({
    summary: i18n.sw.updateVariableContentDetail,
    description: '',
    tags: ['Variable'],
    operationId: 'update-variable-content-detail',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: UpdateContentReq): Promise<ResData<Content>> {
    try {
      const hasAuth = await this.service.auth.content(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.content.info.updateContentDetail(
        Object.assign({}, params, { type: VARIABLE_TYPE as FileTypes }),
      );

      if (result.code === 1) {
        return Response.warning(i18n.variable.invalidVariableContentId);
      } else if (result.code === 2) {
        return Response.warning(i18n.variable.invalidIdType);
      } else if (result.code === 3) {
        return Response.warning(i18n.variable.variableNameExist);
      }

      await this.service.content.info.runTransaction();
      const contentDetail = await this.service.content.info.getDetailById(params.id);

      return Response.success(contentDetail || {});
    } catch (err) {
      return Response.error(err, i18n.variable.updateVariableContentFailed);
    }
  }
}
