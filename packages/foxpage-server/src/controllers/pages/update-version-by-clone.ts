import 'reflect-metadata';

import { ContentVersion } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import {
  ContentVersionDetailRes,
  CloneContentReq,
} from '../../types/validates/content-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('pages')
export class UpdatePageVersionDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Update content version by clone special content version
   * @param  {CloneContentReq} params
   * @returns {ContentVersion}
   */
  @Put('/clone')
  @OpenAPI({
    summary: i18n.sw.updatePageVersionDetail,
    description: '',
    tags: ['Page'],
    operationId: 'update-page-version-by-clone',
  })
  @ResponseSchema(ContentVersionDetailRes)
  async index(@Body() params: CloneContentReq): Promise<ResData<ContentVersion>> {
    try {
      console.log(params);

      return Response.success({});
    } catch (err) {
      return Response.error(err, i18n.content.updatePageVersionFailed);
    }
  }
}
