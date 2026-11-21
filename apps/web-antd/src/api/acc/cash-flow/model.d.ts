import type { PageQuery } from '#/api/common';

/**
 * 资金流水（2.2）列表/详情行
 * <p>后端直接返回展示字段：账户名称、类型/来源文案、带符号金额（流入为正/流出为负）、可编辑标记
 */
export interface CashFlow {
  id: number;
  flowDate: string;
  /** 发生时间 HH:mm（分钟级，可为空） */
  flowTime?: null | string;
  accountCode: string;
  accountName: string;
  flowType: string;
  flowTypeName: string;
  direction: 0 | 1;
  amount: number;
  signedAmount: number;
  balanceAfter?: null | number;
  secCode?: null | string;
  market?: null | string;
  linkName?: null | string;
  counterpartyDesc?: null | string;
  tradeCode?: null | string;
  dividendCode?: null | string;
  taxAmount?: null | number;
  bankName?: null | string;
  sourceType: string;
  sourceTypeName: string;
  importLogCode?: null | string;
  remark?: null | string;
  editable: boolean;
}

/** 顶部汇总卡片（本月流入/流出/净入金/期末资金余额） */
export interface CashFlowSummary {
  monthInAmount: number;
  monthOutAmount: number;
  /** 净入金 = 银证转入 − 银证转出（XIRR 口径） */
  monthNetInflow: number;
  /** 期末资金余额（各账户最后一笔有效余额汇总；null = 余额待同步） */
  periodEndBalance: null | number;
  balanceAsOfDate?: null | string;
  inTransferCount: number;
  dividendAmount: number;
  outTransferCount: number;
  feeAmount: number;
}

/** 列表查询参数 */
export interface CashFlowQuery extends PageQuery {
  accountCode?: string;
  beginDate?: string;
  direction?: 0 | 1;
  endDate?: string;
  flowType?: string;
  importLogCode?: string;
  keyword?: string;
  market?: string;
  secCode?: string;
  sourceType?: string;
}

/** 新增/修改手工流水表单参数（source_type 服务端强制 MANUAL） */
export interface CashFlowSave {
  id?: number;
  accountCode?: string;
  flowDate: string;
  /** 发生时间 HH:mm（分钟级，选填） */
  flowTime?: string;
  flowType: string;
  /** 仅 ADJUST 手工调整需传入；其余类型由服务端推导 */
  direction?: 0 | 1;
  amount: number;
  bankName?: string;
  remark?: string;
}

/** 导入结果 */
export interface CashFlowImportResult {
  importLogCode: string;
  totalCount: number;
  successCount: number;
  duplicateCount: number;
  failCount: number;
  status: 'FAILED' | 'PARTIAL_SUCCESS' | 'SUCCESS';
  failRows: string[];
}

/** 账户下拉选项 */
export interface AccountOption {
  id: number;
  accountCode: string;
  accountName: string;
  brokerCode?: null | string;
  brokerName?: null | string;
  accountNo?: null | string;
  accountType?: null | string;
  currency?: null | string;
  accountStatus?: null | string;
  orderNum?: null | number;
}

/** 月度净入金图表单点（yyyy-MM） */
export interface CashFlowMonthlyPoint {
  month: string;
  /** 银证转入合计 */
  inAmount: number;
  /** 银证转出合计 */
  outAmount: number;
  /** 净入金 = 转入 − 转出 */
  netAmount: number;
}

/** 资金类型占比单项（按发生笔数） */
export interface CashFlowTypeDistItem {
  flowType: string;
  flowTypeName: string;
  count: number;
  /** 占比百分比（按笔数，两位小数） */
  percentage: number;
}
