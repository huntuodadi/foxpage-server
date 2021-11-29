import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { ContentChangeReq, ContentDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('contents')
export class AddContentBaseDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get changed content information under the application
   * @param  {ContentChangeReq} params
   * @param  {Header} headers
   * @returns Content
   */
  @Get('/changes')
  @OpenAPI({
    summary: i18n.sw.getContentChangeList,
    description: '',
    tags: ['Content'],
    operationId: 'get-content-change-list',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@QueryParams() params: ContentChangeReq): Promise<ResData<Content>> {
    try {
      const currentTimeStamp: number = Date.now();

      // Get all content data that has changed
      const logChanges = await this.service.logSingleton.getInstance().getChangesContentList(params);

      return Response.success({ contents: logChanges, timestamp: currentTimeStamp });
    } catch (err) {
      return Response.error(err, i18n.content.getContentChangesFailed);
    }
  }
}
