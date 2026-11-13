/**
 * 市场概览（1.3）数据结构
 * ---------------------------------------------------------------------------
 * 上半部分是「接口契约」：字段与后端 DTO 一一对应，接入时保持结构不变即可。
 * 下半部分是「视图模型」：仅前端渲染使用，由 data/selectors.ts 从契约派生。
 *
 * 分层约定（与资产总览 / 今日速览一致）：
 *   api/market-overview.ts  → 只负责取数（演示数据 / 真实接口）
 *   data/selectors.ts       → 只负责 DTO → 视图模型
 *   components/*.vue        → 只负责渲染，不关心数据来源
 * 因此后期切接口时只改 api 层的 USE_DEMO 开关，组件与页面零改动。
 */

// #region 接口契约

/** 市场概览聚合数据（GET /dashboard/market-overview） */
export interface MarketOverview {
  /** 交易日 YYYY-MM-DD */
  tradeDate: string;
  /** 行情时间 HH:mm */
  quoteTime: string;
  /** 数据同步时间 HH:mm */
  updatedAt: string;
  /** 核心指数行情条（常驻置顶） */
  indices: IndexQuote[];
  /** 板块热力图（行业 / 概念 / 地域三个维度，矩形树图数据源） */
  heatmaps: Record<HeatDimension, SectorHeat[]>;
  /** 涨跌家数与量能 */
  breadth: MarketBreadth;
  /** 市场情绪指标与盘面时间轴 */
  sentiment: MarketSentiment;
}

/** 热力图维度 */
export type HeatDimension = 'concept' | 'industry' | 'region';

/** 核心指数行情 */
export interface IndexQuote {
  /** 指数代码，如 000001.SH */
  code: string;
  /** 指数名称 */
  name: string;
  /** 最新点位 */
  value: number;
  /** 较昨收涨跌点数 */
  change: number;
  /** 涨跌幅（%） */
  changePct: number;
  /** 成交额（亿元） */
  turnoverYi: number;
  /** 日内分时走势（用于迷你 sparkline，已归一化到 0~100） */
  spark: number[];
}

/** 板块热力（矩形树图的一个格子） */
export interface SectorHeat {
  /** 板块名称 */
  name: string;
  /** 今日涨跌幅（%），决定格子颜色深浅 */
  changePct: number;
  /** 今日成交额（亿元），决定格子面积 */
  turnoverYi: number;
}

/** 涨跌家数与量能 */
export interface MarketBreadth {
  /** 上涨家数 */
  upCount: number;
  /** 下跌家数 */
  downCount: number;
  /** 平盘家数 */
  flatCount: number;
  /** 涨停家数 */
  limitUp: number;
  /** 跌停家数 */
  limitDown: number;
  /** 近 5 个交易日两市成交额（亿元），最后一个为今日 */
  volume5d: Array<{ date: string; turnoverYi: number }>;
}

/** 市场情绪指标 */
export interface MarketSentiment {
  /** 两市成交额（亿元） */
  totalTurnoverYi: number;
  /** 较 5 日均量（%，正为放量） */
  turnoverVs5dPct: number;
  /** 封板率（%） */
  sealRatePct: number;
  /** 北向成交总额（亿元，仅披露总额） */
  northTurnoverYi: number;
  /** 融资余额（亿元） */
  marginBalanceYi: number;
  /** 融资余额较上周（%） */
  marginWoWPct: number;
  /** 北向数据可得性提示（监管口径说明） */
  northDisclaimer: string;
  /** 盘面时间轴（倒序或正序由后端定，前端按数组顺序渲染） */
  timeline: MarketTimelineItem[];
}

/** 盘面时间轴条目 */
export interface MarketTimelineItem {
  /** 时间 HH:mm */
  time: string;
  /** 事件标题 */
  title: string;
  /** 事件说明 */
  desc: string;
  /** 圆点色调：up=红（多头事件） info=蓝（中性事件） muted=灰（系统事件） */
  tone: 'info' | 'muted' | 'up';
}

/** 查询参数：预留日期维度，便于后端按日回溯 */
export interface MarketOverviewQuery {
  /** 交易日 YYYY-MM-DD，缺省为最新交易日 */
  date?: string;
}

// #endregion

// #region 视图模型（仅前端渲染使用）

/** 热力树图格子展示模型（组件拿到即可渲染） */
export interface HeatTileVm {
  /** 板块名称 */
  name: string;
  /** 今日涨跌幅（%） */
  changePct: number;
  /** 涨跌幅展示：+1.84% */
  pctDisplay: string;
  /** 今日成交额（亿元）= 格子面积 */
  turnoverYi: number;
  /** 成交额展示：688 亿 */
  turnoverDisplay: string;
}

/** 指数卡的展示模型（组件拿到即可渲染） */
export interface IndexCardVm {
  code: string;
  name: string;
  valueDisplay: string;
  changeDisplay: string;
  pctDisplay: string;
  turnoverDisplay: string;
  dir: string;
  spark: number[];
}

/** 量能柱展示模型 */
export interface VolumeBarVm {
  date: string;
  /** 柱高百分比（0~100，按 5 日内最大值归一） */
  heightPct: number;
  turnoverDisplay: string;
  isToday: boolean;
}

// #endregion
