import 'reflect-metadata';

import { Organization } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { OrgBaseDetailRes, OrgUpdateDetailReq } from '../../types/validates/org-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('organizations')
export class UpdateOrganizationDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update organization details, only the name will be updated for the time being
   * @param  {OrgUpdateDetailReq} params
   * @returns {Organization}
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateOrgDetail,
    description: '/organization/detail',
    tags: ['Organization'],
    operationId: 'update-organization-detail',
  })
  @ResponseSchema(OrgBaseDetailRes)
  async index(@Body() params: OrgUpdateDetailReq): Promise<ResData<Organization>> {
    try {
      // Check if the organization exists
      let orgDetail = await this.service.org.getDetailById(params.organizationId);

      if (!orgDetail || orgDetail.deleted) {
        return Response.warning(i18n.org.invalidOrgId);
      }

      const hasAuth = await this.service.auth.organization(params.organizationId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Update
      await this.service.org.updateDetail(params.organizationId, { name: params.name });

      // Get the latest details
      const newOrgDetail = await this.service.org.getDetailById(params.organizationId);

      // this.service.log.saveLog({
      //   action: LOG_UPDATE,
      //   category: { id: params.id, type: LOG_CATEGORY_ORGANIZATION },
      //   content: { id: params.id, contentId: '', before: orgDetail, after: newOrgDetail },
      // });

      return Response.success(newOrgDetail || {});
    } catch (err) {
      return Response.error(err, i18n.org.updateOrgFailed);
    }
  }
}
