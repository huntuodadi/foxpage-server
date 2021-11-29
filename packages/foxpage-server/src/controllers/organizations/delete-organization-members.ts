import 'reflect-metadata';

import { Organization } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { DeleteOrgMembersReq, OrgBaseDetailRes } from '../../types/validates/org-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('organizations')
export class DeleteOrganizationMembers extends BaseController {
  constructor() {
    super();
  }

  /**
   * Delete organization member
   * @param  {AddOrgMembersReq} params
   * @returns {Organization}
   */
  @Put('/members-status')
  @OpenAPI({
    summary: i18n.sw.deleteOrgMemberDetail,
    description: '',
    tags: ['Organization'],
    operationId: 'delete-organization-member',
  })
  @ResponseSchema(OrgBaseDetailRes)
  async index(@Body() params: DeleteOrgMembersReq): Promise<ResData<Organization>> {
    try {
      // Permission check
      const hasAuth = await this.service.auth.organization(params.organizationId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      this.service.org.updateMembersStatus(params.organizationId, params.userIds, false);
      await this.service.org.runTransaction();
      const orgInfo = await this.service.org.getDetailById(params.organizationId);

      return Response.success(orgInfo);
    } catch (err) {
      return Response.error(err, i18n.org.deletedOrgMemberFailed);
    }
  }
}
