/**
 * 券商账户（2.1）数据契约
 * ---------------------------------------------------------------------------
 * 字段命名对齐后端表 acc_account / acc_fee_rate，接入接口时直接映射：
 *   id            → acc_account.account_id（业务编号 AG-0001）
 *   accountNo     → acc_account.account_no（展示时脱敏）
 *   totalAssets   → acc_account.total_asset（元，BigDecimal）
 *   fee.*         → acc_fee_rate 一行（按账户 + 生效日期）
 *   boards        → acc_account_board（板块权限，一板块一行）
 * 金额一律为「元」的 number，展示层负责千分位与符号。
 */

/** 账户类型：普通 / 信用（两融） */
export type AccountType = 'CREDIT' | 'NORMAL';

/** 账户状态：启用 / 休眠（休眠账户不计入总资产与费率加权） */
export type AccountStatus = 'ACTIVE' | 'DORMANT';

/** 佣金口径：全佣（已含规费）/ 净佣（需再叠加规费） */
export type CommissionMode = 'ALL_IN' | 'NET';

/** 交易板块 */
export type BoardCode = 'BSE' | 'CONVERTIBLE' | 'GEM' | 'MAIN' | 'STAR';

/** 头像色块色调 */
export type ChipTone = 'blue' | 'gray' | 'teal' | 'violet';

/** 标签色调 */
export type TagTone = 'amber' | 'blue' | 'red' | 'slate';

/** 板块权限（一项 = 某账户在某板块的开通情况） */
export interface BoardPermission {
  /** 板块代码 */
  code: BoardCode;
  /** 是否已开通 */
  granted: boolean;
  /** 板块名称 */
  name: string;
  /** 开通条件说明 */
  requirement: string;
}

/** 费率（决定交易成本，也是 10.x 费用测算的输入） */
export interface FeeRate {
  /** 佣金率，如 0.00012 */
  commissionRate: number;
  /** 单笔最低佣金（元），常见 5 元 */
  minCommission: number;
  /** 佣金口径 */
  mode: CommissionMode;
  /** 规费（经手费 + 证管费），0.0000541 */
  regulatoryFeeRate: number;
  /** 印花税（卖出单边），0.0005 */
  stampTaxRate: number;
  /** 过户费（双边），0.00001 */
  transferFeeRate: number;
}

/** 券商账户 */
export interface BrokerAccount {
  /** 业务编号 AG-0001 */
  id: string;
  /** 资金账号（脱敏展示） */
  accountNo: string;
  /** 账户别名，如「主账户」 */
  alias: string;
  /** 可用资金（元） */
  available: number;
  /** 板块权限台账 */
  boards: BoardPermission[];
  /** 券商名称 */
  broker: string;
  /** 头像色块色调 */
  chipTone: ChipTone;
  /** 交易经验（月），由开户日与数据基准日算出 */
  experienceMonths: number;
  /** 费率 */
  fee: FeeRate;
  /** 开户日期 YYYY-MM-DD */
  openedAt: string;
  /** 用途备注，如「长线主仓」 */
  purpose: string;
  /** 风险等级，如「C4 积极型」 */
  riskLevel: string;
  /** 账户状态 */
  status: AccountStatus;
  /** 今日盈亏（元），可正可负 */
  todayPnl: number;
  /** 总资产（元） */
  totalAssets: number;
  /** 账户类型 */
  type: AccountType;
}

/** KPI 卡（由账户集合聚合得出，不单独落库） */
export interface AccountKpiItem {
  /** 是否主色强调（首卡） */
  accent?: boolean;
  /** 小数位，0 表示整数（如账户个数） */
  decimals: number;
  /** 副行说明 */
  hint: string;
  /** 唯一键 */
  key: string;
  /** 标签 */
  label: string;
  /** 数值色调：默认前景色 / down 用跌色 */
  tone?: 'default' | 'down';
  /** 单位后缀，如「个」 */
  unit?: string;
  /** 主数值 */
  value: number;
}

/** 板块标签（账户卡上的一排小 tag） */
export interface AccountTag {
  /** 文案 */
  text: string;
  /** 色调 */
  tone: TagTone;
}

/** 账户集合汇总 */
export interface AccountSummary {
  /** 可用资金合计 */
  available: number;
  /** 信用账户净资产 */
  creditNetAsset: number;
  /** 今日盈亏合计 */
  todayPnl: number;
  /** 总资产合计 */
  totalAssets: number;
}

/** 费率表行 */
export interface FeeRow {
  /** 所属账户编号 */
  accountId: string;
  /** 展示名「华泰 · 主账户」 */
  accountName: string;
  /** 佣金率原值 */
  commissionRate: number;
  /** 综合成本率（净佣已叠加规费） */
  effectiveRate: number;
  /** 最低佣金 */
  minCommission: number;
  /** 佣金口径 */
  mode: CommissionMode;
  /** 规费 */
  regulatoryFeeRate: number;
  /** 账户状态 */
  status: AccountStatus;
  /** 印花税 */
  stampTaxRate: number;
  /** 过户费 */
  transferFeeRate: number;
  /** 账户类型 */
  type: AccountType;
}

/** 费率表汇总 */
export interface FeeSummary {
  /** 净佣账户中综合成本率最高的账户名 */
  maxNetAccountName: string;
  /** 该账户的佣金率（不含规费） */
  maxNetCommissionRate: number;
  /** 该账户的综合成本率（含规费） */
  maxNetEffectiveRate: number;
  /** 按其总资产加权的综合成本率 */
  weightedRate: number;
}

/** 页面级演示数据（一屏所需全部数据，一次请求取回） */
export interface AccountOverview {
  /** 全部账户（含休眠） */
  accounts: BrokerAccount[];
  /** 数据基准日 YYYY-MM-DD */
  asOf: string;
  /** 快照生成时间，如「16:05 已同步」 */
  syncedAt: string;
  /** 可 T+0 转出金额（仅普通账户即时可用部分） */
  t0Withdrawable: number;
  /** 本周银证转账汇总 */
  weeklyCash: {
    /** 转入笔数 */
    inCount: number;
    /** 净入金（转出为负） */
    netIn: number;
    /** 转出笔数 */
    outCount: number;
  };
}
