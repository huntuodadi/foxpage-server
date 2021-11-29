import 'reflect-metadata';

import { Member, Organization } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { OrgBaseDetailRes, OrgStatusReq } from '../../types/validates/org-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('organizations')
export class SetOrganizationStatus extends BaseController {
  constructor() {
    super();
  }

  /**
   * Set organization deletion status
   * @param  {OrgStatusReq} params
   * @returns {Organization}
   */
  @Put('/status')
  @OpenAPI({
    summary: i18n.sw.setOrgDeleteStatue,
    description: '',
    tags: ['Organization'],
    operationId: 'set-org-delete-status',
  })
  @ResponseSchema(OrgBaseDetailRes)
  async index(@Body() params: OrgStatusReq): Promise<ResData<Organization>> {
    try {
      // Check the validity of the organization ID
      const sourceOrgDetail = await this.service.org.getDetailById(params.organizationId);
      if (!sourceOrgDetail || sourceOrgDetail.deleted) {
        return Response.warning(i18n.org.invalidOrgId);
      }

      // Permission check
      const hasAuth = await this.service.auth.organization(params.organizationId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // TODO: Check whether the prerequisites are met,
      // currently there are no teams and members under the organization
      const orgTeamList = await this.service.team.find({ organizationId: params.organizationId });
      let validUsers: Member | undefined = undefined;
      if (sourceOrgDetail.members && sourceOrgDetail.members.length > 0) {
        validUsers = _.find(sourceOrgDetail.members, { status: true });
      }

      if (!validUsers || !orgTeamList) {
        return Response.warning(i18n.team.memberNotEmpty);
      }

      // Set status
      const status = _.isNil(params.status) ? true : !!params.status;
      await this.service.org.updateDetail(params.organizationId, { deleted: status });
      const orgDetail = await this.service.org.getDetailById(params.organizationId);

      return Response.success(orgDetail);
    } catch (err) {
      return Response.error(err, i18n.org.setOrgStatusFailed);
    }
  }
}
