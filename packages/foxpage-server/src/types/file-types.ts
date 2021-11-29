import {
  AppFolderTypes,
  AppResource,
  Content,
  ContentVersion,
  File,
  FileTypes,
  Folder,
  Tag,
} from '@foxpage/foxpage-server-types';

import { AppBaseInfo } from './app-types';
import { Creator } from './index-types';

export type FolderInfo = Exclude<Folder, 'creator' | 'applicationId'> & { creator: Creator } & {
  application: AppBaseInfo;
};
export type FileInfo = Exclude<File, 'creator' | 'applicationId'> & { creator: Creator } & {
  application: AppBaseInfo;
};
export type FileFolderInfo = { folders: FolderInfo[]; files: FileInfo[] };
export type FolderUserInfo = Exclude<Folder, 'creator'> & { creator: Creator };
export type FileUserInfo = Exclude<File, 'creator'> & { creator: Creator };
export type AppFolder = Pick<Folder, 'applicationId' | 'parentFolderId'>;
export type AppFolderType = { applicationId: string; type: AppFolderTypes };
export type AppsFolderType = { applicationIds: string[]; type: AppFolderTypes };
export type FolderChildren = Folder & { children: FileFolderChildren };
export type FileFolderChildren = { folders: FolderChildren[]; files: File[] };
export type FileContent = File & { content?: any; contentId?: string };
export type FileContentInfo = File & { contents?: Content[] };
export type FileFolderContentChildren = { folders: FolderChildren[]; files: FileContent[] };
export type FolderResourceGroup = Folder & { groups: AppResource };
export type FileAssoc = FileUserInfo & {
  folderName: string;
  content: ContentVersion;
  contentId?: string;
  online?: boolean;
};
export type FilePathSearch = FolderPathSearch & { fileName: string };
export type FilePageSearch = Exclude<FolderPageSearch, 'parentFolderId'> & {
  folderId?: string;
  type?: string;
};

export type FileWithOnline = File & { online: boolean };

export interface AppFileType {
  applicationId: string;
  type: string | string[];
}

export interface FileCheck {
  name: string;
  applicationId: string;
  type: FileTypes;
  suffix: string;
  folderId: string;
  deleted?: boolean;
}

export interface FolderCheck {
  name: string;
  applicationId: string;
  parentFolderId: string;
  deleted?: boolean;
}

export interface FolderPageSearch {
  applicationId: string;
  search?: string;
  parentFolderId?: string;
  from?: number;
  to?: number;
}

export interface FileNameSearch {
  applicationId: string;
  fileNames: string[];
  type: string | string[];
}

export interface FolderPathSearch {
  applicationId: string;
  parentFolderId: string;
  pathList: string[];
}

export interface ResourceSearch {
  applicationId: string;
  id?: string;
  name?: string;
}

export interface AppFolderSearch {
  deleted?: boolean;
  search?: string;
  page?: number;
  size?: number;
  parentFolderId?: string;
  parentFolderIds?: string[];
}

export interface FolderChildrenSearch {
  parentFolderIds: string[];
  search?: string;
  page?: number;
  size?: number;
}

export interface AppFolderSearchByName {
  applicationId: string;
  name: string;
  parentFolderId: string;
}

export interface AppDefaultFolderSearch {
  applicationIds: string[];
  type: AppFolderTypes;
}

export interface AppTypeFolderUpdate {
  applicationId: string;
  id: string;
  name?: string;
  intro?: string;
  folderPath?: string;
}

export interface AppTypeFileUpdate {
  applicationId: string;
  id: string;
  name?: string;
  intro?: string;
  tags?: Tag[];
}

export interface FileContentVersion {
  hasVersion?: boolean;
  content?: any;
}

export interface NewFileInfo {
  name: string;
  applicationId: string;
  type: FileTypes;
  creator?: string;
  folderId?: string;
  suffix?: string;
  intro?: string;
  tags?: any[];
  content?: any;
}

export interface FileListSearch {
  applicationId: string;
  id: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface ProjectPageContent {
  fileId: string;
  path: string;
  version: string;
  content: any;
}

export interface AppFileTag {
  applicationId: string;
  fileId: string;
  tags: Tag[];
}

export interface AppFileList {
  applicationId: string;
  ids: string[];
}

export interface AppTypeFileParams {
  applicationId: string;
  type: string;
  deleted: boolean;
  search?: string;
}
