import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PAGE_TYPE } from '../../../config/constant';
import { PageContentData } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import { AppContentListRes, AppContentVersionReq } from '../../types/validates/page-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('pages')
export class GetPageLivesList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the live version details of the specified page under the application
   * @param  {AppContentVersionReq} params
   * @returns {PageContentData[]}
   */
  @Post('/lives')
  @OpenAPI({
    summary: i18n.sw.getAppPages,
    description: '',
    tags: ['Page'],
    operationId: 'get-page-live-version-list',
  })
  @ResponseSchema(AppContentListRes)
  async index(@Body() params: AppContentVersionReq): Promise<ResData<PageContentData[]>> {
    try {
      const pageList: ContentVersion[] = await this.service.content.live.getContentLiveDetails({
        applicationId: params.applicationId,
        type: PAGE_TYPE,
        contentIds: params.ids || [],
      });

      return Response.success(_.map(pageList, 'content'));
    } catch (err) {
      return Response.error(err, i18n.condition.getAppPageFailed);
    }
  }
}
