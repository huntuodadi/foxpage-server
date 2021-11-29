import 'reflect-metadata';

import { Content, ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { VersionPublish } from '../../types/content-types';
import { ResData } from '../../types/index-types';
import {
  ContentVersionDetailRes,
  VersionPublishStatusReq,
} from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('pages')
export class SetPageVersionPublishAndLiveStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set the release status of the page content version,
   * only the base status can be changed to other statuses, such as beta, release, etc.
   *
   * When publishing the page, if the page has dependent data other than the template and the data is updated,
   * all dependent data will be published
   * @param  {AppContentStatusReq} params
   * @returns {Content}
   */
  @Put('/publish')
  @OpenAPI({
    summary: i18n.sw.setPageVersionPublishLiveStatus,
    description: '',
    tags: ['Page'],
    operationId: 'set-page-version-publish-and-live-status',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: VersionPublishStatusReq): Promise<ResData<ContentVersion>> {
    try {
      const hasAuth = await this.service.auth.version(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Set publishing status
      const result = await this.service.version.live.setVersionPublishStatus(params as VersionPublish, true);

      if (result.code === 1) {
        return Response.warning(i18n.page.pageVersionHasPublished);
      } else if (result.code === 2) {
        return Response.warning(i18n.page.invalidRelations + ':' + Object.keys(result.data).join(','));
      }

      if (result?.data) {
        this.service.content.live.setLiveContent(result?.data?.contentId, result?.data?.versionNumber, {
          id: result?.data?.contentId,
        } as Content);
      }

      await this.service.version.live.runTransaction();
      const versionDetail = await this.service.version.live.getDetailById(params.id);

      return Response.success(versionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.page.setPagePublishStatusFailed);
    }
  }
}
