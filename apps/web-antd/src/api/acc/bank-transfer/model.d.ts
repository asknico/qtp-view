import type { PageQuery } from '#/api/common';

/**
 * 银证转账（2.3）列表/详情行
 * <p>后端直接返回展示字段：账户名称、转账类型文案、带符号金额、银行卡脱敏快照、可编辑标记
 */
export interface BankTransfer {
  id: number;
  transferDate: string;
  /** 转账时间 HH:mm（分钟级，可为空） */
  transferTime?: null | string;
  accountCode: string;
  accountName: string;
  transferType: 'IN_TRANSFER' | 'OUT_TRANSFER';
  transferTypeName: string;
  direction: 0 | 1;
  amount: number;
  signedAmount: number;
  bankName?: null | string;
  /** 银行卡号（脱敏快照，可为空） */
  bankCardNo?: null | string;
  /** 转账后账户余额（对账单有则填，可为空） */
  balanceAfter?: null | number;
  sourceType: string;
  sourceTypeName: string;
  remark?: null | string;
  editable: boolean;
}

/** 页面汇总：累计口径（建仓至今），用于「累计净入金」卡片 */
export interface BankTransferSummary {
  cumulativeInAmount: number;
  cumulativeOutAmount: number;
  cumulativeNetAmount: number;
  /** 累计起始月份（最早一笔转账的 yyyy-MM） */
  sinceMonth?: null | string;
  /** 当年净入金（自然年 1 月至今，转入 − 转出） */
  yearNetInflow: number;
  /** 月均净入金（累计净入金 ÷ 建仓月数，含当月） */
  avgMonthlyInflow: number;
  /** 出入金次数（全部转账流水笔数） */
  transferCount: number;
}

/** 列表查询参数 */
export interface BankTransferQuery extends PageQuery {
  accountCode?: string;
  bankAccountId?: number;
  beginDate?: string;
  endDate?: string;
  keyword?: string;
  sourceType?: string;
  transferType?: string;
}

/** 新增/修改手工转账表单参数（direction 服务端推导，前端不可传） */
export interface BankTransferSave {
  id?: number;
  accountCode: string;
  bankAccountId?: number;
  transferType: string;
  transferDate: string;
  /** 转账时间 HH:mm（选填） */
  transferTime?: string;
  amount: number;
  remark?: string;
}

/** 存管银行卡选项 */
export interface BankCardOption {
  id: number;
  bankName: string;
  /** 银行卡号（脱敏） */
  bankCardNo: string;
  isPrimary?: number;
  cardType?: string;
}

/** 入金计划单期执行进度 */
export interface DepositPlanPeriod {
  /** 期次月份 yyyy-MM */
  month: string;
  /** COMPLETED 已完成 / PENDING 待执行 / OVERDUE 窗口已过未执行 */
  status: 'COMPLETED' | 'OVERDUE' | 'PENDING';
  /** 完成日期 yyyy-MM-dd（已完成时返回） */
  completedDate?: null | string;
  /** 计划执行日期 yyyy-MM-dd */
  expectedDate: string;
  /** 当期已入金合计（该卡→该账户当月 IN_TRANSFER 总额，未达标也可部分完成） */
  depositedAmount?: null | number;
}

/** 入金计划（当前 ACTIVE 计划 + 近两期核销进度，无计划接口返回 null） */
export interface DepositPlan {
  id: number;
  accountCode: string;
  accountName: string;
  /** 常用出金卡（选填，仅展示，不参与核销判定） */
  bankAccountId?: null | number;
  bankName?: null | string;
  bankCardNo?: null | string;
  planName: string;
  planType: string;
  amount: number;
  /** 每月执行日（1-31） */
  executeDay: number;
  planStatus: string;
  remark?: null | string;
  /** 下一笔执行日期 yyyy-MM-dd */
  nextExecutionDate: string;
  periods: DepositPlanPeriod[];
}

/** 入金计划保存参数（create 需 accountCode；常用出金卡选填，update 不传/传 null 清除） */
export interface DepositPlanSave {
  id?: number;
  accountCode?: string;
  bankAccountId?: number;
  planName?: string;
  amount: number;
  executeDay: number;
  remark?: string;
}

/** 导入结果（复用资金流水结构） */
export interface BankTransferImportResult {
  importLogCode: string;
  totalCount: number;
  successCount: number;
  duplicateCount: number;
  failCount: number;
  status: 'FAILED' | 'PARTIAL_SUCCESS' | 'SUCCESS';
  failRows: string[];
}
