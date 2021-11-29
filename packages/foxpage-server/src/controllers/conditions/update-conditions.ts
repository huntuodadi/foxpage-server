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

@JsonController('conditions')
export class UpdateConditionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update condition details,
   * only condition name and introduction, type, content name and version content can be updated
   * @param  {UpdateTypeFileDetailReq} params
   * @returns {File}
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateConditionFileContentDetail,
    description: '',
    tags: ['Condition'],
    operationId: 'update-condition-file-content-detail',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: UpdateTypeFileDetailReq): Promise<ResData<File>> {
    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.condition.invalidConditionName);
    }

    try {
      // Permission check
      const hasAuth = await this.service.auth.file(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Get the contents of the file
      const contentList = await this.service.content.file.getContentByFileIds([params.id]);
      const contentId = contentList[0]?.id || '';
      const contentName = params.name || contentList[0]?.title;
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
        return Response.warning(i18n.condition.invalidConditionId);
      }

      if (result.code === 2) {
        return Response.warning(i18n.condition.conditionNameExist);
      }

      this.service.content.info.updateContentItem(contentId, { title: contentName });
      this.service.version.info.updateVersionItem(versionId, { content: params.content });

      await this.service.file.info.runTransaction();
      const fileDetail = await this.service.file.info.getDetailById(params.id);

      return Response.success(fileDetail || {});
    } catch (err) {
      return Response.error(err, i18n.condition.updateConditionFailed);
    }
  }
}
