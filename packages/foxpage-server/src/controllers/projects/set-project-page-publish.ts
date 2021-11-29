import 'reflect-metadata';

import { Content, ContentStatus, ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import {
  TEMPLATE_TYPE,
  VERSION_STATUS_BASE,
  VERSION_STATUS_DISCARD,
  VERSION_STATUS_RELEASE,
} from '../../../config/constant';
import { ContentVersionString } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import { PublishProjectPageReq, PublishProjectPageRes } from '../../types/validates/project-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('projects')
export class PublishProjectPage extends BaseController {
  constructor() {
    super();
  }

  /**
   * Publish the specified page under the project and set it to live, including the data that the page depends on
   * 1. Get the details of the content
   * 2, get the relations of the content
   * 3, filter the relations that need to be published
   * 4, set the release status, set the live status
   *
   * When setting relation live and page live, directly set to live, no need to check status and other information
   * @param  {AppContentStatusReq} params
   * @returns {Content}
   */
  @Put('/page-publish')
  @OpenAPI({
    summary: i18n.sw.publishProjectPages,
    description: '',
    tags: ['Project'],
    operationId: 'publish-project-page',
  })
  @ResponseSchema(PublishProjectPageRes)
  async index(@Body() params: PublishProjectPageReq): Promise<ResData<ContentVersion>> {
    try {
      const applicationId = params.applicationId;

      // Get content version details
      let idVersionList: ContentVersionString[] = [];
      const [maxVersions, contentList] = await Promise.all([
        this.service.version.number.getContentMaxVersionByIds(params.ids),
        this.service.content.list.getDetailByIds(params.ids),
      ]);

      maxVersions.forEach((version) =>
        idVersionList.push({
          contentId: version._id,
          version: this.service.version.number.getVersionFromNumber(version.versionNumber),
        }),
      );

      let versionList: ContentVersion[] = [];
      if (idVersionList.length > 0) {
        versionList = await this.service.version.list.getContentInfoByIdAndVersion(idVersionList);
      }

      // Get relations
      const { ids, idVersions } = this.service.relation.getRelationIdsFromVersion(versionList, [
        TEMPLATE_TYPE,
      ]);

      // Recursively get all relations
      const allRelationList = await this.service.relation.getAllRelationsByIds(ids, idVersions);

      // TODO Need to exclude relation data under non-current projects

      // Check the validity of the relationship
      let invalidRelations: ContentVersionString[] = [];
      let releaseStatusIds: string[] = [];
      let liveStatusIds: Record<string, number> = {};
      allRelationList.forEach((relation) => {
        if (!relation.status || relation.status === VERSION_STATUS_DISCARD) {
          invalidRelations.push(relation);
        } else if (relation.status === VERSION_STATUS_BASE) {
          releaseStatusIds.push(relation.id);
        }
        liveStatusIds[relation.contentId] = relation.versionNumber || 0;
      });

      // Return wrong relation information
      if (invalidRelations.length > 0) {
        const contentIds = _.map(invalidRelations, 'contentId');
        const contentFileObject = await this.service.file.list.getContentFileByIds(contentIds);
        return Response.warning(
          i18n.project.invalidPageRelations + ':' + _.map(_.toArray(contentFileObject), 'name').join(','),
        );
      }

      // Set publishing status
      let releaseCodes: Record<string, string[]> = {};
      const maxObject = _.keyBy(maxVersions, '_id');
      this.service.version.live.bulkSetVersionStatus(releaseStatusIds, VERSION_STATUS_RELEASE);

      // The data of relation is set to live state, excluding data that is already live
      const liveStatusKeys = Object.keys(liveStatusIds);
      const liveStatusList = await this.service.content.list.getDetailByIds(liveStatusKeys);
      const liveStatusContentObject = _.keyBy(liveStatusList, 'id');
      for (const id of liveStatusKeys) {
        if (liveStatusContentObject[id]?.liveVersionNumber !== liveStatusIds[id]) {
          this.service.content.live.setLiveContent(id, liveStatusIds[id] || 0, { id } as Content);
        }
      }

      const contentObject = _.keyBy(contentList, 'id');
      const versionObject = _.keyBy(versionList, 'contentId');

      // The page is set to release and live status, excluding pages that are already live status
      for (const id of params.ids) {
        if (contentObject[id]?.liveVersionNumber === maxObject[id].versionNumber) {
          continue;
        }

        const liveParams = {
          applicationId,
          id: versionObject[id].id,
          status: VERSION_STATUS_RELEASE as ContentStatus,
        };
        const releaseResult = await this.service.version.live.setVersionPublishStatus(liveParams);
        this.service.content.live.setLiveContent(id, maxObject[id].versionNumber || 0, contentObject[id]);
        releaseResult.code === 2 && (releaseCodes[id] = Object.keys(releaseResult.data));
      }

      // Page publishing results
      if (_.isEmpty(releaseCodes)) {
        const result = await this.service.content.info.runTransaction();
        if (result.status) {
          const newVersionList = await this.service.version.list.getContentInfoByIdAndVersion(idVersionList);
          return Response.success(newVersionList);
        } else {
          return Response.error(new Error(result.msg), i18n.project.setProjectPageToLiveFailed);
        }
      } else {
        return Response.warning(
          i18n.project.invalidRelationDataStatus + ':' + _.toArray(releaseCodes).join(','),
        );
      }
    } catch (err) {
      return Response.error(err, i18n.project.publishProjectPageFailed);
    }
  }
}
