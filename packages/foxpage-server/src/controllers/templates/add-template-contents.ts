import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { TEMPLATE_TYPE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { AddContentReq, ContentBaseDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('templates')
export class AddTemplateContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create template content details
   * @param  {FileDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('/contents')
  @OpenAPI({
    summary: i18n.sw.addTemplateContentDetail,
    description: '',
    tags: ['Template'],
    operationId: 'add-template-content-detail',
  })
  @ResponseSchema(ContentBaseDetailRes)
  async index(@Body() params: AddContentReq): Promise<ResData<Content>> {
    try {
      const contentParams: Partial<Content> = {
        title: params.title,
        fileId: params.fileId,
        tags: params.tags || [],
      };

      const contentDetail = this.service.content.info.addContentDetail(contentParams, TEMPLATE_TYPE);

      await this.service.content.info.runTransaction();
      const templateContentDetail = await this.service.content.info.getDetailById(contentDetail.id || '');

      return Response.success(templateContentDetail);
    } catch (err) {
      return Response.error(err, i18n.template.addNewTemplateContentFailed);
    }
  }
}
