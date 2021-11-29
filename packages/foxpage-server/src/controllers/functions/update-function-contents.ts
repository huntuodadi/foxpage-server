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

@JsonController('functions')
export class UpdateFunctionContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update the content information of the function, including title and tags fields
   * @param  {UpdateContentReq} params
   * @returns {Content}
   */
  @Put('/contents')
  @OpenAPI({
    summary: i18n.sw.updateFunctionContentDetail,
    description: '',
    tags: ['Function'],
    operationId: 'update-function-content-detail',
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
        return Response.warning(i18n.function.invalidContentId);
      } else if (result.code === 2) {
        return Response.warning(i18n.function.invalidIdType);
      } else if (result.code === 3) {
        return Response.warning(i18n.function.nameExist);
      }

      await this.service.content.info.runTransaction();
      const contentDetail = await this.service.content.info.getDetailById(params.id);

      return Response.success(contentDetail || {});
    } catch (err) {
      return Response.error(err, i18n.function.updateFunctionContentFailed);
    }
  }
}
