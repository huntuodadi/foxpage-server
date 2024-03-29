import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppFileContentStatusReq, ContentDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class SetResourceFileContentStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set resource folder, file, content deletion status
   * @param  {AppFileContentStatusReq} params
   * @returns {Content}
   */
  @Put('/status')
  @OpenAPI({
    summary: i18n.sw.setResourceFileContentStatus,
    description: '',
    tags: ['Resource'],
    operationId: 'set-resource-file-content-status',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: AppFileContentStatusReq): Promise<ResData<Content>> {
    try {
      params.status = true; // Currently it is mandatory to only allow delete operations

      // TODO Need to find the uppermost id verification authority
      // const hasAuth = await this.service.auth.file(params.id);
      // if (!hasAuth) {
      //   return Response.accessDeny(i18n.system.accessDeny);
      // }

      // Check whether the folder is a resource folder,
      // there are at least two levels of folders in the resource group and above
      let invalidFolderIds: string[] = [];
      const folderObject = await this.service.folder.list.getAllParentsRecursive(params.ids);
      invalidFolderIds = params.ids.filter(
        (folderId) => folderObject[folderId] && folderObject[folderId].length < 3,
      );

      if (invalidFolderIds.length > 0) {
        return Response.warning(i18n.resource.invalidResourceFolderId + ': ' + invalidFolderIds.join(','));
      }

      // Get folder, file details
      const [folderList, fileList] = await Promise.all([
        this.service.folder.info.getDetailByIds(params.ids),
        this.service.file.info.getDetailByIds(params.ids),
      ]);

      const validFolderIds: string[] = [];
      folderList.forEach((folder) => {
        folder.applicationId === params.applicationId && validFolderIds.push(folder.id);
      });

      const validFileIds: string[] = [];
      fileList.forEach((file) => {
        file.applicationId === params.applicationId && validFileIds.push(file.id);
      });

      this.service.folder.info.setDeleteStatus(validFolderIds, true);
      this.service.file.info.setDeleteStatus(validFileIds, true);

      await this.service.folder.info.runTransaction();

      return Response.success(i18n.resource.setResourceStatusSuccess);
    } catch (err) {
      return Response.error(err, i18n.resource.setResourceContentDeletedFailed);
    }
  }
}
