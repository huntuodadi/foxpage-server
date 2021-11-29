import 'reflect-metadata';

import { Content, Tag } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { TagContentVersionReq, TagVersionRelationRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

interface TagContent {
  content: Content;
}

@JsonController('content')
export class GetContentTagContent extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the content of the specified tag
   * Response：
   * {* content: {content info}}[]
   * @param  {TagContentVersionReq} params
   * @returns {ContentInfo}
   */
  @Post('/tag-contents')
  @OpenAPI({
    summary: i18n.sw.getContentTagsVersions,
    description: '',
    tags: ['Content'],
    operationId: 'get-tag-contents',
  })
  @ResponseSchema(TagVersionRelationRes)
  async index(@Body() params: TagContentVersionReq): Promise<ResData<TagContent[]>> {
    try {
      const tags = (params.tags || []) as Tag[];
      if (tags.length === 0) {
        return Response.warning(i18n.content.tagsCannotBeEmpty);
      }

      // Get qualified content details
      const contentVersionList = await this.service.content.tag.getAppContentByTags(params);

      // Return empty results
      if (contentVersionList.length === 0) {
        return Response.success([]);
      }

      const contentIds = _.map(contentVersionList, 'id');
      const contentList: Content[] = await this.service.content.info.getDetailByIds(contentIds);

      const tagContentList: TagContent[] = _.map(contentList, (content) => {
        return { content: content };
      });
      return Response.success(tagContentList || []);
    } catch (err) {
      return Response.error(err, i18n.content.getContentListFailed);
    }
  }
}
