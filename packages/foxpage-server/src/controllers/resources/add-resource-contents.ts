import 'reflect-metadata';

import { ContentVersion, File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, HeaderParams, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_FILE, RESOURCE_TYPE } from '../../../config/constant';
import { Header, ResData } from '../../types/index-types';
import { ContentVersionDetailRes } from '../../types/validates/content-validate-types';
import { AddResourceContentReq } from '../../types/validates/resource-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class AddResourceContentDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Added resource content information, resource files, resource content,
   * and resource content version information will be added at the same time
   * @param  {AddResourceContentReq} params
   * @param  {Header} headers
   * @returns {ContentVersion}
   */
  @Post('/contents')
  @OpenAPI({
    summary: i18n.sw.addResourceContentDetail,
    description: '',
    tags: ['Resource'],
    operationId: 'add-resource-content-detail',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(
    @Body() params: AddResourceContentReq,
    @HeaderParams() headers: Header,
  ): Promise<ResData<ContentVersion>> {
    try {
      const fileTitle: string = _.last(params.content.realPath.split('/')) || '';
      if (!fileTitle) {
        return Response.warning(i18n.resource.invalidName);
      }

      // Get all the files in the current folder, check whether the file with the same name already exists
      let fileDetail = await this.service.file.info.getDetail({
        folderId: params.folderId,
        name: fileTitle,
        type: RESOURCE_TYPE,
        deleted: false,
      });

      if (fileDetail) {
        return Response.warning(i18n.resource.resourceNameExist);
      }

      const resourceFileDetail: File = {
        id: generationId(PRE_FILE),
        name: fileTitle,
        applicationId: params.applicationId,
        folderId: params.folderId,
        intro: '',
        type: RESOURCE_TYPE,
        suffix: 'fp',
        creator: headers.userInfo.id || '',
      };

      // Compatible with the prefix '/' of realPath
      if (params.content?.realPath) {
        params.content.realPath = '/' + _.pull(params.content.realPath.split('/'), '').join('/');
      }

      this.service.file.info.createFileContentVersion(resourceFileDetail, { content: params.content });

      await this.service.file.info.runTransaction();
      fileDetail = await this.service.file.info.getDetailById(resourceFileDetail.id as string);

      return Response.success(fileDetail);
    } catch (err) {
      return Response.error(err, i18n.resource.addResourceContentFailed);
    }
  }
}
