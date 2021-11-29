import 'reflect-metadata';

import { Content } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppContentLiveReq, ContentDetailRes } from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('components')
export class SetComponentLiveVersions extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set the live version of the component
   * @param  {AppContentStatusReq} params
   * @returns {Content}
   */
  @Put('/live-versions')
  @OpenAPI({
    summary: i18n.sw.setComponentContentLive,
    description: '',
    tags: ['Component'],
    operationId: 'set-component-live-versions',
  })
  @ResponseSchema(ContentDetailRes)
  async index(@Body() params: AppContentLiveReq): Promise<ResData<Content>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.content(params.id);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      const result = await this.service.content.live.setLiveVersion(params);

      if (result.code === 1) {
        return Response.warning(i18n.content.invalidVersionId);
      } else if (result.code === 2) {
        return Response.warning(i18n.content.versionIsNotReleaseStatus);
      } else if (result.code === 3) {
        const contentResult: Record<string, any> = JSON.parse(result.data as string);
        if (contentResult.code === 1) {
          return Response.warning(i18n.content.ComponentInfoNotExist + ':' + contentResult.data.join(','));
        } else if (contentResult.code === 2) {
          return Response.warning(i18n.content.ComponentDependRecursive + ':' + contentResult.data);
        }
      }

      await this.service.version.live.runTransaction();
      const versionDetail = await this.service.content.info.getDetailById(params.id);

      return Response.success(versionDetail || {});
    } catch (err) {
      return Response.error(err, i18n.component.setComponentContentLiveFailed);
    }
  }
}
