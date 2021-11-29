import 'reflect-metadata';

import { File } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { VERSION_STATUS_RELEASE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { AddProjectPagesReq, ProjectListRes } from '../../types/validates/project-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('projects')
export class AddAppsPageDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create page details under the new application project, create page, 
   * content and version through application ID, folderId
   * If version already exists, add a new version
   * The path field indicates that the folder is created, and the name is the file
   * {
        "name": "name1",
        "path":"common/abc",
        "content": {
          "locales": "",
          "detail": "{}"
        }
      }
   * @param  {FileDetailReq} params
   * @returns {File}
   */
  @Post('/files')
  @OpenAPI({
    summary: i18n.sw.addProjectPageDetail,
    description: '',
    tags: ['Project'],
    operationId: 'add-project-pages-detail',
  })
  @ResponseSchema(ProjectListRes)
  async index(@Body() params: AddProjectPagesReq): Promise<ResData<File>> {
    try {
      // Check the validity of applications and documents
      const folderDetail = await this.service.folder.info.getDetailById(params.projectId);
      if (!folderDetail || folderDetail.deleted) {
        return Response.warning(i18n.project.invalidProjectId);
      }

      if (folderDetail.applicationId !== params.applicationId) {
        return Response.warning(i18n.project.invalidApplicationIdOrProjectId);
      }

      let newPageList: any[] = [];
      for (const file of params.files) {
        const filePathList = _.pull(file.path.split('/'), '');
        const fileDetail = await this.service.file.info.getFileDetailByNames(
          {
            applicationId: params.applicationId,
            parentFolderId: params.projectId,
            pathList: _.clone(filePathList),
            fileName: file.name,
          },
          true,
        );

        let contentDetail = await this.service.content.info.getDetail({
          fileId: fileDetail?.id || '',
          deleted: false,
        });
        if (!contentDetail) {
          contentDetail = this.service.content.info.create({
            title: file.name,
            tags: file.content?.locale ? [{ locale: file.content.locale }] : [],
            fileId: fileDetail?.id,
          });
        }

        const newVersionNumber: number = (contentDetail.liveVersionNumber || 0) + 1;
        const versionDetail = this.service.version.info.create({
          contentId: contentDetail.id,
          version: this.service.version.number.getVersionFromNumber(newVersionNumber),
          content: file.content.detail ? JSON.parse(file.content.detail) : {},
          status: VERSION_STATUS_RELEASE,
        });

        this.service.content.info.updateContentItem(contentDetail.id, {
          liveVersionNumber: newVersionNumber,
        });

        newPageList.push({
          id: fileDetail.id,
          version: versionDetail.version,
          name: filePathList.join('/') + '/' + file.name,
          content: versionDetail.content || {},
        });
      }

      await this.service.folder.info.runTransaction();

      return Response.success(newPageList);
    } catch (err) {
      return Response.error(err, i18n.project.addProjectPagesFailed);
    }
  }
}
