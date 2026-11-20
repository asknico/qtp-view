import type {
  BrokerManage,
  BrokerManageQuery,
  BrokerManageSave,
  BrokerManageSummary,
} from './model';

import type { IDS, PageResult } from '#/api/common';

import { ContentTypeEnum } from '#/api/helper';
import { alovaInstance } from '#/utils/http';

enum Api {
  changeStatus = '/acc/brokerManage/changeStatus',
  checkCodeUnique = '/acc/brokerManage/checkCodeUnique',
  create = '/acc/brokerManage/create',
  export = '/acc/brokerManage/export',
  getInfo = '/acc/brokerManage/getInfo',
  getOptions = '/acc/brokerManage/getOptions',
  getSummary = '/acc/brokerManage/getSummary',
  list = '/acc/brokerManage/list',
  remove = '/acc/brokerManage/remove',
  update = '/acc/brokerManage/update',
}

/**
 * 券商管理（2.6）数据源 —— 接入后端 qtp-acc AccBrokerManageController
 */

/** 券商分页列表（筛选/排序） */
export function brokerManageList(params?: BrokerManageQuery) {
  return alovaInstance.get<PageResult<BrokerManage>>(Api.list, { params });
}

/** 顶部汇总：券商总数 / 覆盖市场数 / 佣金区间 / 全佣净佣分布 */
export function brokerManageSummary() {
  return alovaInstance.get<BrokerManageSummary>(Api.getSummary);
}

/** 券商详情（编辑弹窗初始化） */
export function brokerManageInfo(brokerId: number | string) {
  return alovaInstance.get<BrokerManage>(Api.getInfo, { params: { brokerId } });
}

/** 券商编码查重（编码输入失焦校验）true=可用，false=已存在 */
export function brokerManageCheckCodeUnique(
  brokerCode: string,
  id?: number | string,
) {
  return alovaInstance.get<boolean>(Api.checkCodeUnique, {
    params:
      id === null || id === undefined ? { brokerCode } : { brokerCode, id },
  });
}

/** 可选启用券商（下拉专用） */
export function brokerManageOptions() {
  return alovaInstance.get<BrokerManage[]>(Api.getOptions);
}

/** 新增券商档案 */
export function brokerManageAdd(data: BrokerManageSave) {
  return alovaInstance.postWithMsg<void>(Api.create, data);
}

/** 编辑券商（编码不可修改） */
export function brokerManageUpdate(data: BrokerManageSave) {
  return alovaInstance.postWithMsg<void>(Api.update, data);
}

/** 停用 / 启用切换 */
export function brokerManageChangeStatus(data: {
  brokerStatus: 'ACTIVE' | 'INACTIVE';
  id: number;
}) {
  return alovaInstance.postWithMsg<void>(Api.changeStatus, data);
}

/** 批量删除（逻辑删除；存在关联账户时后端拒绝） */
export function brokerManageRemove(ids: IDS) {
  return alovaInstance.postWithMsg<void>(Api.remove, ids);
}

/**
 * 导出券商列表（返回原生 axios 响应，从 download-filename 头取后端生成的
 * 文件名：券商管理_{N条}_{yyyyMMddHHmmss}.xlsx，N = 勾选条数或筛选命中条数）
 * @param ids 勾选行的 brokerId 集合，逗号串入参（@RequestParam List<Long> 可直接绑定）
 */
export function brokerManageExport(
  data?: BrokerManageQuery,
  ids?: Array<number | string>,
) {
  const body = {
    ...data,
    ...(ids && ids.length > 0 ? { ids: ids.join(',') } : {}),
  };
  return alovaInstance.post(Api.export, body, {
    headers: { 'Content-Type': ContentTypeEnum.FORM_URLENCODED },
    isReturnNativeResponse: true,
    responseType: 'blob',
  });
}
