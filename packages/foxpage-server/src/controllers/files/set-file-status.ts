import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { DeleteFileReq, FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('file')
export class SetFileStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set file deletion status
   * @param  {DeleteFileReq} params
   * @returns {File}
   */
  @Put('/delete')
  @OpenAPI({
    summary: i18n.sw.setFileDeleteStatus,
    description: '',
    tags: ['File'],
    operationId: 'set-file-delete',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: DeleteFileReq): Promise<ResData<File>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.file(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const fileDetail = await this.service.file.info.getDetailById(params.id);
      if (!fileDetail) {
        return Response.warning(i18n.file.invalidFileId);
      }

      // Set status
      await this.service.file.info.updateDetail(params.id, {
        deleted: params.status !== undefined ? params.status : true,
      });

      // Get file details
      const newFileDetail: File = await this.service.file.info.getDetailById(params.id);

      return Response.success(newFileDetail);
    } catch (err) {
      return Response.error(err, i18n.file.setDeleteStatusFailed);
    }
  }
}
