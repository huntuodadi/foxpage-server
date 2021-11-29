import { Content, ContentVersion, DSL, DslRelation, DslSchemas } from '@foxpage/foxpage-server-types';
import _ from 'lodash';

import {
  CONDITION_TYPE,
  FUNCTION_TYPE,
  LOG_CATEGORY_APPLICATION,
  LOG_CREATE,
  LOG_VERSION_REMOVE,
  LOG_VERSION_UPDATE,
  PRE_CONTENT,
  PRE_CONTENT_VERSION,
  PRE_STRUCTURE,
  TEMPLATE_TYPE,
  VERSION_STATUS_BASE,
} from '../../../config/constant';
import * as Model from '../../models';
import {
  ContentVersionNumber,
  NameVersion,
  NameVersionContent,
  SearchLatestVersion,
  UpdateContentVersion,
} from '../../types/content-types';
import { TypeStatus } from '../../types/index-types';
import { generationId, randStr } from '../../utils/tools';
import { VersionServiceAbstract } from '../abstracts/version-service-abstract';
import * as Service from '../index';

interface VersionWithTitle extends ContentVersion {
  title: string;
  versionNumber: number;
}

export class VersionInfoService extends VersionServiceAbstract {
  private static _instance: VersionInfoService;

  constructor() {
    super();
  }

  /**
   * Single instance
   * @returns VersionInfoService
   */
  public static getInstance(): VersionInfoService {
    this._instance || (this._instance = new VersionInfoService());
    return this._instance;
  }

  /**
   * New version details are added, only query statements required by the transaction are generated,
   * and the details of the created version are returned
   * @param  {Partial<ContentVersion>} params
   * @returns ContentVersion
   */
  create(params: Partial<ContentVersion>): ContentVersion {
    const versionDetail: ContentVersion = {
      id: params.id || generationId(PRE_CONTENT_VERSION),
      contentId: params.contentId || '',
      version: params.version || '0.0.1',
      versionNumber: params.versionNumber || 1,
      content: Object.assign({ id: params.contentId }, params.content || {}),
      creator: params.creator || Service.userSingleton.getInstance().getCurrentUserBase().id,
    };
    this.addDetailQuery(versionDetail);

    Service.logSingleton.getInstance().addLogData({
      action: LOG_CREATE,
      category: LOG_CATEGORY_APPLICATION,
      content: { id: versionDetail.id, contentId: params.contentId, after: versionDetail },
    });

    return versionDetail;
  }

  /**
   * Update version details, including version number
   * Get the maximum effective version data of the specified content (possibly base or other status)
   * 1, If it is base, update directly,
   * 2, If it is other status or no data, create a base and then update
   * @param  {UpdateContentVersion} params
   * @returns Promise
   */
  async updateVersionDetail(
    params: UpdateContentVersion,
  ): Promise<Record<string, number | string | string[]>> {
    const versionDetail = await Service.version.info.getMaxContentVersionDetail(params.id);

    // Check if the version already exists
    if (params.version && (!versionDetail || params.version !== versionDetail.version)) {
      const versionExist = await Service.version.check.versionExist(params.id, params.version);
      if (versionExist) {
        return { code: 3 };
      }
    }

    // Check required fields
    const contentDetail = await Service.content.info.getDetailById(params.id);
    const missingFields = await Service.version.check.contentFields(contentDetail.fileId, params.content);
    if (missingFields.length > 0) {
      return { code: 4, data: missingFields };
    }

    let versionId = versionDetail?.id || '';
    let version = params.version || versionDetail?.version || '0.0.1';

    // Create a new base version
    if (!versionDetail || versionDetail.status !== VERSION_STATUS_BASE) {
      const newVersionDetail = await this.createNewContentVersion(params.id);
      version = newVersionDetail.version;
      versionId = newVersionDetail.id;
    }

    // Update
    params.content.id = params.id;
    this.updateDetailQuery(versionId, {
      version: version,
      versionNumber: Service.version.number.createNumberFromVersion(version),
      content: params.content,
    });

    // Save logs
    Service.logSingleton.getInstance().addLogItem(LOG_VERSION_UPDATE, versionDetail);

    return { code: 0, data: versionId };
  }

  /**
   * Update the specified data directly
   * @param  {string} id
   * @param  {Partial<Content>} params
   * @returns void
   */
  updateVersionItem(id: string, params: Partial<ContentVersion>): void {
    this.updateDetailQuery(id, params);
    Service.logSingleton.getInstance().addLogItem(LOG_VERSION_UPDATE, Object.assign({ id }, params));
  }

