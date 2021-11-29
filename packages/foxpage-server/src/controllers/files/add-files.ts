import 'reflect-metadata';

import { Content, ContentVersion, File } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_CONTENT, PRE_CONTENT_VERSION, PRE_FILE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { FileDetailReq, FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName, generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('file')
export class AddFileDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create document details
   * @param  {FileDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('/detail')
  @OpenAPI({
    summary: i18n.sw.addFileDetail,
    description: '',
    tags: ['File'],
    operationId: 'add-file-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: FileDetailReq): Promise<ResData<File>> {
    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.file.invalidName);
    }

    try {
      const [appDetail, fileExist] = await Promise.all([
        this.service.application.getDetailById(params.applicationId),
        this.service.file.info.getDetail(Object.assign({ deleted: false }, params)),
      ]);

      // Check the validity of the application ID
      if (!appDetail) {
        return Response.warning(i18n.app.idInvalid);
      }

      // Check the existence of the file
      if (fileExist) {
        return Response.warning(i18n.file.nameExist);
      }

      // Add file info
      const fileDetail = Object.assign({}, params, { id: generationId(PRE_FILE), creator: '' });
      this.service.file.info.create(fileDetail);

      // By default, a content page is created at the same time as the file is created
      const contentDetail: Content = {
        id: generationId(PRE_CONTENT),
        title: params.name,
        fileId: fileDetail.id as string,
        tags: [],
        creator: '',
        liveVersionNumber: 0,
      };
      this.service.content.info.create(contentDetail);

      // For page type file, template, a content version needs to be created by default
      if (['page', 'template'].indexOf(params.type) !== -1) {
        const newVersionDetail: ContentVersion = {
          id: generationId(PRE_CONTENT_VERSION),
          contentId: contentDetail.id,
          version: '0.0.1',
          versionNumber: 1,
          creator: '',
          content: { id: contentDetail.id } as any,
        };
        this.service.version.info.create(newVersionDetail);
      }

      await this.service.file.info.runTransaction();
      const newFileDetail = await this.service.file.info.getDetailById(fileDetail.id as string);

      return Response.success(newFileDetail);
    } catch (err) {
      return Response.error(err, i18n.file.addNewFailed);
    }
  }
}
