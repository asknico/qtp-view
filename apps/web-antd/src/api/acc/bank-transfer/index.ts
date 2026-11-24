import type {
  BankCardOption,
  BankTransfer,
  BankTransferImportResult,
  BankTransferQuery,
  BankTransferSave,
  BankTransferSummary,
  DepositPlan,
  DepositPlanSave,
} from './model';

import type { AccountOption } from '#/api/acc/cash-flow/model';
import type { IDS, PageResult } from '#/api/common';

import { ContentTypeEnum } from '#/api/helper';
import { alovaInstance } from '#/utils/http';

enum Api {
  create = '/acc/bankBrokerTransfer/create',
  depositPlanCreate = '/acc/bankBrokerTransfer/depositPlan/create',
  depositPlanGetCurrent = '/acc/bankBrokerTransfer/depositPlan/getCurrent',
  depositPlanRemove = '/acc/bankBrokerTransfer/depositPlan/remove',
  depositPlanUpdate = '/acc/bankBrokerTransfer/depositPlan/update',
  export = '/acc/bankBrokerTransfer/export',
  getAccountOptions = '/acc/bankBrokerTransfer/getAccountOptions',
  getBankAccountOptions = '/acc/bankBrokerTransfer/getBankAccountOptions',
  getInfo = '/acc/bankBrokerTransfer/getInfo',
  getMonthlyChart = '/acc/bankBrokerTransfer/getMonthlyChart',
  getSummary = '/acc/bankBrokerTransfer/getSummary',
  import = '/acc/bankBrokerTransfer/import',
  list = '/acc/bankBrokerTransfer/list',
  remove = '/acc/bankBrokerTransfer/remove',
  update = '/acc/bankBrokerTransfer/update',
}

/**
 * 银证转账（2.3）数据源 —— 接入后端 qtp-acc AccBankBrokerTransferController
 * <p>转账统一写入 t_acc_cash_flow（IN_TRANSFER / OUT_TRANSFER）；direction 服务端推导。
 */

/** 转账分页列表（日期/账户/银行卡/方向/来源/关键字筛选） */
export function bankTransferList(params?: BankTransferQuery) {
  return alovaInstance.get<PageResult<BankTransfer>>(Api.list, { params });
}

/** 页面汇总（累计口径：建仓至今，用于「累计净入金」卡片；accountCode 为空则全账户汇总） */
export function bankTransferSummary(accountCode?: string) {
  return alovaInstance.get<BankTransferSummary>(Api.getSummary, {
    params: { ...(accountCode ? { accountCode } : {}) },
  });
}

/** 单笔转账详情 */
export function bankTransferInfo(id: number | string) {
  return alovaInstance.get<BankTransfer>(Api.getInfo, { params: { id } });
}

/** 启用券商账户下拉（筛选与登记表单共用） */
export function bankTransferAccountOptions() {
  return alovaInstance.get<AccountOption[]>(Api.getAccountOptions);
}

/** 按券商账户查询有效存管银行卡（ACTIVE，主卡靠前） */
export function bankTransferBankCardOptions(accountCode: string) {
  return alovaInstance.get<BankCardOption[]>(Api.getBankAccountOptions, {
    params: { accountCode },
  });
}

/** 月度转账趋势（按月转入/转出/净入金；按券商账户过滤） */
export function bankTransferMonthlyChart(
  beginMonth?: string,
  endMonth?: string,
  accountCode?: string,
) {
  return alovaInstance.get<
    Array<{
      inAmount: number;
      month: string;
      netAmount: number;
      outAmount: number;
    }>
  >(Api.getMonthlyChart, {
    params: { ...(accountCode ? { accountCode } : {}), beginMonth, endMonth },
  });
}

/** 登记手工转账（sourceType 服务端固定 MANUAL） */
export function bankTransferAdd(data: BankTransferSave) {
  return alovaInstance.postWithMsg<void>(Api.create, data);
}

/** 修改手工转账（仅 MANUAL 来源可改） */
export function bankTransferUpdate(data: BankTransferSave) {
  return alovaInstance.postWithMsg<void>(Api.update, data);
}

/** 删除手工转账（逻辑删除；导入/系统来源后端拒绝） */
export function bankTransferRemove(ids: IDS) {
  return alovaInstance.postWithMsg<void>(Api.remove, ids);
}

/** 导入转账记录（标准模板 Excel，指纹去重） */
export function bankTransferImport(data: FormData) {
  return alovaInstance.post<BankTransferImportResult>(Api.import, data);
}

/** 当前入金计划（指定账户最新 ACTIVE 计划 + 近两期核销进度，无计划返回 null） */
export function depositPlanCurrent(accountCode?: string) {
  return alovaInstance.get<DepositPlan | null>(Api.depositPlanGetCurrent, {
    params: { ...(accountCode ? { accountCode } : {}) },
  });
}

/** 新建入金计划（同账户+银行卡仅一条 ACTIVE 计划） */
export function depositPlanAdd(data: DepositPlanSave) {
  return alovaInstance.postWithMsg<void>(Api.depositPlanCreate, data);
}

/** 修改入金计划（银行卡/金额/执行日/备注） */
export function depositPlanUpdate(data: DepositPlanSave) {
  return alovaInstance.postWithMsg<void>(Api.depositPlanUpdate, data);
}

/** 删除入金计划（逻辑删除） */
export function depositPlanRemove(id: number) {
  return alovaInstance.postWithMsg<void>(
    Api.depositPlanRemove,
    {},
    {
      params: { id },
    },
  );
}

/**
 * 导出转账记录（返回原生响应，从 download-filename 头取后端生成的
 * 文件名：银证转账_{N条}_{yyyyMMddHHmmss}.xlsx）
 */
export function bankTransferExport(
  data?: BankTransferQuery,
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
