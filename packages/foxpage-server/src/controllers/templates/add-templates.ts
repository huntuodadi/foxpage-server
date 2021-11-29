import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { TEMPLATE_TYPE } from '../../../config/constant';
import { NewFileInfo } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { FileDetailReq, FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('templates')
export class AddTemplateDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create template details
   * @param  {FileDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addTemplateDetail,
    description: '/',
    tags: ['Template'],
    operationId: 'add-template-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: FileDetailReq): Promise<ResData<File>> {
    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.file.invalidName);
    }

    try {
      if (!params.folderId) {
        return Response.warning(i18n.folder.invalidFolderId);
      }

      const newFileDetail: NewFileInfo = Object.assign({}, params, { type: TEMPLATE_TYPE });
      const result = await this.service.file.info.addFileDetail(newFileDetail);

      // Check the validity of the application ID
      if (result.code === 1) {
        return Response.warning(i18n.app.idInvalid);
      }

      // Check if the template exists
      if (result.code === 2) {
        return Response.warning(i18n.template.templateNameExist);
      }

      await this.service.file.info.runTransaction();
      const templateFileDetail = await this.service.file.info.getDetailById((result?.data as File)?.id || '');

      return Response.success(templateFileDetail || {});
    } catch (err) {
      return Response.error(err, i18n.template.addNewTemplateFailed);
    }
  }
}
