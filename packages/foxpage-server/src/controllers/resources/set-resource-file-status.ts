import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppContentStatusReq } from '../../types/validates/content-validate-types';
import { FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class SetResourceFileStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set the deletion status of resource files
   * @param  {AppContentStatusReq} params
   * @returns {Content}
   */
  @Put('/file-status')
  @OpenAPI({
    summary: i18n.sw.setResourceFileStatus,
    description: '',
    tags: ['Resource'],
    operationId: 'set-resource-file-status',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: AppContentStatusReq): Promise<ResData<File>> {
    params.status = true; // Currently it is mandatory to only allow delete operations

    try {
      const hasAuth = await this.service.auth.file(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.file.info.setFileDeleteStatus(params);
      if (result.code === 1) {
        return Response.warning(i18n.file.invalidFileId);
      } else if (result.code === 2) {
        return Response.warning(i18n.resource.fileCannotBeDeleted);
      }

      await this.service.file.info.runTransaction();
      const fileDetail = await this.service.file.info.getDetailById(params.id);

      return Response.success(fileDetail || {});
    } catch (err) {
      return Response.error(err, i18n.resource.setResourceFileDeletedFailed);
    }
  }
}
