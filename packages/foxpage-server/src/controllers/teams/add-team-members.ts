import 'reflect-metadata';

import { Member, Team } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { AddDeleteTeamMembers, TeamBaseDetailRes } from '../../types/validates/team-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('teams')
export class AddTeamMembers extends BaseController {
  constructor() {
    super();
  }

  /**
   * Add team members
   * @param  {AddDeleteTeamMembers} params
   * @returns {Team}
   */
  @Post('/members')
  @OpenAPI({
    summary: i18n.sw.addTeamMembers,
    description: '',
    tags: ['Team'],
    operationId: 'add-team-members',
  })
  @ResponseSchema(TeamBaseDetailRes)
  async index(@Body() params: AddDeleteTeamMembers): Promise<ResData<Team>> {
    try {
      // Check permissions
      const hasAuth = await this.service.auth.team(params.teamId);
      if (!hasAuth) {
        return Response.accessDeny(i18n.system.accessDeny);
      }

      // Check the validity of members
      const [userList, memberList] = await Promise.all([
        this.service.user.getDetailByIds(params.userIds),
        this.service.team.find(
          { id: params.teamId, 'members.userId': { $in: params.userIds } },
          'members.userId',
        ),
      ]);
      const userIds = _.map(userList, 'id');
      const invalidUserIds = _.difference(params.userIds, userIds) as string[];
      userList.forEach((user) => {
        if (user.deleted) {
          invalidUserIds.push(user.id as string);
        }
      });

      if (invalidUserIds.length > 0) {
        return Response.warning(i18n.user.invalidUser + ':' + invalidUserIds.join(','));
      }

      const teamMemberIds = _.map(memberList[0]?.members, 'userId');
      const existUserIds: string[] = _.intersection(params.userIds, teamMemberIds);
      let members: Member[] = [];
      _.difference(params.userIds, teamMemberIds).forEach((userId) => {
        members.push({
          userId: userId as string,
          joinTime: new Date(),
          status: true,
        });
      });

      if (existUserIds.length > 0) {
        this.service.team.batchUpdateDetailQuery(
          { id: params.teamId, 'members.userId': { $in: existUserIds } },
          { $set: { 'members.$.status': true } } as any,
        );
      }

      this.service.team.updateDetailQuery(params.teamId, { $push: { members } } as any);
      await this.service.team.runTransaction();
      const teamInfo = await this.service.team.getDetailById(params.teamId);

      return Response.success(teamInfo);
    } catch (err) {
      return Response.error(err, i18n.team.addTeamMembersFailed);
    }
  }
}
