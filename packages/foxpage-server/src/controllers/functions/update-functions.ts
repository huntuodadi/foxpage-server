import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { FileDetailRes, UpdateTypeFileDetailReq } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('functions')
export class UpdateFunctionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update the variable details,
   * only update the variable name and introduction, type, and update the content name and version content
   * @param  {UpdateTypeFileDetailReq} params
   * @returns {File}
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateFunctionDetail,
    description: '',
    tags: ['Function'],
    operationId: 'update-function-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: UpdateTypeFileDetailReq): Promise<ResData<File>> {
    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.function.invalidName);
    }

    try {
      const hasAuth = await this.service.auth.file(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // 获取文件的内容
      const contentList = await this.service.content.file.getContentByFileIds([params.id]);
      const contentId: string = contentList[0]?.id || '';
      const contentName: string = params.name || contentList[0]?.title;
      let versionId: string = '';
      // Get the version of the content
      if (contentId) {
        const versionDetail = await this.service.version.info.getContentLatestVersion({
          contentId,
          deleted: false,
        });
        versionId = versionDetail.id || '';
      }

      const result = await this.service.file.info.updateFileDetail(params);
      if (result.code === 1) {
        return Response.warning(i18n.function.invalidFileId);
      }

      if (result.code === 2) {
        return Response.warning(i18n.function.nameExist);
      }

      this.service.content.info.updateContentItem(contentId, { title: contentName });
      this.service.version.info.updateVersionItem(versionId, { content: params.content });

      await this.service.file.info.runTransaction();
      const fileDetail = await this.service.file.info.getDetailById(params.id);

      return Response.success(fileDetail || {});
    } catch (err) {
      return Response.error(err, i18n.function.updateFunctionFailed);
    }
  }
}
