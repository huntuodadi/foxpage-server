import 'reflect-metadata';

import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { RESOURCE_TYPE } from '../../../config/constant';
import { FolderPageSearch, FolderUserInfo } from '../../types/file-types';
import { PageData, ResData } from '../../types/index-types';
import { FolderListRes } from '../../types/validates/file-validate-types';
import { ResourceListReq } from '../../types/validates/resource-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resource-searchs')
export class GetResourcePageList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get a list of paging resources
   * @param  {FileListReq} params
   * @returns {FileFolderInfo}
   */
  @Get('')
  @OpenAPI({
    summary: i18n.sw.getResourceList,
    description: '',
    tags: ['Resource'],
    operationId: 'get-page-resource-list',
  })
  @ResponseSchema(FolderListRes)
  async index(@QueryParams() params: ResourceListReq): Promise<ResData<PageData<FolderUserInfo>>> {
    this.service.folder.info.setPageSize(params);

    const from: number = (params.page - 1) * params.size;
    const to: number = from + params.size;

    try {
      let searchParams: FolderPageSearch = {
        search: params.search || '',
        applicationId: params.applicationId,
        parentFolderId: params.parentFolderId,
        from: from,
        to: to,
      };

      const result = await this.service.folder.list.getFolderPageList(searchParams, RESOURCE_TYPE);

      return Response.success({
        data: result.list,
        pageInfo: {
          total: result.count || 0,
          page: params.page,
          size: params.size,
        },
      });
    } catch (err) {
      return Response.error(err, i18n.resource.getPageResourceFailed);
    }
  }
}
