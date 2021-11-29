import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { ContentVersionBaseDetailRes } from '../../types/validates/content-validate-types';
import { ResourceContentDetailReq } from '../../types/validates/resource-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class GetResourceContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the content details of the specified resource
   * @param  {FileListReq} params
   * @returns {FileFolderInfo}
   */
  @Get('/content-info')
  @OpenAPI({
    summary: i18n.sw.getResourceContentDetail,
    description: '',
    tags: ['Resource'],
    operationId: 'get-resource-content-detail',
  })
  @ResponseSchema(ContentVersionBaseDetailRes)
  async index(@QueryParams() params: ResourceContentDetailReq): Promise<ResData<ContentVersion>> {
    let { id = '', fileId = '' } = params;
    if (!id && !fileId) {
      return Response.warning(i18n.resource.fileIdOrContentIdMustPassOne);
    }

    try {
      // Get content ID
      if (!id) {
        const contentList = await this.service.content.file.getContentByFileIds([fileId]);

        if (contentList.length === 0) {
          return Response.warning(i18n.resource.invalidResourceFileId);
        }

        id = contentList[0].id;
      }

      // Get version details
      const versionDetail = await this.service.version.number.getContentByNumber({
        contentId: id,
        versionNumber: 1,
      });

      return Response.success(versionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.resource.getResourceDetailFailed);
    }
  }
}
