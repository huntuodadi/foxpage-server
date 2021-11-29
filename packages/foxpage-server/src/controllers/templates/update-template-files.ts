import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { FileDetailRes, UpdateFileDetailReq } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('templates')
export class UpdateTemplateDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update the template details, only the template name and profile can be updated
   * @param  {UpdateFileDetailReq} params
   * @returns {File}
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateTemplateDetail,
    description: '',
    tags: ['Template'],
    operationId: 'update-template-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: UpdateFileDetailReq): Promise<ResData<File>> {
    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.template.invalidTemplateName);
    }

    try {
      const hasAuth = await this.service.auth.file(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.file.info.updateFileDetail(params);

      if (result.code === 1) {
        return Response.warning(i18n.template.invalidTemplateId);
      }

      if (result.code === 2) {
        return Response.warning(i18n.template.templateNameExist);
      }

      await this.service.file.info.runTransaction();
      const fileDetail = await this.service.file.info.getDetailById(params.id);

      return Response.success(fileDetail || {});
    } catch (err) {
      return Response.error(err, i18n.template.updateTemplateFailed);
    }
  }
}
