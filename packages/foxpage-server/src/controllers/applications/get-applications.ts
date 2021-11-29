import 'reflect-metadata';

import { Application } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AppListByIdsReq, AppListRes } from '../../types/validates/app-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('applications')
export class GetApplicationList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the details of the specified applications
   * @param  {AppListReq} params
   * @returns {AppInfo}
   */
  @Post('/list')
  @OpenAPI({
    summary: i18n.sw.getAppListByIds,
    description: '',
    tags: ['Application'],
    operationId: 'get-application-list-by-ids',
  })
  @ResponseSchema(AppListRes)
  async index(@Body() params: AppListByIdsReq): Promise<ResData<Application[]>> {
    try {
      const appList = await this.service.application.getDetailByIds(params.applicationIds);

      return Response.success(appList || []);
    } catch (err) {
      return Response.error(err, i18n.app.listError);
    }
  }
}
