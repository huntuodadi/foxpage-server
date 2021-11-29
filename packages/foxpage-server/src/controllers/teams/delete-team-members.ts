import 'reflect-metadata';

import { Team } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AddDeleteTeamMembers, TeamBaseDetailRes } from '../../types/validates/team-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('teams')
export class DeleteTeamMemberList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Remove team members
   * @param  {AddDeleteTeamMembers} params
   * @returns {Team}
   */
  @Put('/members-status')
  @OpenAPI({
    summary: i18n.sw.deleteTeamMembers,
    description: '',
    tags: ['Team'],
    operationId: 'delete-team-members',
  })
  @ResponseSchema(TeamBaseDetailRes)
  async index(@Body() params: AddDeleteTeamMembers): Promise<ResData<Team>> {
    try {
      this.service.team.updateMembersStatus(params.teamId, params.userIds, false);
      await this.service.team.runTransaction();
      const teamInfo = await this.service.team.getDetailById(params.teamId);

      return Response.success(teamInfo || {});
    } catch (err) {
      return Response.error(err, i18n.team.updateTeamMemberFailed);
    }
  }
}
