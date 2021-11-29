import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PAGE_TYPE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { AddContentReq, ContentBaseDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('pages')
export class AddPageContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * New page content details
   * @param  {FileDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('/contents')
  @OpenAPI({
    summary: i18n.sw.addPageContentDetail,
    description: '',
    tags: ['Page'],
    operationId: 'add-page-content-detail',
  })
  @ResponseSchema(ContentBaseDetailRes)
  async index(@Body() params: AddContentReq): Promise<ResData<Content>> {
    try {
      // Check if the name already exists
      const nameExist = await this.service.content.check.checkExist({
        title: params.title,
        fileId: params.fileId,
        deleted: false,
      });
      if (nameExist) {
        return Response.warning(i18n.page.pageNameExist);
      }

      const contentParams: Partial<Content> = {
        title: params.title,
        fileId: params.fileId,
        tags: params.tags || [],
      };
      const contentDetail = this.service.content.info.addContentDetail(contentParams, PAGE_TYPE);

      await this.service.content.info.runTransaction();

      return Response.success(contentDetail);
    } catch (err) {
      return Response.error(err, i18n.page.addNewPageContentFailed);
    }
  }
}
