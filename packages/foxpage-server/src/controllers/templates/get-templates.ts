import 'reflect-metadata';

import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { TEMPLATE_TYPE } from '../../../config/constant';
import { PageContentData } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import { AppContentListRes, AppContentVersionReq } from '../../types/validates/page-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('templates')
export class GetAppTemplateList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the live version details of the specified template under the application
   * @param  {AppContentVersionReq} params
   * @returns {PageContentData[]}
   */
  @Post('/lives')
  @OpenAPI({
    summary: i18n.sw.getAppTemplates,
    description: '',
    tags: ['Template'],
    operationId: 'get-template-live-version-list',
  })
  @ResponseSchema(AppContentListRes)
  async index(@Body() params: AppContentVersionReq): Promise<ResData<PageContentData[]>> {
    try {
      const pageList = await this.service.content.live.getContentLiveDetails({
        applicationId: params.applicationId,
        type: TEMPLATE_TYPE,
        contentIds: params.ids || [],
      });

      return Response.success(_.map(pageList, 'content'));
    } catch (err) {
      return Response.error(err, i18n.template.getAppTemplatesFailed);
    }
  }
}
