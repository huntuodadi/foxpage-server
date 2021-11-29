import { ApplicationService } from './application-service';
import { AuthService } from './authorization-service';
import { ComponentService } from './component-service';
import * as content from './content-services';
import * as file from './file-services';
import * as folder from './folder-services';
import { LogService } from './log-service';
import { OrgService } from './organization-service';
import { RelationService } from './relation-service';
import { StorageService } from './storage-service';
import * as store from './store-services';
import { TeamService } from './team-service';
import { TransactionService } from './transaction-service';
import { UserService } from './user-service';
import * as version from './version-services';

const application = ApplicationService.getInstance(true);
const appSingleton = ApplicationService; // app的单例
const user = UserService.getInstance(true);
const userSingleton = UserService;
// const folder: FolderService = FolderService;
// const file: FileService = FileService;
const org: OrgService = OrgService.getInstance();
const team: TeamService = TeamService.getInstance();
// const content: ContentService = ContentService.getInstance();
// const version: VersionService = VersionService.getInstance();
// const auth: AuthService = AuthService.getInstance();
const logSingleton = LogService;
// const log = LogService.getInstance();
const relation: RelationService = RelationService.getInstance();
const transaction = TransactionService;
const auth: AuthService = AuthService.getInstance();
const component: ComponentService = ComponentService.getInstance();
const storage: StorageService = StorageService.getInstance();

export {
  application,
  appSingleton,
  auth,
  component,
  content,
  file,
  folder,
  logSingleton,
  org,
  // log,
  relation,
  storage,
  store,
  team,
  transaction,
  user,
  userSingleton,
  version,
};
