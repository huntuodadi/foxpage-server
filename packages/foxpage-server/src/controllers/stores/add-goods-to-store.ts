import 'reflect-metadata';

import { FileTypes, StoreGoods } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Post } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { LOG_CREATE, LOG_UPDATE, PACKAGE_TYPE, PRE_STORE } from '../../../config/constant';
import { ResData } from '../../types/index-types';
import { AddGoodsToStoreReq, GetStorePackageListRes } from '../../types/validates/store-validate-types';
import * as Response from '../../utils/response';
import { generationId } from '../../utils/tools';
import { BaseController } from '../base-controller';

@JsonController('stores')
export class AddGoodsToStore extends BaseController {
  constructor() {
    super();
  }

  /**
   * Add file to the store
   * @param  {AddGoodsToStoreReq} params
   * @returns {GetPageTemplateListRes}
   */
  @Post('/goods')
  @OpenAPI({
    summary: i18n.sw.addGoodsToStore,
    description: '',
    tags: ['Store'],
    operationId: 'add-goods-to-store',
  })
  @ResponseSchema(GetStorePackageListRes)
  async index(@Body() params: AddGoodsToStoreReq): Promise<ResData<StoreGoods>> {
    try {
      // TODO Check permissions

      // Check if the target has been added to the store
      const [goodsDetail, fileDetail, fileContentList] = await Promise.all([
        this.service.store.goods.getDetailByTypeId(params.id),
        this.service.file.info.getDetailById(params.id),
        this.service.content.list.getContentObjectByFileIds([params.id]),
      ]);

      // online
      if (goodsDetail && goodsDetail.status === 1) {
        return Response.warning(i18n.store.goodsExist);
      }

      if (!fileDetail || fileDetail.deleted) {
        return Response.warning(i18n.store.invalidTypeId);
      }

      const contentLiveNumbers = _.pull(_.map(fileContentList, 'liveVersionNumber'), 0);
      if (contentLiveNumbers.length === 0) {
        return Response.warning(i18n.store.mustHasLiveVersion);
      }

      // Get the live version details of the target
      const dataDetail = Object.assign(
        { projectId: params.type !== PACKAGE_TYPE ? fileDetail.folderId : undefined },
        _.pick(fileDetail, ['id', 'applicationId', 'creator']),
      );

      // Up to Store
      let goodsId = goodsDetail?.id || '';

      if (goodsDetail) {
        await this.service.store.goods.updateDetail(goodsDetail.id, {
          details: dataDetail,
          status: 1,
          deleted: false,
        });
      } else {
        goodsId = generationId(PRE_STORE);
        await this.service.store.goods.addDetail({
          id: goodsId,
          name: fileDetail.name,
          intro: params.intro || '',
          type: params.type as FileTypes,
          details: dataDetail,
          status: 1,
        });
      }

      const newGoodsDetail = await this.service.store.goods.getDetailById(goodsId);

      // Save log
      this.service.logSingleton
        .getInstance()
        .addLogItem(goodsDetail ? LOG_UPDATE : LOG_CREATE, newGoodsDetail);

      return Response.success(newGoodsDetail);
    } catch (err) {
      return Response.error(err, i18n.store.addGoodsToStoreFailed);
    }
  }
}
