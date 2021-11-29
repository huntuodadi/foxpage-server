import 'reflect-metadata';

import { AppResource } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { RESOURCE_TYPE } from '../../../config/constant';
import { FolderResourceGroup } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { FileListRes } from '../../types/validates/file-validate-types';
import { ResourceInfoReq } from '../../types/validates/resource-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class GetResourceDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the details of the specified resource
   * @param  {FileListReq} params
   * @returns {FileFolderInfo}
   */
  @Get('/groups')
  @OpenAPI({
    summary: i18n.sw.getResourceGroupDetail,
    description: '',
    tags: ['Resource'],
    operationId: 'get-resource-group-detail',
  })
  @ResponseSchema(FileListRes)
  async index(@QueryParams() params: ResourceInfoReq): Promise<ResData<FolderResourceGroup>> {
    let { id = '', path = '' } = params;
    if (!id && !path) {
      return Response.warning(i18n.resource.nameOrPathMustPassOne);
    }

    try {
      // Get id by path
      if (!id) {
        const parentFolderId = await this.service.folder.info.getAppTypeFolderId({
          applicationId: params.applicationId,
          type: RESOURCE_TYPE,
        });

        if (parentFolderId) {
          const folderDetail = await this.service.folder.info.getDetail({
            parentFolderId,
            folderPath: path,
            deleted: false,
          });
          id = folderDetail.id || '';
        }

        if (!parentFolderId || !id) {
          return Response.warning(i18n.resource.invalidNameOrPath);
        }
      }

      let responseData = {};
      if (id) {
        const folderDetail = await this.service.folder.info.getDetail({
          applicationId: params.applicationId,
          id,
        });

        // Get type information of resource group
        let resourceTypeDetail: Partial<AppResource> = {};
        if (folderDetail) {
          const folderResource: any = folderDetail.tags?.find((tag) => tag.resourceId);
          if (folderResource && folderResource.resourceId) {
            resourceTypeDetail = await this.service.application.getAppResourceDetail({
              applicationId: params.applicationId,
              id: folderResource.resourceId || '',
            });
          }
        }
        responseData = folderDetail ? Object.assign({}, folderDetail, { group: resourceTypeDetail }) : {};
      }

      return Response.success(responseData);
    } catch (err) {
      return Response.error(err, i18n.resource.getResourceGroupDetailFailed);
    }
  }
}
