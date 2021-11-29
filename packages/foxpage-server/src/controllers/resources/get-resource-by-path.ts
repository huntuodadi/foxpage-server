import 'reflect-metadata';

import { Content, ContentVersion, Folder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { RESOURCE_TYPE } from '../../../config/constant';
import { FileFolderChildren, FileFolderContentChildren, FolderChildren } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { FileListRes } from '../../types/validates/file-validate-types';
import { ResourcePathDetailReq } from '../../types/validates/resource-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class GetResourceDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Obtain the specified resource details through the path
   * @param  {FileListReq} params
   * @returns {FileFolderInfo}
   */
  @Get('/by-paths')
  @OpenAPI({
    summary: i18n.sw.getResourceDetailByPath,
    description: '',
    tags: ['Resource'],
    operationId: 'get-resource-detail-by-path',
  })
  @ResponseSchema(FileListRes)
  async index(@QueryParams() params: ResourcePathDetailReq): Promise<ResData<FolderChildren>> {
    const depth: number = params.depth && params.depth > 0 && params.depth < 6 ? params.depth : 5;

    try {
      const pathList: string[] = params.path.split('/');
      const typeId = await this.service.folder.info.getAppTypeFolderId({
        applicationId: params.applicationId,
        type: RESOURCE_TYPE,
      });

      const folderId = await this.service.folder.info.getFolderIdByPathRecursive({
        applicationId: params.applicationId,
        parentFolderId: typeId,
        pathList,
      });

      let resourceDetail: Partial<FolderChildren> = {};
      if (folderId) {
        const folderDetail: Folder = await this.service.folder.info.getDetailById(folderId);
        // Get all the sub-file information of the resource file
        const resourceChildren = await this.service.folder.list.getAllChildrenRecursive([folderId], depth);
        resourceDetail = Object.assign({}, folderDetail, { children: resourceChildren[folderId] || {} });

        const fileIds = this.service.file.info.getFileIdFromResourceRecursive(
          resourceDetail.children as FileFolderChildren,
        );

        // TODO (To be optimized) Get the content of the file and put it under the file details
        const contentList = await this.service.content.file.getContentByFileIds(fileIds);
        const versionList = await this.service.version.info.find({
          contentId: { $in: _.map(contentList, 'id') },
          deleted: false,
        });

        // Compatible with the prefix '/' of realPath in file
        const contentObject: Record<string, Content> = _.keyBy(contentList, 'fileId');
        const versionObject: Record<string, ContentVersion> = {};
        versionList.forEach((version) => {
          if (version.content?.realPath) {
            version.content.realPath = '/' + _.pull(version.content.realPath.split('/'), '').join('/');
          }
          versionObject[version.contentId] = version;
        });
        resourceDetail.children = this.service.file.info.addContentToFileRecursive(
          resourceDetail.children as FileFolderContentChildren,
          contentObject,
          versionObject,
        );
      }

      return Response.success(resourceDetail || {});
    } catch (err) {
      return Response.error(err, i18n.resource.getResourceDetailFailed);
    }
  }
}
