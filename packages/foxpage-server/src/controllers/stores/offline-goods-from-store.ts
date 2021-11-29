import 'reflect-metadata';

import { StoreGoods } from '@foxpage/foxpage-server-types';
import _ from 'lodash';
import { Body, JsonController, Put } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { i18n } from '../../../app.config';
import { ResData } from '../../types/index-types';
import { GetStorePackageListRes, OfflineGoodsFromStoreReq } from '../../types/validates/store-validate-types';
import * as Response from '../../utils/response';
import { BaseController } from '../base-controller';

@JsonController('stores')
export class OfflineGoodsFromStore extends BaseController {
  constructor() {
    super();
  }

  /**
   * Remove the product from the store
   * @param  {OfflineGoodsFromStoreReq} params
   * @returns {GetPageTemplateListRes}
   */
  @Put('/goods-offline')
  @OpenAPI({
    summary: i18n.sw.offlineGoodsFromStore,
    description: '',
    tags: ['Store'],
    operationId: 'offline-goods-from-store',
  })
  @ResponseSchema(GetStorePackageListRes)
  async index(@Body() params: OfflineGoodsFromStoreReq): Promise<ResData<StoreGoods>> {
    try {
      // TODO Check removal permission

      // Get product details
      let goodsDetail = await this.service.store.goods.getDetailByAppFileId(params.applicationId, params.id);

      if (!goodsDetail) {
        return Response.warning(i18n.store.invalidTypeId);
      }

      // Set the status of the product to be off the shelf
      await this.service.store.goods.updateDetail(goodsDetail.id, { status: 0 });
      goodsDetail = await this.service.store.goods.getDetailById(goodsDetail.id);

      return Response.success(goodsDetail || {});
    } catch (err) {
      return Response.error(err, i18n.store.offlineGoodsFromStoreFailed);
    }
  }
}
