import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppContentStatusReq, ContentVersionDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('functions')
export class SetFunctionVersionStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * 设置函数内容版本删除状态
   * @param  {AppContentStatusReq} params
   * @returns {Content}
   */
  @Put('/version-status')
  @OpenAPI({
    summary: i18n.sw.setFunctionVersionStatus,
    description: '',
    tags: ['Function'],
    operationId: 'set-function-version-status',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: AppContentStatusReq): Promise<ResData<ContentVersion>> {
    params.status = true; // Currently it is mandatory to only allow delete operations

    try {
      const hasAuth = await this.service.auth.version(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.version.info.setVersionDeleteStatus(params);

      if (result.code === 1) {
        return Response.warning(i18n.function.invalidVersionId);
      } else if (result.code === 2) {
        return Response.warning(i18n.function.versionCannotBeDeleted);
      }

      await this.service.version.info.runTransaction();
      const versionDetail = await this.service.version.info.getDetailById(params.id);

      return Response.success(versionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.function.setVersionDeletedFailed);
    }
  }
}
