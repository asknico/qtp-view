import type {
  AccountOption,
  CashFlow,
  CashFlowImportResult,
  CashFlowQuery,
  CashFlowSave,
  CashFlowSummary,
} from './model';

import type { IDS, PageResult } from '#/api/common';

import { ContentTypeEnum } from '#/api/helper';
import { alovaInstance } from '#/utils/http';

enum Api {
  create = '/acc/cashFlow/create',
  export = '/acc/cashFlow/export',
  getAccountOptions = '/acc/cashFlow/getAccountOptions',
  getInfo = '/acc/cashFlow/getInfo',
  getMonthlyChart = '/acc/cashFlow/getMonthlyChart',
  getSummary = '/acc/cashFlow/getSummary',
  getTypeDistribution = '/acc/cashFlow/getTypeDistribution',
  import = '/acc/cashFlow/import',
  list = '/acc/cashFlow/list',
  remove = '/acc/cashFlow/remove',
  update = '/acc/cashFlow/update',
}

/**
 * 资金流水（2.2）数据源 —— 接入后端 qtp-acc AccCashFlowController
 */

/** 流水分页列表（日期/账户/类型/方向/来源/关键字筛选） */
export function cashFlowList(params?: CashFlowQuery) {
  return alovaInstance.get<PageResult<CashFlow>>(Api.list, { params });
}

/** 顶部汇总卡片（statMonth：yyyy-MM，为空取当月） */
export function cashFlowSummary(statMonth?: string) {
  return alovaInstance.get<CashFlowSummary>(Api.getSummary, {
    params: statMonth ? { statMonth } : {},
  });
}

/** 单笔流水详情 */
export function cashFlowInfo(id: number | string) {
  return alovaInstance.get<CashFlow>(Api.getInfo, { params: { id } });
}

/** 可用券商账户下拉（筛选与新增表单共用） */
export function cashFlowAccountOptions() {
  return alovaInstance.get<AccountOption[]>(Api.getAccountOptions);
}

/** 月度资金趋势（银证转账口径） */
export function cashFlowMonthlyChart(beginMonth?: string, endMonth?: string) {
  return alovaInstance.get<
    Array<{
      inAmount: number;
      month: string;
      netAmount: number;
      outAmount: number;
    }>
  >(Api.getMonthlyChart, { params: { beginMonth, endMonth } });
}

/** 资金类型占比（按发生笔数） */
export function cashFlowTypeDistribution(beginDate?: string, endDate?: string) {
  return alovaInstance.get<
    Array<{
      count: number;
      flowType: string;
      flowTypeName: string;
      percentage: number;
    }>
  >(Api.getTypeDistribution, { params: { beginDate, endDate } });
}

/** 新增手工流水（source_type 强制 MANUAL，direction 服务端推导） */
export function cashFlowAdd(data: CashFlowSave) {
  return alovaInstance.postWithMsg<void>(Api.create, data);
}

/** 修改手工流水（仅 MANUAL 来源可改） */
export function cashFlowUpdate(data: CashFlowSave) {
  return alovaInstance.postWithMsg<void>(Api.update, data);
}

/** 删除手工流水（逻辑删除；导入/系统流水后端拒绝） */
export function cashFlowRemove(ids: IDS) {
  return alovaInstance.postWithMsg<void>(Api.remove, ids);
}

/** 导入资金流水（标准模板 Excel，指纹去重） */
export function cashFlowImport(data: FormData) {
  return alovaInstance.post<CashFlowImportResult>(Api.import, data);
}

/**
 * 导出资金流水（返回原生 axios 响应，从 download-filename 头取后端生成的
 * 文件名：资金流水_{N条}_{yyyyMMddHHmmss}.xlsx，N = 当前筛选命中条数）
 */
export function cashFlowExport(
  data?: CashFlowQuery,
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
