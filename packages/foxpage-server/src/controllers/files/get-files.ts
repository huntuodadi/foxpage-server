import 'reflect-metadata';

import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { FileWithOnline } from '../../types/file-types';
import { ResData } from '../../types/index-types';
import { StoreFileStatus } from '../../types/store-types';
import { AppFileListReq, FileDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('files')
export class GetFileList extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get the details of the specified file under the specified application
   * @param  {FileListReq} params
   * @returns {FileUserInfo}
   */
  @Post('')
  @OpenAPI({
    summary: i18n.sw.getAppFileList,
    description: '',
    tags: ['File'],
    operationId: 'get-app-file-list',
  })
  @ResponseSchema(FileDetailRes)
  async index(@Body() params: AppFileListReq): Promise<ResData<FileWithOnline[]>> {
    try {
      // Get file details and status of whether it is on the store
      const [fileList, goodsStatusList] = await Promise.all([
        this.service.file.list.getAppFileList(params),
        this.service.store.goods.getAppFileStatus(params.applicationId, params.ids),
      ]);

      const goodsStatusObject: Record<string, StoreFileStatus> = _.keyBy(goodsStatusList, 'id');

      let fileWithOnlineList: FileWithOnline[] = [];
      fileList.forEach((file) => {
        fileWithOnlineList.push(
          Object.assign(
            {
              online: goodsStatusObject?.[file.id]?.status ? true : false,
            },
            file,
          ),
        );
      });

      return Response.success(fileWithOnlineList || []);
    } catch (err) {
      return Response.error(err, i18n.file.listError);
    }
  }
}
