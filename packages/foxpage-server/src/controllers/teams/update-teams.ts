import 'reflect-metadata';

import { Team } from '@foxpage/foxpage-server-types';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { TeamBaseDetailRes, UpdateTeamDetailReq } from '../../types/validates/team-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('teams')
export class UpdateTeamDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update team details, only the team name can be updated temporarily
   * @param  {UpdateTeamDetailReq} params
   * @returns {Team}
   */
  @Put('')
  @OpenAPI({
    summary: i18n.sw.updateTeamDetail,
    description: '',
    tags: ['Team'],
    operationId: 'update-team-detail',
  })
  @ResponseSchema(TeamBaseDetailRes)
  async index(@Body() params: UpdateTeamDetailReq): Promise<ResData<Team>> {
    try {
      // Get team details
      let teamDetail = await this.service.team.getDetailById(params.teamId);
      if (!teamDetail || teamDetail.deleted) {
        return Response.warning(i18n.team.invalidTeamId);
      }

      // Permission check
      const hasAuth = await this.service.auth.team(params.teamId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      if (teamDetail.name !== params.name) {
        // Update team details
        await this.service.team.updateDetail(params.teamId, { name: params.name });

        // Get new team details
        teamDetail = await this.service.team.getDetailById(params.teamId);

        // this.service.log.saveLog({
        //   action: LOG_UPDATE,
        //   category: { id: newTeamDetail.organizationId, type: LOG_CATEGORY_ORGANIZATION },
        //   content: { id: newTeamDetail.id, before: sourceTeamDetail, after: newTeamDetail },
        // });
      }

      return Response.success(teamDetail || {});
    } catch (err) {
      return Response.error(err, i18n.team.updateTeamFailed);
    }
  }
}
