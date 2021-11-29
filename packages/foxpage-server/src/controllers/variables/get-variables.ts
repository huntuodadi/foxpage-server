import 'reflect-metadata';

import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { VARIABLE_TYPE } from '../../../config/constant';
import { PageContentData } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import { AppContentListRes, AppContentVersionReq } from '../../types/validates/page-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('variables')
export class GetAppVariableList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the live version details of the variable specified under the application
   * @param  {AppContentVersionReq} params
   * @returns {PageContentData[]}
   */
  @Post('/lives')
  @OpenAPI({
    summary: i18n.sw.getAppVariables,
    description: '',
    tags: ['Variable'],
    operationId: 'get-variable-live-version-list',
  })
  @ResponseSchema(AppContentListRes)
  async index(@Body() params: AppContentVersionReq): Promise<ResData<PageContentData[]>> {
    try {
      const pageList = await this.service.content.live.getContentLiveDetails({
        applicationId: params.applicationId,
        type: VARIABLE_TYPE,
        contentIds: params.ids || [],
      });

      return Response.success(_.map(pageList, 'content'));
    } catch (err) {
      return Response.error(err, i18n.variable.getAppVariableFailed);
    }
  }
}
