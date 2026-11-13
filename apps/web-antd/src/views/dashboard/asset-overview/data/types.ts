/**
 * 资产总览（1.1）页面数据结构
 * ---------------------------------------------------------------------------
 * 当前全部为演示数据（见 ./demo.ts）。后续接入后端时：
 *   1. 保持以下 interface 不变，字段即接口契约；
 *   2. 在 api 层按 interface 返回真实数据，index.vue 里把 import 来源
 *      从 './data/demo' 换成接口返回即可，组件无需改动。
 */

/** 顶部 KPI 卡片 */
export interface KpiItem {
  /** 卡片标识：totalAssets / todayPnl / realizedPnl / floatingPnl / maxDrawdown */
  key: string;
  /** 标签（如：总资产（3 个账户）） */
  label: string;
  /** 主数值 */
  value: number;
  /** 主数值小数位，默认 2 */
  decimals?: number;
  /** 主数值后缀（如 %） */
  suffix?: string;
  /** 主数值本身的方向（今日盈亏、最大回撤这类带正负号的值） */
  trend?: 'down' | 'flat' | 'up';
  /** 副行：涨跌值（会按方向着色） */
  change?: number;
  /** 副行：涨跌幅（会按方向着色，渲染为胶囊徽标） */
  changePct?: number;
  /** 副行：对比说明（如：较昨日 / 沪深300 +0.48%） */
  changeLabel?: string;
  /** 副行：附加说明（灰色整行） */
  note?: string;
  /** 是否高亮卡（渐变底） */
  accent?: boolean;
  /** 图标色调（图标色块用，参考设计稿的彩色 chip） */
  tone?: 'amber' | 'blue' | 'orange' | 'teal' | 'violet';
  /** 迷你走势（sparkline 数据，可选） */
  spark?: number[];
}

/** 净值曲线单个数据点 */
export interface NavPoint {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 总资产（元） */
  nav: number;
  /** 基准指数点位（沪深300） */
  benchmark: number;
  /** 当日出入金净额（元），入金为正、出金为负 */
  flow: number;
}

/** 净值曲线时间区间 */
export type NavRange = '1m' | '1y' | '3m' | 'all';

/** 净值曲线收益口径 */
export type NavMode = 'simple' | 'twr' | 'xirr';

/** 净值卡页脚统计 */
export interface NavStats {
  /** 区间收益（简单口径） */
  rangeReturn: number;
  /** TWR 时间加权 */
  twr: number;
  /** XIRR 资金加权（年化） */
  xirr: number;
}

/** 资产配置单项 */
export interface AllocationItem {
  key: string;
  name: string;
  /** 市值（元） */
  value: number;
  /** 占比 % */
  percent: number;
}

/** 券商账户 */
export interface BrokerAccount {
  id: string;
  /** 展示名（如：华泰 · 主账户） */
  name: string;
  type: '信用' | '普通';
  /** 掩码账号 */
  accountNo: string;
  /** 总资产（元） */
  total: number;
  /** 可用资金（元） */
  available: number;
  /** 今日盈亏（元） */
  todayPnl: number;
}

/** 目标与进度行 */
export interface GoalItem {
  key: string;
  label: string;
  /** 主说明（展示在标签右侧） */
  hint?: string;
  kind: 'band' | 'count' | 'percent';
  /** percent：当前值 / 目标值 */
  current?: number;
  target?: number;
  /** band：当前值 + 目标区间 */
  band?: [number, number];
  /** count：当前笔数 / 上限 */
  unit?: string;
}
