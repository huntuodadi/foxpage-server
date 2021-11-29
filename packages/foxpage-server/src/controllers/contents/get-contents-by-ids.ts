import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { ContentDetailRes, ContentDetailsReq } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('contents')
export class GetContentDetails extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get page details through contentIds
   * @param  {ContentListReq} params
   * @returns {ContentInfo}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.getContentDetails,
    description: '',
    tags: ['Content'],
    operationId: 'get-content-details',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: ContentDetailsReq): Promise<ResData<Content[]>> {
    try {
      let contentList = await this.service.content.info.getDetailByIds(params.contentIds);

      // Check whether the content belongs to the specified application
      const fileList = await this.service.file.info.getDetailByIds(_.map(contentList, 'fileId'));
      const appFileIds: string[] = [];
      fileList.forEach((file) => {
        if (!file.deleted && file.applicationId === params.applicationId) {
          appFileIds.push(file.id);
        }
      });

      contentList = _.filter(
        contentList,
        (content) => !content.deleted && appFileIds.indexOf(content.fileId) !== -1,
      );

      return Response.success(contentList);
    } catch (err) {
      return Response.error(err, i18n.content.getContentDetailsFailed);
    }
  }
}
