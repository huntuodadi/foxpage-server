import 'reflect-metadata';

import { Content, File, FileTypes } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { COMPONENT_TYPE } from '../../../config/constant';
import { NewFileInfo } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { AddComponentReq } from '../../types/validates/component-validate-types';
import { ContentDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('components')
export class AddComponentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create component details
   * @param  {AddComponentReq} params
   * @param  {Header} headers
   * @returns Content
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addComponentDetail,
    description: '/component/detail',
    tags: ['Component'],
    operationId: 'add-component-detail',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: AddComponentReq): Promise<ResData<Content>> {
    try {
      // Get the default folder Id of the application component
      const appComponentFolderId = await this.service.folder.info.getAppTypeFolderId({
        applicationId: params.applicationId,
        type: COMPONENT_TYPE,
      });

      if (!appComponentFolderId) {
        return Response.warning(i18n.component.invalidFolderType);
      }

      // Create page content information
      const fileDetail: NewFileInfo = {
        applicationId: params.applicationId,
        folderId: appComponentFolderId,
        name: params.name,
        type: params.type as FileTypes,
        suffix: '',
        creator: '',
      };

      const result = await this.service.file.info.addFileDetail(fileDetail);

      if (result.code === 1) {
        return Response.warning(i18n.component.invalidApplicationId);
      }

      // Check if there is a component with the same name
      if (result.code === 2) {
        return Response.warning(i18n.component.nameExist);
      }

      await this.service.file.info.runTransaction();

      const newFileDetail = await this.service.file.info.getDetailById((result.data as File).id);

      return Response.success(newFileDetail || {});
    } catch (err) {
      return Response.error(err, i18n.content.addContentBaseFailed);
    }
  }
}
