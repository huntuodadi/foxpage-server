import 'reflect-metadata';

import { File, FileResourceType } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_FILE, RESOURCE_TYPE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { FileDetailReq, FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName, generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class AddResourceFileDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create resource file details
   * @param  {FileDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addResourceFileDetail,
    description: '/resource/file/detail',
    tags: ['Resource'],
    operationId: 'add-resource-file-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: FileDetailReq): Promise<ResData<File>> {
    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.resource.invalidName);
    }

    if (!params.folderId) {
      return Response.warning(i18n.resource.invalidFolderId);
    }

    try {
      // Check the existence of the file
      const fileExist = await this.service.file.info.checkExist(params);
      if (fileExist) {
        return Response.warning(i18n.resource.resourceNameExist);
      }

      // Create document details
      const fileDetail: Partial<File> = Object.assign({}, _.omit(params, 'type'), {
        id: generationId(PRE_FILE),
        type: RESOURCE_TYPE as FileResourceType,
      });

      this.service.file.info.create(fileDetail);

      await this.service.file.info.runTransaction();
      const newFileDetail = await this.service.file.info.getDetailById(fileDetail.id as string);

      return Response.success(newFileDetail);
    } catch (err) {
      return Response.error(err, i18n.resource.addResourceFileFailed);
    }
  }
}