  /**
   * Get the maximum version information of the specified page
   * If the largest version is invalid, whether to create a new version
   * @param  {string} contentId
   * @param  {boolean=false} createNew
   * @returns Promise
   */
  async getMaxContentVersionDetail(contentId: string, createNew: boolean = false): Promise<ContentVersion> {
    let versionDetail = await Model.version.getMaxVersionDetailById(contentId);
    if (
      createNew &&
      (!versionDetail || versionDetail.status !== VERSION_STATUS_BASE || versionDetail.deleted)
    ) {
      versionDetail = await this.createNewContentVersion(contentId);
    }

    return versionDetail;
  }

  /**
   * Get the latest base version details of the specified content
   * @param  {string} contentId
   * @returns Promise
   */
  async getMaxBaseContentVersionDetail(contentId: string): Promise<ContentVersion> {
    return Model.version.getMaxVersionDetailById(contentId, { status: VERSION_STATUS_BASE });
  }

  /**
   * Through contentId, create a new version details
   * The new version number is determined by the latest valid version under the content
   * @param {string} contentId
   * @returns {Promise<ContentVersion>}
   * @memberof VersionService
   */
  async createNewContentVersion(contentId: string): Promise<ContentVersion> {
    const newVersionDetail = await this.getContentLatestVersion({ contentId });

    // Set new version information
    newVersionDetail.id = generationId(PRE_CONTENT_VERSION);
    newVersionDetail.contentId = contentId;
    newVersionDetail.content = newVersionDetail?.content || { id: contentId };
    newVersionDetail.status = VERSION_STATUS_BASE;
    newVersionDetail.version = Service.version.number.getNewVersion(newVersionDetail?.version);
    newVersionDetail.versionNumber = Service.version.number.createNumberFromVersion(
      newVersionDetail?.version,
    );
    newVersionDetail.creator = Service.userSingleton.getInstance().getCurrentUserBase().id;

    // Save
    this.addDetailQuery(newVersionDetail);
    return newVersionDetail;
  }

  /**
   * Set the delete status of the version.
   * If the version is live version, you need to check whether the content is referenced
   * @param  {TypeStatus} params
   * @returns Promise
   */
  async setVersionDeleteStatus(params: TypeStatus): Promise<Record<string, number>> {
    const versionDetail = await this.getDetailById(params.id);
    if (!versionDetail) {
      return { code: 1 }; // Invalid version information
    }

    const contentDetail = await Service.content.info.getDetailById(versionDetail.contentId);

    // TODO In the current version of the live state, you need to check whether the content is referenced
    if (params.status && contentDetail?.liveVersionNumber === versionDetail.versionNumber) {
      return { code: 2 }; // Can not be deleted
    }

    // Set the enabled state
    this.setDeleteStatus(params.id, params.status);
    Service.logSingleton.getInstance().addLogItem(LOG_VERSION_REMOVE, [versionDetail]);

    return { code: 0 };
  }

  /**
   * Set the delete status of the specified version in batches,
   * @param  {ContentVersion[]} versionList
   * @returns void
   */
  batchSetVersionDeleteStatus(versionList: ContentVersion[], status: boolean = true): void {
    this.setDeleteStatus(_.map(versionList, 'id'), status);
    Service.logSingleton.getInstance().addLogItem(LOG_VERSION_REMOVE, versionList);
  }

