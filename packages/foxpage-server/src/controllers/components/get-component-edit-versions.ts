import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Get, JsonController, QueryParams } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { ComponentVersionEditReq } from '../../types/validates/component-validate-types';
import { ContentVersionDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('components')
export class GetComponentVersionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the version details of the component
   * @param  {ContentVersionDetailReq} params
   * @returns {ContentVersion}
   */
  @Get('/edit-versions')
  @OpenAPI({
    summary: i18n.sw.getComponentEditVersionDetail,
    description: '',
    tags: ['Component'],
    operationId: 'get-component-edit-version-detail',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@QueryParams() params: ComponentVersionEditReq): Promise<ResData<ContentVersion>> {
    try {
      const versionDetail = await this.service.version.info.getDetail({ id: params.id, deleted: false });

      if (!versionDetail) {
        return Response.warning(i18n.component.invalidVersionId);
      }

      // Get the corresponding resource information in the component
      const contentIds = this.service.content.component.getComponentResourceIds([versionDetail.content]);
      const idVersion = this.service.component.getComponentEditorAndDependends([versionDetail.content]);
      const fileContentObject = await this.service.file.list.getContentFileByIds(_.map(idVersion, 'id'));

      // Append the name of the dependency to dependencies
      this.service.component.addNameToEditorAndDepends([versionDetail.content], fileContentObject);

      const contentList = await this.service.content.list.getDetailByIds(contentIds);
      const fileIds = _.map(contentList, 'fileId');
      const fileList = await this.service.file.info.getDetailByIds(fileIds);
      const folderIds = _.map(fileList, 'folderId');

      const [allFoldersObject, contentAllParents] = await Promise.all([
        this.service.folder.list.getAllParentsRecursive(_.uniq(folderIds)),
        this.service.content.list.getContentAllParents(contentIds),
      ]);

      const appResource = await this.service.application.getAppResourceFromContent(contentAllParents);
      const contentResource = this.service.content.info.getContentResourceTypeInfo(
        appResource,
        contentAllParents,
      );

      const folderPath: Record<string, string> = {};
      // Splicing folder path
      Object.keys(allFoldersObject).forEach((folderId) => {
        folderPath[folderId] = '/' + _.map(_.drop(allFoldersObject[folderId]), 'folderPath').join('/');
      });

      const filePath: Record<string, string> = {};
      fileList.forEach((file) => {
        filePath[file.id] = (folderPath[file.folderId] || '') + '/' + file.name;
      });

      const resourceObject: Record<string, object> = {};
      contentList.forEach((content) => {
        resourceObject[content.id] = { realPath: filePath[content.fileId] || '' };
      });

      versionDetail.content.resource = this.service.version.component.assignResourceToComponent(
        versionDetail?.content?.resource || {},
        resourceObject,
        { contentResource },
      );

      // 将resource中的contentId合并到resource的内容中

      return Response.success(versionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.content.getComponentVersionDetailFailed);
    }
  }
}
