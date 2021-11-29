import { Log } from '@foxpage/foxpage-server-types';

export type NewLog = Pick<Log, 'action' | 'category' | 'content'> & { operator?: string };

export interface ContentChange {
  applicationId: string;
  timestamp: number;
}