  /**
   * Get version details by file name and content version.
   * The data is the case where the file name and content name are the same,
   * and there is only one content under the file, such as components
   * @param  {string} applicationId
   * @param  {NameVersion[]} nameVersions
   * @returns Promise
   */
  async getVersionDetailByFileNameVersion(
    applicationId: string,
    type: string,
    nameVersions: NameVersion[],
  ): Promise<NameVersionContent[]> {
    const fileList = await Service.file.info.getFileIdByNames({
      applicationId,
      type,
      fileNames: _.map(nameVersions, 'name'),
    });

    const contentList = await Service.content.file.getContentByFileIds(_.map(fileList, 'id'));
    const versionList = await Service.version.number.getContentVersionByNumberOrVersion(
      nameVersions,
      contentList,
    );
    const contentObject = _.keyBy(contentList, 'id');
    const contentNameObject = _.keyBy(contentList, 'title');
    const contentVersionList = _.map(
      versionList,
      (version) =>
        Object.assign(
          {},
          version,
          _.pick(contentObject[version.contentId], ['title', 'versionNumber']),
        ) as VersionWithTitle,
    );
    const contentVersionObject = _.keyBy(contentVersionList, (item) => item.title + item.versionNumber);
    const nameLiveVersions = _.map(nameVersions, (item) =>
      Object.assign({}, item, {
        versionNumber: item.version
          ? Service.version.number.createNumberFromVersion(item.version)
          : contentNameObject[item.name]?.liveVersionNumber,
      }),
    );

    const nameVersionContent: NameVersionContent[] = nameLiveVersions.map((item) =>
      Object.assign(
        _.pick(item, ['name', 'version']),
        _.pick(contentVersionObject[item.name + item.versionNumber], ['content']),
      ),
    );

    return nameVersionContent;
  }

  /**
   * Get the latest version information of the page content
   * @param  {SearchLatestVersion} params
   * @returns {ContentVersion} Promise
   */
  async getContentLatestVersion(params: SearchLatestVersion): Promise<ContentVersion> {
    const version = await Model.version.getLatestVersionInfo(params);
    return version as ContentVersion;
  }

  /**
   * Get details of the specified page version or live version
   * @param  {ContentVersionNumber} params
   * @returns Promise
   */
  async getContentVersionDetail(params: ContentVersionNumber): Promise<ContentVersion> {
    const { versionNumber = 0, contentId } = params;

    let versionDetail: ContentVersion;
    if (versionNumber) {
      versionDetail = await this.getDetail(params);
    } else {
      // Get the live version information of content
      const contentDetail = await Service.content.info.getDetailById(contentId);
      versionDetail = await Service.version.number.getContentByNumber({
        contentId,
        versionNumber: contentDetail?.liveVersionNumber || 0,
      });
    }

    return versionDetail;
  }

  /**
   * Through contentList and contentVersionList information,
   * match contentId+version corresponding to the version details corresponding to different versions.
   * And contains the version details corresponding to the live version with contentId as the key.
   * Return information with content+version as the key
   * @param  {Content[]} contentList
   * @param  {ContentVersion[]} contentVersionList
   * @returns StringObject
   */
  mappingContentVersionInfo(
    contentList: Content[],
    contentVersionList: ContentVersion[],
  ): Record<string, ContentVersion> {
    const contentVersionObject: Record<string, ContentVersion> = {};
    const contentIdObject = _.keyBy(contentList, 'id');
    contentVersionList.forEach((content) => {
      contentVersionObject[content.contentId + content.version] = content;
      if (
        contentIdObject[content.contentId] &&
        contentIdObject[content.contentId].liveVersionNumber === content.versionNumber
      ) {
        contentVersionObject[content.contentId] = content;
      }
    });

    return contentVersionObject;
  }

  /**
   * Find the templateId through the version data of the page, and get the live version data of the template
   * @param  {string} applicationId
   * @param  {ContentVersion} pageVersion
   * @returns Promise
   */
  async getTemplateDetailFromPage(
    applicationId: string,
    pageVersion: ContentVersion,
  ): Promise<Partial<ContentVersion>> {
    let templateId: string = '';
    const key = _.findKey(pageVersion?.content?.relation || {}, (item) => item.type === TEMPLATE_TYPE);
    templateId = key !== '' ? pageVersion?.content?.relation?.[key as string]?.id : '';

    let templateVersion: Partial<ContentVersion> = {};
    if (templateId) {
      const templateVersions = await Service.version.live.getContentLiveDetails({
        applicationId: applicationId,
        type: TEMPLATE_TYPE,
        contentIds: [templateId],
      });
      templateVersion = templateVersions[0] || {};
    }

    return templateVersion;
  }

