import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { VARIABLE_TYPE } from '../../../config/constant';
import { ContentScopeInfo, ContentVersionNumber } from '../../types/content-types';
import { PageData, ResData } from '../../types/index-types';
import { AppContentListRes } from '../../types/validates/page-validate-types';
import { ProjectScopeTypeReq } from '../../types/validates/project-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('variables')
export class GetAppScopeVariableList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the live version details of the variables under the application,
   * the latest version details under the project (not necessarily the live version).
   * Only one of the names and search fields is passed. If passed at the same time, the search field is taken by default
   * @param  {AppContentVersionReq} params
   * @returns {PageContentData[]}
   */
  @Post('/scope-infos')
  @OpenAPI({
    summary: i18n.sw.getScopeVariables,
    description: '',
    tags: ['Variable'],
    operationId: 'get-variable-scope-info-list',
  })
  @ResponseSchema(AppContentListRes)
  async index(@Body() params: ProjectScopeTypeReq): Promise<ResData<PageData<ContentScopeInfo[]>>> {
    this.service.file.info.setPageSize(params);
    try {
      // Get application, variable list under project
      const variableFolderId = await this.service.folder.info.getAppTypeFolderId({
        applicationId: params.applicationId,
        type: VARIABLE_TYPE,
      });

      let options: Record<string, any> = {};
      if (params.search) {
        options = { name: { $regex: new RegExp(params.search, 'i') } };
      } else if (params.names && params.names.length > 0) {
        options = { name: { $in: params.names } };
      }

      options.type = VARIABLE_TYPE;

      const [appFileList, projectFileList] = await Promise.all([
        this.service.file.list.getFileListByFolderId(variableFolderId, options),
        this.service.file.list.getFileListByFolderId(params.id, options),
      ]);

      const [appContentList, projectContentList] = await Promise.all([
        this.service.content.file.getContentByFileIds(_.map(appFileList, 'id')),
        this.service.content.file.getContentByFileIds(_.map(projectFileList, 'id')),
      ]);

      const projectVersion = await this.service.version.number.getContentMaxVersionByIds(
        _.map(projectContentList, 'id'),
      );

      let appVersionNumbers: ContentVersionNumber[] = [];
      let versionNumbers: ContentVersionNumber[] = [];
      appContentList.forEach((content) => {
        appVersionNumbers.push({ contentId: content.id, versionNumber: content.liveVersionNumber });
      });

      projectVersion.forEach((content) => {
        versionNumbers.push({ contentId: content._id, versionNumber: content.versionNumber });
      });

      const contentObject: Record<string, Content> = _.merge(
        _.keyBy(appContentList, 'id'),
        _.keyBy(projectContentList, 'id'),
      );
      const [appVersionList, versionList] = await Promise.all([
        this.service.version.list.getContentByIdAndVersionNumber(appVersionNumbers),
        this.service.version.list.getContentByIdAndVersionNumber(versionNumbers),
      ]);

      const allVersionList = appVersionList.concat(versionList);

      // Get relations
      const [appVersionItemRelation, versionItemRelation, idLiveVersion] = await Promise.all([
        this.service.version.list.getVersionListRelations(appVersionList, true),
        this.service.version.list.getVersionListRelations(versionList, false),
        this.service.content.list.getContentLiveInfoByIds(_.uniq(_.map(allVersionList, 'contentId'))),
      ]);
      const versionRelations = _.merge(appVersionItemRelation, versionItemRelation);
      const idLiveVersionObject = _.keyBy(idLiveVersion, 'id');

      let contentVersionList: ContentScopeInfo[] = [];
      for (const version of allVersionList) {
        const contentFileObject = await this.service.file.list.getContentFileByIds(
          _.map(versionRelations[version.contentId], 'id'),
        );
        const itemRelations: Record<string, any[]> = {};
        const itemVersionRelations = _.keyBy(versionRelations[version.contentId], 'id');
        Object.keys(contentFileObject).forEach((contentId) => {
          if (!itemRelations[contentFileObject[contentId].type + 's']) {
            itemRelations[contentFileObject[contentId].type + 's'] = [];
          }
          itemRelations[contentFileObject[contentId].type + 's'].push(itemVersionRelations[contentId]);
        });

        contentVersionList.push(
          Object.assign({
            id: version.contentId || '',
            name: contentObject?.[version.contentId]?.title || '',
            versionNumber: version.versionNumber,
            isLiveVersion:
              idLiveVersionObject[version.contentId]?.liveVersionNumber === version.versionNumber,
            content: version.content || {},
            relations: itemRelations,
          }),
        );
      }

      return Response.success({
        pageInfo: {
          total: contentVersionList.length,
          page: params.page,
          size: params.size,
        },
        data: _.chunk(contentVersionList, params.size)?.[params.page - 1] || [],
      });
    } catch (err) {
      return Response.error(err, i18n.variable.getAppVariableFailed);
    }
  }
}
