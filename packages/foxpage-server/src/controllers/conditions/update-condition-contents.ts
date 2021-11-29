import 'reflect-metadata';

import { Content, FileTypes } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { CONDITION_TYPE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { ContentDetailRes, UpdateContentReq } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('conditions')
export class UpdateContentBaseDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * The content information of the update condition, including the title and tags fields
   * @param  {UpdateContentReq} params
   * @returns {Content}
   */
  @Put('/contents')
  @OpenAPI({
    summary: i18n.sw.updateConditionDetail,
    description: '',
    tags: ['Condition'],
    operationId: 'update-condition-content-detail',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: UpdateContentReq): Promise<ResData<Content>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.content(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.content.info.updateContentDetail(
        Object.assign({}, params, { type: CONDITION_TYPE as FileTypes }),
      );

      if (result.code === 1) {
        return Response.warning(i18n.condition.invalidConditionId);
      } else if (result.code === 2) {
        return Response.warning(i18n.condition.invalidIdType);
      } else if (result.code === 3) {
        return Response.warning(i18n.condition.conditionNameExist);
      }

      await this.service.content.info.runTransaction();
      const contentDetail = await this.service.content.info.getDetailById(params.id);

      return Response.success(contentDetail || {});
    } catch (err) {
      return Response.error(err, i18n.condition.updateConditionFailed);
    }
  }
}
