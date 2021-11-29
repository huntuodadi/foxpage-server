import { Get, JsonController } from 'routing-controllers';

import { ResData } from '../types/index-types';
import * as Response from '../utils/response';

@JsonController('')
export class HealthCheck {
  @Get('healthcheck')
  async index(): Promise<ResData<string>> {
    return Response.success('Hello fox!');
  }
}
