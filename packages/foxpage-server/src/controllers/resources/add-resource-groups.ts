import 'reflect-metadata';

import { Folder } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { PRE_FOLDER, RESOURCE_TYPE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { AddTypeFolderDetailReq, FolderDetailRes } from '../../types/validates/file-validate-types';
import * as Response from '../../utils/response';
import { checkName, formatToPath, generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('resources')
export class AddResourceGroupDetail extends BaseController {
  constructor() {
    super();
  }

  /**
   * Add a static resource group,
   * tags pass [{resourceType: 1|2, resourceId:'',tagType:'resourceGroup'}] to indicate
   * that the resource group is of type UNPKG
   * @param  {AddTypeFolderDetailReq} params
   * @param  {Header} headers
   * @returns {File}
   */
  @Post('/groups')
  @OpenAPI({
    summary: i18n.sw.addResourceGroupDetail,
    description: '/resource/folders',
    tags: ['Resource'],
    operationId: 'add-resource-group-detail',
  })
  @ResponseSchema(FolderDetailRes)
  async index(@Body() params: AddTypeFolderDetailReq): Promise<ResData<Folder>> {
    params.name = _.trim(params.name);

    // Check the validity of the name
    if (!checkName(params.name)) {
      return Response.warning(i18n.file.invalidName);
    }

    try {
      const assetFolderId: string = generationId(PRE_FOLDER);
      const folderDetail: Partial<Folder> = Object.assign(_.omit(params, ['path', 'parentFolderId']), {
        id: assetFolderId,
        parentFolderId: '',
        folderPath: params.path ? formatToPath(params.path) : formatToPath(params.name),
      });

      // Add resource group folder
      const result = await this.service.folder.info.addTypeFolderDetail(folderDetail, RESOURCE_TYPE);

      if (result.code === 1) {
        return Response.warning(i18n.resource.invalidType);
      }

      if (result.code === 2) {
        return Response.warning(i18n.resource.nameExist);
      }

      await this.service.folder.info.runTransaction();
      const projectDetail = await this.service.folder.info.getDetailById(assetFolderId);

      return Response.success(projectDetail);
    } catch (err) {
      return Response.error(err, i18n.asset.addAssetFolderFailed);
    }
  }
}
