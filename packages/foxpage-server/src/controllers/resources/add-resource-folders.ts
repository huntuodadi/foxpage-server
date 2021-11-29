import 'reflect-metadata';

import { Folder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, HeaderParams, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_FOLDER } from '../../../config/constant';
import { Header, ResData } from '../../types/index-types';
import { AddResourceGroupDetailReq, FolderDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName, formatToPath, generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class AddAssetDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Create static resource folder level details
   * @param  {AddTypeFolderDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('/folders')
  @OpenAPI({
    summary: i18n.sw.addResourceFolderDetail,
    description: '',
    tags: ['Resource'],
    operationId: 'add-resource-folder-detail',
  })
  @ResponseSchema(FolderDetailRes)
  async index(
    @Body() params: AddResourceGroupDetailReq,
    @HeaderParams() headers: Header,
  ): Promise<ResData<Folder>> {
    params.name = _.trim(params.name);

    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.file.invalidName);
    }

    try {
      const assetFolderId: string = generationId(PRE_FOLDER);
      const folderDetail: Folder = Object.assign(_.omit(params, 'path'), {
        id: assetFolderId,
        folderPath: params.path ? formatToPath(params.path) : formatToPath(params.name),
        creator: headers.userInfo.id || '',
      });

      // Check if the folder is duplicate
      const checkParams = Object.assign(
        { deleted: false },
        _.pick(folderDetail, ['applicationId', 'parentFolderId']),
      );
      const [nameDetail, pathDetail] = await Promise.all([
        this.service.folder.info.getDetail(Object.assign({ name: folderDetail.name }, checkParams)),
        this.service.folder.info.getDetail(
          Object.assign({ folderPath: folderDetail.folderPath }, checkParams),
        ),
      ]);

      if (nameDetail) {
        return Response.warning(i18n.resource.nameExist);
      }

      if (pathDetail) {
        return Response.warning(i18n.resource.pathExist);
      }

      // Add resource folder
      this.service.folder.info.create(folderDetail);

      await this.service.folder.info.runTransaction();
      const resourceDetail = await this.service.folder.info.getDetailById(assetFolderId);

      return Response.success(resourceDetail);
    } catch (err) {
      return Response.error(err, i18n.asset.addAssetFolderFailed);
    }
  }
}
