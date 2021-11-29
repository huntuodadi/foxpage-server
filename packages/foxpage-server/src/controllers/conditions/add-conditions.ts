import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { CONDITION_TYPE } from '../../../config/constant';
import { NewFileInfo } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { FileDetailRes, FileVersionDetailReq } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('conditions')
export class AddConditionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create condition details
   * @param  {FileDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addConditionDetail,
    description: '',
    tags: ['Condition'],
    operationId: 'add-condition-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: FileVersionDetailReq): Promise<ResData<File>> {
    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.file.invalidName);
    }

    try {
      if (!params.folderId) {
        params.folderId = await this.service.folder.info.getAppTypeFolderId({
          applicationId: params.applicationId,
          type: CONDITION_TYPE,
        });

        if (!params.folderId) {
          return Response.warning(i18n.folder.invalidFolderId);
        }
      }

      const newFileDetail: NewFileInfo = Object.assign({}, params, { type: CONDITION_TYPE });
      const result = await this.service.file.info.addFileDetail(newFileDetail);

      // Check the validity of the application ID
      if (result.code === 1) {
        return Response.warning(i18n.app.idInvalid);
      }

      // Check if the template exists
      if (result.code === 2) {
        return Response.warning(i18n.condition.conditionNameExist);
      }

      await this.service.file.info.runTransaction();

      return Response.success(result.data || {});
    } catch (err) {
      return Response.error(err, i18n.condition.addNewConditionFailed);
    }
  }
}
