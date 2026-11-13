/**
 * 今日速览（1.2）数据结构
 * ---------------------------------------------------------------------------
 * 上半部分是「接口契约」：字段与后端 DTO 一一对应，接入时保持结构不变即可。
 * 下半部分是「视图模型」：仅前端渲染使用，由 data/selectors.ts 从契约派生。
 *
 * 分层约定：
 *   api/today-overview.ts  → 只负责取数（演示数据 / 真实接口）
 *   data/selectors.ts      → 只负责 DTO → 视图模型
 *   components/*.vue       → 只负责渲染，不关心数据来源
 * 因此后期切接口时只改 api 层的 USE_DEMO 开关，组件与页面零改动。
 */

// #region 接口契约

/** 今日速览聚合数据（GET /dashboard/today-overview） */
export interface TodayOverview {
  /** 交易日 YYYY-MM-DD */
  tradeDate: string;
  /** 行情时间 HH:mm（A 股 15:00 收盘） */
  quoteTime: string;
  /** 数据同步时间 HH:mm */
  updatedAt: string;
  /** 数据来源说明（如：交割单导入 2026-10-28.xlsx） */
  dataSource?: string;
  /** 今日汇总指标 */
  summary: TodaySummary;
  /** 今日涨幅榜（按涨跌幅倒序） */
  gainers: HoldingMover[];
  /** 今日跌幅榜（按涨跌幅正序） */
  losers: HoldingMover[];
  /** 今日成交明细 */
  trades: TodayTrade[];
  /** 风控命中情况 */
  risk: TodayRisk;
  /** 收盘后已同步的业务模块名称，用于页脚提示 */
  syncedModules?: string[];
}

/** 今日汇总指标 */
export interface TodaySummary {
  /** 成交笔数 */
  tradeCount: number;
  /** 买入笔数 */
  buyCount: number;
  /** 卖出笔数 */
  sellCount: number;
  /** 成交额（元） */
  turnover: number;
  /** 昨日成交额（元），用于计算占比 */
  prevTurnover: number;
  /** 今日已实现盈亏（元，已扣费用） */
  realizedPnl: number;
  /** 今日已实现收益率（%） */
  realizedPct: number;
  /** 今日费用合计（元） */
  fee: number;
  /** 费用拆分 */
  feeDetail: FeeDetail;
  /** 今日操作次数 */
  operationCount: number;
  /** 每日操作次数上限 */
  operationLimit: number;
}

/** 费用拆分（A 股：佣金 + 印花税 + 过户费） */
export interface FeeDetail {
  /** 佣金（元） */
  commission: number;
  /** 印花税（元，仅卖出） */
  stampTax: number;
  /** 过户费（元） */
  transferFee: number;
}

/** 持仓涨跌榜行（行情快照） */
export interface HoldingMover {
  /** 证券代码，带市场后缀，如 600519.SH */
  code: string;
  /** 证券名称 */
  name: string;
  /** 现价 */
  price: number;
  /** 现价小数位（ETF / 基金为 3，默认 2） */
  priceDecimals?: number;
  /** 涨跌幅（%） */
  changePct: number;
  /** 浮动盈亏（元，按移动加权成本计算） */
  floatingPnl: number;
  /** 仓位占比（%） */
  positionPct: number;
  /** 距止损百分比（%，负值表示已跌到止损线下方） */
  stopDistancePct?: number;
}

/** 今日成交明细行 */
export interface TodayTrade {
  /** 成交编号 */
  id: string;
  /** 成交时间 HH:mm:ss */
  time: string;
  /** 账户简称（如：华泰-主、招商-两融） */
  account: string;
  /** 证券代码 */
  code: string;
  /** 证券名称 */
  name: string;
  /** 买卖方向 */
  side: 'buy' | 'sell';
  /** 成交价 */
  price: number;
  /** 成交数量（股） */
  qty: number;
  /** 成交额（元） */
  amount: number;
  /** 费用（元） */
  fee: number;
  /** 卖出时的已实现盈亏（元），买入为 null */
  realizedPnl: null | number;
  /** 是否在交易计划内 */
  planned: boolean;
}

/** 风控命中情况 */
export interface TodayRisk {
  /** 触及止损的持仓数量 */
  stopLossHit: number;
  /** 已触发预警的持仓 */
  alerts: Array<{
    code: string;
    name: string;
    /** 距止损百分比（%，负值表示已跌破） */
    stopDistancePct: number;
  }>;
}

/** 查询参数：预留日期 / 账户维度，便于后端按日回溯与多账户过滤 */
export interface TodayOverviewQuery {
  /** 交易日 YYYY-MM-DD，缺省为最新交易日 */
  date?: string;
  /** 券商账户 ID，缺省为全部账户 */
  accountId?: string;
}

// #endregion

// #region 视图模型（仅前端渲染使用）

/** KPI 卡副行文字色调 */
export type KpiTone = 'down' | 'flat' | 'muted' | 'up' | 'warn';

/** KPI 卡主数值方向 */
export type KpiValueTone = 'down' | 'up';

/** KPI 卡图标色块色调（与资产总览 KPI 卡同一套色板） */
export type KpiToneColor = 'amber' | 'blue' | 'orange' | 'teal' | 'violet';

/** KPI 卡（已格式化的展示模型，组件拿到即可渲染） */
export interface TodayKpiCard {
  key: string;
  label: string;
  /** 主数值（已含千分位 / 货币符 / 正负号） */
  display: string;
  /** 主数值后的小字，如「笔」「/ 10」 */
  unit?: string;
  /** 主数值方向着色 */
  valueTone?: KpiValueTone;
  /** 副行片段，按顺序渲染 */
  parts: Array<{ text: string; tone?: KpiTone }>;
  /** 副行右侧胶囊 */
  pill?: { text: string; tone: 'danger' | 'ok' | 'warn' };
  /** 是否高亮卡（渐变底） */
  accent?: boolean;
  /** 图标色块色调 */
  tone?: KpiToneColor;
  /** 图标 key（组件内置 feather 线性图标表） */
  icon?: string;
}

// #endregion
