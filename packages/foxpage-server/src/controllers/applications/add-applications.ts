import 'reflect-metadata';

import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import {
  COMPONENT_TYPE,
  CONDITION_TYPE,
  LIBRARY_TYPE,
  PRE_APP,
  PROJECT_TYPE,
  RESOURCE_TYPE,
  VARIABLE_TYPE,
} from '../../../config/constant';
import { AppWithFolder } from '../../types/app-types';
import { ResData } from '../../types/index-types';
import { AddAppDetailReq, AppDetailWithFolderRes } from '../../types/validates/app-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('applications')
export class AddApplicationDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create application info, include default type folders in application root, eg. project,
   * variable, condition and function folder etc.
   * @param  {AddAppDetailReq} params
   * @param  {Header} headers
   * @returns {AppWithFolder}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addAppDetail,
    description: '',
    tags: ['Application'],
    operationId: 'add-application-detail',
  })
  @ResponseSchema(AppDetailWithFolderRes)
  async index(@Body() params: AddAppDetailReq): Promise<ResData<AppWithFolder>> {
    try {
      const validOrg = await this.service.org.checkOrgValid(params.organizationId);
      if (!validOrg) {
        return Response.warning(i18n.org.invalidOrgId);
      }

      // Check if the same slug exists under the organization
      if (params.slug) {
        const appDetail = await this.service.application.getDetail(
          _.pick(params, ['organizationId', 'slug']),
        );

        if (appDetail && !appDetail.deleted) {
          return Response.warning(i18n.app.appSlugExist);
        }
      }

      // Create application
      const appParams = Object.assign({ id: generationId(PRE_APP) }, params);
      this.service.application.create(appParams);

      // Create default root folders
      const folderTypes = [
        PROJECT_TYPE,
        VARIABLE_TYPE,
        CONDITION_TYPE,
        COMPONENT_TYPE,
        LIBRARY_TYPE,
        RESOURCE_TYPE,
      ];
      for (const name of folderTypes) {
        this.service.folder.info.create({
          applicationId: appParams.id,
          name: '_' + name,
          tags: [{ type: name }],
        });
      }

      // save info
      await this.service.application.runTransaction();
      const appDetailWithFolder = await this.service.application.getAppDetailWithFolder(
        appParams.id as string,
      );

      return Response.success(appDetailWithFolder);
    } catch (err) {
      return Response.error(err, i18n.app.addNewDetailFailed);
    }
  }
}
