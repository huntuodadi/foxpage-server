import { Content, ContentStatus, ContentVersion, DSL } from '@foxpage/foxpage-server-types';
import _ from 'lodash';

import {
  LOG_PUBLISH,
  PAGE_TYPE,
  VERSION_STATUS_BASE,
  VERSION_STATUS_RELEASE,
} from '../../../config/constant';
import { AppTypeContent, PageContentRelationInfos, VersionPublish } from '../../types/content-types';
import { VersionServiceAbstract } from '../abstracts/version-service-abstract';
import * as Service from '../index';

export class VersionLiveService extends VersionServiceAbstract {
  private static _instance: VersionLiveService;

  constructor() {
    super();
  }

  /**
   * Single instance
   * @returns VersionLiveService
   */
  public static getInstance(): VersionLiveService {
    this._instance || (this._instance = new VersionLiveService());
    return this._instance;
  }

  /**
   * Get the live version details of the specified type of content under the specified application
   * @param  {AppTypeContent} params
   * @returns {ContentVersion[]} Promise
   */
  async getContentLiveDetails(params: AppTypeContent): Promise<ContentVersion[]> {
    const contentIds = params.contentIds || [];
    if (contentIds.length === 0) {
      return [];
    }

    // Get live details
    const contentLiveInfo = await Service.content.list.getContentLiveInfoByIds(contentIds);
    let contentVersionList: ContentVersion[] = [];
    if (contentLiveInfo.length > 0) {
      contentVersionList = await Service.version.list.getContentInfoByIdAndNumber(contentLiveInfo);
    }

    return contentVersionList;
  }

  /**
   * Set the release status of the version, which can only be set from the base version to other versions
   * @param  {VersionPublish} params
   * @param  {boolean} liveRelation, Mark whether to publish and set the relation associated with the version of live
   * @returns Promise
   */
  async setVersionPublishStatus(
    params: VersionPublish,
    liveRelation: boolean = false,
  ): Promise<Record<string, any>> {
    // Check the status of the version
    const versionDetail = await this.getDetailById(params.id);
    // TODO Need to judge that it is allowed to change from any state to discard
    if (!versionDetail || versionDetail.status !== VERSION_STATUS_BASE) {
      return { code: 1 }; // The current status does not allow re-publishing
    }

    // Update version status
    this.updateDetailQuery(params.id, { status: params.status });

    // Save relation information
    const invalidRelation = await Service.relation.checkRelationStatus(
      versionDetail?.content?.relation || {},
    );

    if (!_.isEmpty(invalidRelation)) {
      return { code: 2, data: invalidRelation };
    }

    // Set the live status of relations
    if (liveRelation) {
      const relationIds: string[] = _.map(_.toArray(versionDetail?.content?.relation || {}), 'id');
      const relationsLatestVersion = await Service.version.list.getContentMaxVersionDetail(
        relationIds,
        VERSION_STATUS_BASE,
      );
      if (!_.isEmpty(relationsLatestVersion)) {
        const relationList = _.toArray(relationsLatestVersion);
        // Set publish status
        Service.version.live.bulkSetVersionStatus(_.map(relationList, 'id'), VERSION_STATUS_RELEASE);
        // Set live status
        for (const relation of relationList) {
          Service.content.live.setLiveContent(relation.contentId, relation.versionNumber, {
            id: relation.contentId,
          } as Content);
        }
      }
    }

    // Add the relation information to the relation table
    await Service.relation.saveRelations(
      versionDetail.contentId,
      versionDetail.versionNumber,
      versionDetail?.content?.relation || {},
    );

    Service.logSingleton.getInstance().addLogItem(LOG_PUBLISH, versionDetail);

    return { code: 0, data: versionDetail };
  }

  /**
   * Batch set the specified version to the specified state
   * @param  {string[]} versionIds
   * @returns void
   */
  bulkSetVersionStatus(versionIds: string[], status: ContentStatus): void {
    if (versionIds.length > 0) {
      this.batchUpdateDetailQuery({ id: { $in: versionIds } }, { status } as any);
    }
  }
  /**
   * Get the version details of the specified contentIds and the corresponding relation details
   * @param  {string} applicationId
   * @param  {string[]} contentIds
   * @param  {boolean=false} isBuild Whether to take the live version
   * @returns string
   */
  async getContentAndRelationVersion(
    contentIds: string[],
    isBuild: boolean = false,
  ): Promise<PageContentRelationInfos[]> {
    let pageList: ContentVersion[] = [];
    if (isBuild) {
      const versionObject = await Service.version.list.getContentMaxVersionDetail(contentIds);
      pageList = _.toArray(versionObject);
    } else {
      pageList = await Service.content.live.getContentLiveDetails({
        applicationId: '',
        type: PAGE_TYPE,
        contentIds: contentIds,
      });
    }

    let pageContentRelations: PageContentRelationInfos[] = [];
    let dependMissing: string[] = []; // Invalid dependency information
    let recursiveItem: string = ''; // Circular dependency information
    for (const page of pageList) {
      dependMissing = [];
      recursiveItem = '';
      const result = await Service.content.relation.getRelationDetailRecursive(
        (page.content as DSL).relation,
        {},
        isBuild,
      );

      // There is a circular dependency or missing dependency information
      if (result.recursiveItem || result.missingRelations.length > 0) {
        dependMissing = result.missingRelations;
        recursiveItem = result.recursiveItem;
        break;
      }

      const relations = await Service.version.relation.getTypesRelationVersions(result);

      pageContentRelations.push({
        id: page.contentId,
        content: page.content as DSL,
        relations,
        dependMissing,
        recursiveItem,
      });
    }

    return pageContentRelations;
  }
}
