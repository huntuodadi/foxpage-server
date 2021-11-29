import * as Service from '../services';
import { AuthOptions } from '../types/authorization-types';

export class AuthService {
  private static _instance: AuthService;

  constructor() {}

  /**
   * Single instance
   * @returns AuthService
   */
  public static getInstance(): AuthService {
    this._instance || (this._instance = new AuthService());
    return this._instance;
  }

  /**
   * Check whether the specified user is the owner of the app
   * @param  {string} applicationId
   * @param  {string} user
   * @returns Promise
   */
  async application(applicationId: string, options?: AuthOptions): Promise<boolean> {
    const user = options?.user || Service.userSingleton.getInstance().getCurrentUserBase().id || '';
    const appDetail = await Service.application.getDetailById(applicationId);

    return appDetail?.creator === user;
  }

  /**
   * Check whether the specified user is the owner of the organization
   * @param  {string} applicationId
   * @param  {string} user
   * @returns Promise
   */
  async organization(organizationId: string, options?: AuthOptions): Promise<boolean> {
    const user = options?.user || Service.userSingleton.getInstance().getCurrentUserBase().id || '';
    const orgDetail = await Service.org.getDetailById(organizationId);

    return orgDetail?.creator === user;
  }

  /**
   * Check if the specified user is the owner of the team
   * @param  {string} applicationId
   * @param  {string} user
   * @returns Promise
   */
  async team(teamId: string, options?: AuthOptions): Promise<boolean> {
    const user = options?.user || Service.userSingleton.getInstance().getCurrentUserBase().id || '';
    const teamDetail = await Service.team.getDetailById(teamId);

    return teamDetail?.creator === user;
  }

  /**
   * Check whether the specified user has permission to operate the specified folder.
   * Get the owner of the folder (project or system folder) where the file is located,
   * and compare it with the current user.
   * @param  {string} applicationId
   * @param  {string} user
   * @returns Promise
   */
  async folder(folderId: string, options?: AuthOptions): Promise<boolean> {
    const user = options?.user || Service.userSingleton.getInstance().getCurrentUserBase().id || '';
    const applicationId = Service.appSingleton.getInstance().getApplicationId();

    const [folderDetail, isAppOwner] = await Promise.all([
      Service.folder.info.getDetailById(folderId),
      this.application(applicationId, { user }),
    ]);

    const folderParentCreator = await this.getDataFolderOwner(folderId);

    return folderDetail?.creator === user || folderParentCreator === user || isAppOwner;
  }

  /**
   * Check whether the specified user has permission to operate the specified file.
   * Get the owner of the folder (project or system folder) where the file is located,
   * and compare it with the current user
   * @param  {string} applicationId
   * @param  {string} user
   * @returns Promise
   */
  async file(fileId: string, options?: AuthOptions): Promise<boolean> {
    const user = options?.user || Service.userSingleton.getInstance().getCurrentUserBase().id || '';
    const applicationId = Service.appSingleton.getInstance().getApplicationId();

    const [fileDetail, isAppOwner] = await Promise.all([
      Service.file.info.getDetailById(fileId),
      this.application(applicationId, { user }),
    ]);

    const folderCreator = await this.getDataFolderOwner(fileDetail?.folderId || '');

    return fileDetail?.creator === user || folderCreator === user || isAppOwner;
  }

  /**
   * Check whether the specified user has permission to operate the specified content.
   * Get the owner of the folder (project or system folder) where the content is located,
   * and compare it with the current user
   * @param  {string} applicationId
   * @param  {string} user
   * @returns Promise
   */
  async content(contentId: string, options?: AuthOptions): Promise<boolean> {
    const user = options?.user || Service.userSingleton.getInstance().getCurrentUserBase().id || '';
    const applicationId = Service.appSingleton.getInstance().getApplicationId();
    const [contentDetail, isAppOwner] = await Promise.all([
      Service.content.info.getDetailById(contentId),
      this.application(applicationId, { user }),
    ]);

    const fileDetail = await Service.file.info.getDetailById(contentDetail?.fileId || '');
    const folderCreator = await this.getDataFolderOwner(fileDetail?.folderId || '');

    return contentDetail?.creator === user || folderCreator === user || isAppOwner;
  }

  /**
   * Check whether the specified user has permission to operate the specified content version.
   * Get the owner of the folder (project or system folder) where the version content is located,
   * and compare it with the current user
   * @param  {string} applicationId
   * @param  {string} user
   * @returns Promise
   */
  async version(versionId: string, options?: AuthOptions): Promise<boolean> {
    const user = options?.user || Service.userSingleton.getInstance().getCurrentUserBase().id || '';
    const applicationId = Service.appSingleton.getInstance().getApplicationId();
    const [versionDetail, isAppOwner] = await Promise.all([
      Service.version.info.getDetailById(versionId),
      this.application(applicationId, { user }),
    ]);

    const contentDetail = await Service.content.info.getDetailById(versionDetail?.contentId || '');
    const fileDetail = await Service.file.info.getDetailById(contentDetail?.fileId || '');
    const folderCreator = await this.getDataFolderOwner(fileDetail?.folderId || '');

    return versionDetail?.creator === user || folderCreator === user || isAppOwner;
  }

  /**
   * Get the owner of the folder (project/system folder) where the specified data is located
   * If the returned result folder is greater than 1, the second folder is the project/resource,
   *  otherwise it is the system folder.
   * Currently there are only projects, resources are created in folders,
   * and others are created in the system folder by default.
   * @param  {string} folderId
   * @returns Promise
   */
  async getDataFolderOwner(folderId: string): Promise<string> {
    if (folderId) {
      const allFolders = await Service.folder.list.getAllParentsRecursive([folderId]);
      return allFolders?.[folderId]?.[1]?.creator || '';
    }
    return '';
  }
}
