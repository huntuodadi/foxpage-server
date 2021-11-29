import { Member } from '@foxpage/foxpage-server-types';

export type PageList<T> = Pick<ResData<T>, 'pageInfo' | 'data'>;
export type TRecord<T> = Record<string, T>;

// 通用返回状态
export interface ResMsg {
  code: number;
  msg?: string;
}

export interface PageSize {
  page: number;
  size: number;
}

export interface PageInfo extends PageSize {
  total: number;
}

export interface ResData<T> extends ResMsg {
  data?: Object | T[];
  pageInfo?: PageInfo;
}

export interface ServiceRes {
  code: 0 | 1;
  msg?: string;
}

export interface Search extends Partial<PageSize> {
  search?: string;
}

export interface SearchModel extends Partial<PageSize> {
  search?: object;
}

export interface Creator {
  id: string;
  account: string;
}

export interface Header {
  token: string;
  userInfo: Creator;
}

export interface IdName {
  id: string;
  name: string;
}

export interface TypeStatus {
  applicationId: string;
  id: string;
  status: boolean;
}

export interface PageData<T> {
  list: T[];
  count: number;
}

export interface MemberInfo extends Member {
  account?: string;
}

export interface NameVersion {
  name: string;
  version?: string;
}