  /**
   * Copy version information from the specified content version
   * 1, update the structureId in the source version
   * 2, replace the relationId in the source version
   * @param  {DSL} sourceContentVersion
   * @param  {string} contentId: New content ID
   * @param  {{relations:Record<string} options
   * @param  {Record<string} string>;tempRelations
   * @param  {} string>}
   * @returns Record
   */
  copyContentVersion(
    sourceContentVersion: DSL,
    contentId: string,
    options: {
      relations: Record<string, Record<string, string>>;
      tempRelations: Record<string, Record<string, string>>;
    },
  ): Record<string, Record<string, string>> {
    const dsl = _.cloneDeep(sourceContentVersion);
    dsl.id = contentId;
    // Process the structureId value in schemes and replace the content id value in relation
    dsl.schemas = this.changeDSLStructureIdRecursive(sourceContentVersion.schemas);

    if (dsl.relation) {
      for (const key in dsl.relation) {
        if (options.relations[dsl.relation[key].id]) {
          dsl.relation[key].id = options.relations[dsl.relation[key].id].newId;
        } else if (options.tempRelations[dsl.relation[key].id]) {
          dsl.relation[key].id = options.tempRelations[dsl.relation[key].id].newId;
          options.relations[dsl.relation[key].id] = options.tempRelations[dsl.relation[key].id];
        } else {
          const contentId = generationId(PRE_CONTENT);
          const contentName = key.split(':')[0] || '';
          options.relations[dsl.relation[key].id] = {
            newId: contentId,
            oldName: contentName,
            newName: contentName + '_' + randStr(4),
          };
          dsl.relation[key].id = contentId;
        }
      }
    }

    // Update relation name in schemas
    const newDSL = this.replaceVersionSchemaRelationNames(dsl.schemas, dsl.relation, options.relations);
    dsl.schemas = newDSL.schemas;
    dsl.relation = newDSL.relation;

    // Create version
    this.create({
      id: generationId(PRE_CONTENT_VERSION),
      contentId: contentId,
      version: '0.0.1',
      versionNumber: 1,
      content: dsl,
    });

    return options.relations;
  }

  /**
   * Update the structureId value in the dsl schema
   * @param  {DslSchemas[]} schemas
   * @returns DslSchemas
   */
  changeDSLStructureIdRecursive(schemas: DslSchemas[], parentId?: string): DslSchemas[] {
    // TODO structure id in props need to replace too
    schemas.forEach((structure) => {
      structure.id = generationId(PRE_STRUCTURE);
      if (structure.parentId) {
        structure.parentId = parentId;
      }

      if (structure.wrapper) {
        structure.wrapper = parentId;
      }

      if (structure.children && structure.children.length > 0) {
        this.changeDSLStructureIdRecursive(structure.children, structure.id);
      }
    });

    return schemas;
  }

  /**
   * replace the special schemas relation name and ids
   * @param  {DslSchemas[]} schemas
   * @param  {Record<string, DslRelation>} relation
   * @param  {Record<string,Record<string,string>>} relations
   * @returns
   */
  replaceVersionSchemaRelationNames(
    schemas: DslSchemas[],
    relation: Record<string, DslRelation>,
    relations: Record<string, Record<string, string>>,
  ): { schemas: DslSchemas[]; relation: Record<string, DslRelation> } {
    let schemasString = JSON.stringify(schemas);
    const relationMatches = schemasString.match(/\{\{.*?\}\}/g);
    // Replace relation in schemas
    relationMatches &&
      relationMatches.forEach((match) => {
        const matchStr = _.replace(_.replace(match, '{{', ''), '}}', '');
        const matchArr = matchStr.split(':');
        const matchRelationName = matchArr[0] || '';
        if (matchRelationName) {
          for (const key in relations) {
            if (relations[key].oldName === matchRelationName) {
              if (
                relation[matchStr] &&
                [TEMPLATE_TYPE, CONDITION_TYPE, FUNCTION_TYPE].indexOf(relation[matchStr].type) !== -1
              ) {
                matchArr[1] = relations[key].newId;
              } else {
                // Replace schemas relation name
                matchArr[0] = relations[key].newName;
              }

              schemasString = _.replace(
                schemasString,
                new RegExp(match, 'gm'),
                '{{' + matchArr.join(':') + '}}',
              );
              break;
            }
          }
        }
      });

    // Replace key name in relation
    for (const key in relation) {
      const relationArr = key.split(':');

      for (const item in relations) {
        if (relations[item].oldName === relationArr[0]) {
          if ([TEMPLATE_TYPE, CONDITION_TYPE, FUNCTION_TYPE].indexOf(relation[key].type) !== -1) {
            relationArr[1] = relations[item].newId;
          } else {
            relationArr[0] = relations[item].newName;
          }

          relation[relationArr.join(':')] = relation[key];
          delete relation[key];
          break;
        }
      }
    }

    return { schemas: JSON.parse(schemasString), relation: relation || {} };
  }
}
