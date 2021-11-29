import 'reflect-metadata';

import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { TagVersionRelation } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import { TagContentVersionReq, TagVersionRelationRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('content')
export class GetContentTagVersions extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the content and version information of the specified tag
   * Response：
   * {
   * content: {content info}
   * contentInfo: {
   *  pages: [{content version info}]，
   *  templates: [{template version info}]
   *  variables: [{variable version info}]
   *  conditions: [{condition version info}]
   *  functions: [{function version info}]
   * ....
   * }}
   * @param  {TagContentVersionReq} params
   * @returns {ContentInfo}
   */
  @Post('/tag-build-versions')
  @OpenAPI({
    summary: i18n.sw.getContentTagsBuildVersions,
    description: '',
    tags: ['Content'],
    operationId: 'get-tag-content-build-version',
  })
  @ResponseSchema(TagVersionRelationRes)
  async index(@Body() params: TagContentVersionReq): Promise<ResData<TagVersionRelation[]>> {
    try {
      console.log(params);
      return Response.success([]);
    } catch (err) {
      return Response.error(err, i18n.content.getContentListFailed);
    }
  }
}
