import 'reflect-metadata';

import { Organization } from '@foxpage/foxpage-server-types';
import { Body, HeaderParams, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_ORGANIZATION } from '../../../config/constant';
import { Header, ResData } from '../../types/index-types';
import { NewOrgParams } from '../../types/organization-types';
import { AddOrgDetailReq, OrgBaseDetailRes } from '../../types/validates/org-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('organizations')
export class AddOrganizationDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create organization details
   * @param  {AddOrgDetailReq} params
   * @param  {Header} headers
   * @returns {Organization}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addOrgDetail,
    description: '',
    tags: ['Organization'],
    operationId: 'add-organization-detail',
  })
  @ResponseSchema(OrgBaseDetailRes)
  async index(
    @Body() params: AddOrgDetailReq,
    @HeaderParams() headers: Header,
  ): Promise<ResData<Organization>> {
    try {
      const newOrganization: NewOrgParams = {
        id: generationId(PRE_ORGANIZATION),
        name: params.name,
        creator: headers.userInfo.id || '',
      };

      await this.service.org.addDetail(newOrganization);

      // Get organization details
      const orgDetail = await this.service.org.getDetailById(newOrganization.id as string);

      // 记录日志
      // this.service.log.saveLog({
      //   action: LOG_CREATE,
      //   category: { id: newOrganization.id, type: LOG_CATEGORY_ORGANIZATION },
      //   content: { id: newOrganization.id, contentId: '', before: {}, after: orgDetail },
      // });

      return Response.success(orgDetail);
    } catch (err) {
      return Response.error(err, i18n.org.addOrgFailed);
    }
  }
}
