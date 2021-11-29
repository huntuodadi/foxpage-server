import 'reflect-metadata';

import { Team } from '@foxpage/foxpage-server-types';
import { Body, HeaderParams, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_TEAM } from '../../../config/constant';
import { Header, ResData } from '../../types/index-types';
import { NewTeamParams } from '../../types/team-types';
import { AddTeamDetailReq, TeamBaseDetailRes } from '../../types/validates/team-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('teams')
export class AddTeamDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create team details
   * @param  {AddTeamDetailReq} params
   * @param  {Header} headers
   * @returns {Team}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.addTeamDetail,
    description: '',
    tags: ['Team'],
    operationId: 'add-team-detail',
  })
  @ResponseSchema(TeamBaseDetailRes)
  async index(@Body() params: AddTeamDetailReq, @HeaderParams() headers: Header): Promise<ResData<Team>> {
    try {
      // TODO Check permissions

      // Check if the same team exists under the same organization
      const teamExist = await this.service.team.checkTeamExist(params);
      if (teamExist) {
        return Response.warning(i18n.team.nameExist);
      }

      // Create team info
      const newTeam: NewTeamParams = {
        id: generationId(PRE_TEAM),
        name: params.name,
        organizationId: params.organizationId,
        creator: headers.userInfo.id || '',
      };
      await this.service.team.addDetail(newTeam);

      // Get team details
      const teamDetail = await this.service.team.getDetailById(newTeam.id as string);

      // Save log
      // this.service.log.saveLog({
      //   action: LOG_CREATE,
      //   category: { id: params.organizationId, type: LOG_CATEGORY_ORGANIZATION },
      //   content: { id: newTeam.id, contentId: '', before: {}, after: teamDetail },
      // });

      return Response.success(teamDetail || {});
    } catch (err) {
      return Response.error(err, i18n.team.addTeamFailed);
    }
  }
}
