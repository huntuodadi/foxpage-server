import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';

import {
  COMPONENT_TYPE,
  CONDITION_TYPE,
  FUNCTION_TYPE,
  LIBRARY_TYPE,
  PAGE_TYPE,
  TEMPLATE_TYPE,
  VARIABLE_TYPE,
} from '../../../config/constant';
import * as Model from '../../models';
import { ContentVersionNumber, ContentVersionString } from '../../types/content-types';
import { VersionServiceAbstract } from '../abstracts/version-service-abstract';
import * as Service from '../index';

export class VersionCheckService extends VersionServiceAbstract {
  private static _instance: VersionCheckService;

  constructor() {
    super();
  }

  /**
   * Single instance
   * @returns VersionCheckService
   */
  public static getInstance(): VersionCheckService {
    this._instance || (this._instance = new VersionCheckService());
    return this._instance;
  }

  /**
   * Check the required fields in version content
   * The required fields for page, template, variable, condition, function are: ['schemas','relation']
   * The required fields for package are ['resource','meta','schema']
   * @param  {string} fileId
   * @param  {any} content
   * @returns {string[]} Promise
   */
  async contentFields(fileId: string, content: any): Promise<string[]> {
    let missingFields: string[] = [];

    // Get the type of page
    const fileDetail = await Service.file.info.getDetailById(fileId);

    if (
      [PAGE_TYPE, TEMPLATE_TYPE, VARIABLE_TYPE, CONDITION_TYPE, FUNCTION_TYPE].indexOf(fileDetail.type) !== -1
    ) {
      for (const field of ['schemas', 'relation']) {
        !content[field] && missingFields.push(field);
      }
    } else if ([COMPONENT_TYPE, LIBRARY_TYPE].indexOf(fileDetail.type) !== -1) {
      for (const field of ['resource', 'meta', 'schema']) {
        !content[field] && missingFields.push(field);
      }
    }

    return missingFields;
  }

  /**
   * Filter out non-existent content version number information
   * @param  {ContentVersionNumber[]} idNumbers
   * @param  {ContentVersion[]} contentVersion
   * @returns ContentVersionNumber
   */
  notExistVersionNumber(
    idNumbers: ContentVersionNumber[],
    contentVersion: ContentVersion[],
  ): ContentVersionNumber[] {
    let notExistContent: ContentVersionNumber[] = [];
    if (idNumbers.length > 0) {
      const contentObject = _.keyBy(
        contentVersion,
        (version) => version.contentId + '_' + version.versionNumber,
      );

      notExistContent = idNumbers.filter((item) => !contentObject[item.contentId + '_' + item.versionNumber]);
    }

    return notExistContent;
  }

  /**
   * Filter out content version information that does not exist
   * @param  {ContentVersionString[]} idVersions
   * @param  {ContentVersion[]} contentVersion
   * @returns ContentVersionString
   */
  notExistVersion(
    idVersions: ContentVersionString[],
    contentVersion: ContentVersion[],
  ): ContentVersionString[] {
    let notExistVersion: ContentVersionString[] = [];
    if (idVersions.length > 0) {
      const contentObject = _.keyBy(contentVersion, (version) => version.contentId + '_' + version.version);
      notExistVersion = idVersions.filter((item) => !contentObject[item.contentId + '_' + item.version]);
    }

    return notExistVersion;
  }

  /**
   * Check whether the specified version number is a new version
   * (that is, the version does not exist in the database)
   * @param  {string} contentId
   * @param  {number} versionNumber
   * @returns {boolean} Promise
   */
  async isNewVersion(contentId: string, versionNumber: number): Promise<boolean> {
    const versionDetail = await Model.version.getDetailByVersionNumber(contentId, versionNumber);

    return !versionDetail;
  }

  /**
   * Verify that the specified version number exists
   * @param  {string} contentId
   * @param  {ContentCheck} params
   * @returns Promise
   */
  async versionExist(contentId: string, version: string, versionId: string = ''): Promise<boolean> {
    return this.checkExist({ contentId, version, deleted: false }, versionId);
  }
}
