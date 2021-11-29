import 'reflect-metadata';

import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { FolderDetailRes } from '../../types/validates/file-validate-types';
import { ProjectDeleteReq } from '../../types/validates/project-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('projects')
export class SetFolderStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set project folder deletion status
   * @param  {ProjectDeleteReq} params
   * @returns {File}
   */
  @Put('/status')
  @OpenAPI({
    summary: i18n.sw.setProjectDeleteStatus,
    description: '',
    tags: ['Project'],
    operationId: 'set-project-delete-status',
  })
  @ResponseSchema(FolderDetailRes)
  async index(@Body() params: ProjectDeleteReq): Promise<ResData<File>> {
    try {
      const hasAuth = await this.service.auth.folder(params.projectId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const folderDetail = await this.service.folder.info.getDetailById(params.projectId);
      if (!folderDetail) {
        return Response.warning(i18n.folder.invalidFolderId);
      }

      if (folderDetail.parentFolderId === '') {
        return Response.warning(i18n.project.cannotDeleteSystemFolders);
      }

      // TODO Check delete precondition

      // Get a list of all folders, files, contents, and versions under the project
      const folderChildren = await this.service.folder.list.getAllChildrenRecursive(
        [params.projectId],
        5,
        true,
      );
      const allChildren = await this.service.folder.list.getIdsFromFolderChildren(
        folderChildren[params.projectId] || {},
      );
      allChildren.folders.push(folderDetail);

      // Set status, currently only allow deletion
      this.service.folder.info.batchSetFolderDeleteStatus(allChildren.folders);
      this.service.file.info.batchSetFileDeleteStatus(allChildren.files);
      this.service.content.info.batchSetContentDeleteStatus(allChildren.contents);
      this.service.version.info.batchSetVersionDeleteStatus(allChildren.versions);

      await this.service.folder.info.runTransaction();
      const newFolderDetail = await this.service.folder.info.getDetailById(params.projectId);

      return Response.success(newFolderDetail);
    } catch (err) {
      return Response.error(err, i18n.project.setDeleteStatusFailed);
    }
  }
}
