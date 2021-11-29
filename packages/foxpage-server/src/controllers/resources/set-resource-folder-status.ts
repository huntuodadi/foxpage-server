import 'reflect-metadata';

import { Folder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppContentStatusReq } from '../../types/validates/content-validate-types';
import { FolderDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class SetResourceFolderStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set the delete status of the resource folder
   * @param  {AppContentStatusReq} params
   * @returns {Folder}
   */
  @Put('/folder-status')
  @OpenAPI({
    summary: i18n.sw.setResourceFolderStatus,
    description: '',
    tags: ['Resource'],
    operationId: 'set-resource-folder-status',
  })
  @ResponseSchema(FolderDetailRes)
  async index(@Body() params: AppContentStatusReq): Promise<ResData<Folder>> {
    params.status = true; // Currently it is mandatory to only allow delete operations

    try {
      const hasAuth = await this.service.auth.folder(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.folder.info.setFolderDeleteStatus(params);
      if (result.code === 1) {
        return Response.warning(i18n.folder.invalidFolderId);
      } else if (result.code === 2) {
        return Response.warning(i18n.resource.folderCannotBeDeleted);
      }

      await this.service.folder.info.runTransaction();
      const folderDetail = await this.service.folder.info.getDetailById(params.id);

      return Response.success(folderDetail || {});
    } catch (err) {
      return Response.error(err, i18n.resource.setResourceFolderDeletedFailed);
    }
  }
}
