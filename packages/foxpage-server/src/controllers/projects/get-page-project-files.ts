import 'reflect-metadata';

import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PAGE_TYPE, TEMPLATE_TYPE } from '../../../config/constant';
import { FileFolderInfo } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { FileFolderListRes, FileListReq } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('projects')
export class GetProjectFileList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the list of paging files under the project
   * @param  {ProjectListReq} params
   * @param  {Header} headers
   * @returns {FileFolderInfo}
   */
  @Get('/files')
  @OpenAPI({
    summary: i18n.sw.getPageProjectFiles,
    description: '',
    tags: ['Project'],
    operationId: 'get-page-project-files',
  })
  @ResponseSchema(FileFolderListRes)
  async index(@QueryParams() params: FileListReq): Promise<ResData<FileFolderInfo>> {
    try {
      this.service.folder.list.setPageSize(params);

      const childrenList: {
        count: number;
        data: FileFolderInfo;
      } = await this.service.folder.list.getPageChildrenList(params, [TEMPLATE_TYPE, PAGE_TYPE]);

      return Response.success({
        pageInfo: {
          page: params.page || 1,
          size: params.size || 10,
          total: childrenList.count,
        },
        data: childrenList.data || [],
      });
    } catch (err) {
      return Response.error(err, i18n.project.getChildrenFilesFailed);
    }
  }
}
