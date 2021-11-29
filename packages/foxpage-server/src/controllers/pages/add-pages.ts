import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PAGE_TYPE } from '../../../config/constant';
import { NewFileInfo } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { FileDetailReq, FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('pages')
export class AddPageDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create page details
   * @param  {FileDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addPageDetail,
    description: '',
    tags: ['Page'],
    operationId: 'add-page-detail',
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

      const newFileDetail: NewFileInfo = Object.assign({}, params, { type: PAGE_TYPE });
      const result = await this.service.file.info.addFileDetail(newFileDetail);

      // Check the validity of the application ID
      if (result.code === 1) {
        return Response.warning(i18n.app.idInvalid);
      }

      // Check the existence of the file
      if (result.code === 2) {
        return Response.warning(i18n.file.nameExist);
      }

      // Check if the path of the file already exists
      if (result.code === 3) {
        return Response.warning(i18n.file.pathNameExist);
      }

      await this.service.file.info.runTransaction();

      return Response.success(result.data || {});
    } catch (err) {
      return Response.error(err, i18n.page.addNewPageFailed);
    }
  }
}
