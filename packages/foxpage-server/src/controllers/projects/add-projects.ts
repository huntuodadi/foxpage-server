import 'reflect-metadata';

import { Folder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, HeaderParams, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_FOLDER, PROJECT_TYPE } from '../../../config/constant';
import { Header, ResData } from '../../types/index-types';
import { AddProjectDetailReq, ProjectDetailRes } from '../../types/validates/project-validate-types';
import * as Response from '../../utils/response';
import { checkName, formatToPath, generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('projects')
export class AddProjectDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create Project
   * 1, Get the parent folder Id of the project under the application
   * 2. Check if the project name is duplicated
   * 3, Create
   * @param  {FolderDetailReq} params
   * @param  {Header} headers
   * @returns {Folder}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addProjectDetail,
    description: '/project/detail',
    tags: ['Project'],
    operationId: 'add-project-detail',
  })
  @ResponseSchema(ProjectDetailRes)
  async index(
    @Body() params: AddProjectDetailReq,
    @HeaderParams() headers: Header,
  ): Promise<ResData<Folder>> {
    if (!checkName(params.name)) {
      return Response.warning(i18n.project.invalidProjectName);
    }

    try {
      const projectId: string = generationId(PRE_FOLDER);
      const folderDetail: Folder = Object.assign(_.omit(params, 'path'), {
        id: projectId,
        parentFolderId: '',
        folderPath: params.path ? formatToPath(params.path) : formatToPath(params.name),
        creator: headers.userInfo.id || '',
      });

      const result = await this.service.folder.info.addTypeFolderDetail(folderDetail, PROJECT_TYPE);

      if (result.code === 1) {
        return Response.warning(i18n.project.invalidType);
      } else if (result.code === 2) {
        return Response.warning(i18n.project.projectNameExist);
      }

      await this.service.folder.info.runTransaction();

      return Response.success(result.data as Folder);
    } catch (err) {
      return Response.error(err, i18n.project.addProjectFailed);
    }
  }
}
