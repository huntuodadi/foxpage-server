import 'reflect-metadata';

import { Application, AppResource } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { LOG_CATEGORY_APPLICATION, LOG_UPDATE, PRE_RESOURCE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { AppDetailRes, UpdateAppReq } from '../../types/validates/app-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('applications')
export class UpdateApplicationDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update application details, only application name, introduction and locales can be updated
   * @param  {UpdateAppReq} params
   * @returns Application
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateAppDetail,
    description: '',
    tags: ['Application'],
    operationId: 'update-application-detail',
  })
  @ResponseSchema(AppDetailRes)
  async index(@Body() params: UpdateAppReq): Promise<ResData<Application>> {
    try {
      // Check the validity of the application
      let appDetail = await this.service.application.getDetailById(params.applicationId);
      if (!appDetail || appDetail.deleted) {
        return Response.warning(i18n.app.invalidAppId);
      }

      // Permission check
      const hasAuth = await this.service.auth.application(params.applicationId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Check whether the updated application slug already exists
      if (params.slug && params.slug !== appDetail.slug) {
        appDetail = await this.service.application.getDetail(_.pick(appDetail, ['organizationId', 'slug']));

        if (appDetail && !appDetail.deleted) {
          return Response.warning(i18n.app.appSlugExist);
        }
      }

      // Update application information, only allow the specified fields to be updated
      const appInfo = _.pick(params, ['name', 'intro', 'host', 'slug', 'locales', 'resources']);

      // Check the validity of the updated resources
      if (appInfo.resources && appInfo.resources.length > 0) {
        const checkResult = this.service.application.checkAppResourceUpdate(
          appDetail.resources || [],
          (appInfo.resources as AppResource[]) || [],
        );

        if (checkResult.code === 1) {
          return Response.warning(i18n.app.resourceUnDeleted + ':' + checkResult.data.join(','));
        } else if (checkResult.code === 2) {
          return Response.warning(i18n.app.resourceDuplication + ':' + checkResult.data.join(','));
        } else if (checkResult.code === 3) {
          return Response.warning(i18n.app.resourceTypeUnEditable + ':' + checkResult.data.join(','));
        } else if (checkResult.code === 4) {
          return Response.warning(i18n.app.invalidResourceIds + ':' + checkResult.data.join(','));
        }

        appInfo.resources.forEach((resource) => {
          resource.id = resource.id || generationId(PRE_RESOURCE);
        });
      }
      await this.service.application.updateDetail(params.applicationId, appInfo);

      const newAppDetail = await this.service.application.getDetailById(params.applicationId);

      // Save logs
      this.service.logSingleton.getInstance().saveLog({
        action: LOG_UPDATE,
        category: { id: params.applicationId, type: LOG_CATEGORY_APPLICATION },
        content: { id: params.applicationId, before: appDetail, after: newAppDetail },
      });

      return Response.success(newAppDetail || {});
    } catch (err) {
      return Response.error(err, i18n.app.updateDetailFailed);
    }
  }
}
