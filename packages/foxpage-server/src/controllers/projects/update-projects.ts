import 'reflect-metadata';

import { Folder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { AppTypeFolderUpdate } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { ProjectDetailRes, UpdateProjectDetailReq } from '../../types/validates/project-validate-types';
import * as Response from '../../utils/response';
import { checkName } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('projects')
export class UpdateProjectDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update project details, only name, path and introduction can be updated
   * @param  {UpdateProjectDetailReq} params
   * @returns {Folder}
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateProjectDetail,
    description: '/project/detail',
    tags: ['Project'],
    operationId: 'update-project-detail',
  })
  @ResponseSchema(ProjectDetailRes)
  async index(@Body() params: UpdateProjectDetailReq): Promise<ResData<Folder>> {
    try {
      const hasAuth = await this.service.auth.folder(params.projectId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      if (params.name && !checkName(params.name)) {
        return Response.warning(i18n.folder.invalidName);
      }

      const folderDetail: AppTypeFolderUpdate = Object.assign(_.omit(params, ['path', 'projectId']), {
        id: params.projectId,
        folderPath: params.path || undefined,
      });

      const result = await this.service.folder.info.updateTypeFolderDetail(folderDetail);

      if (result.code === 1) {
        return Response.warning(i18n.folder.invalidFolderId);
      } else if (result.code === 2) {
        return Response.warning(i18n.folder.nameExist);
      }

      await this.service.folder.info.runTransaction();
      const newFolderDetail = await this.service.folder.info.getDetailById(params.projectId);

      return Response.success(newFolderDetail || {});
    } catch (err) {
      return Response.error(err, i18n.project.updateProjectFailed);
    }
  }
}
