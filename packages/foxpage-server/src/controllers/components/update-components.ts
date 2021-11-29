import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { UpdateComponentReq } from '../../types/validates/component-validate-types';
import { FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('components')
export class UpdateComponentFileDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update component file information, currently only the file profile can be updated
   * @param  {UpdateComponentReq} params
   * @returns {ContentVersion}
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateComponentFileDetail,
    description: '',
    tags: ['Component'],
    operationId: 'update-component-file-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: UpdateComponentReq): Promise<ResData<File>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.file(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.file.info.updateFileDetail(params);
      if (result.code === 1) {
        return Response.warning(i18n.component.invalidFileId);
      }

      await this.service.file.info.runTransaction();
      const fileDetail = await this.service.file.info.getDetailById(params.id);

      return Response.success(fileDetail || {});
    } catch (err) {
      return Response.error(err, i18n.component.updateComponentFileFailed);
    }
  }
}
