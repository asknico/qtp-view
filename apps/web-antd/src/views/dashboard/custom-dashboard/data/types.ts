/**
 * 自定义看板（1.6）数据结构
 * ---------------------------------------------------------------------------
 * 上半部分是「接口契约」：字段与后端 DTO 一一对应，接入时结构保持不变；
 * 下半部分是「布局模型」：显隐 / 排序 / 列数等纯前端配置。
 *
 * 分层约定：
 *   api/custom-dashboard.ts  → 只负责取数（演示数据 / 真实接口）
 *   data/selectors.ts        → 只负责 DTO → 视图模型（格式化、归一化）
 *   composables/*            → 只负责布局草稿与保存
 *   components/*.vue         → 只负责渲染，不关心数据来源
 */

// #region 卡片与布局

/** 卡片分区：mini 顶部四小卡 / panel 下方内容卡 */
export type DashboardCardZone = 'mini' | 'panel';

/** 看板卡片标识（配置面板、栅格与组件映射共用） */
export type DashboardCardKey =
  | 'industry'
  | 'marketHeat'
  | 'navTrend'
  | 'position'
  | 'todayPnl'
  | 'todo'
  | 'topHoldings'
  | 'totalAssets';

/** 布局列数：1 单列阅读 / 2 两列标准 / 3 三列紧凑 */
export type LayoutColumns = 1 | 2 | 3;

/** 净值区间：3 月 / 6 月 / 1 年 */
export type NavRange = '1y' | '3m' | '6m';

/** 卡片元信息：数组顺序即默认布局顺序 */
export interface DashboardCardMeta {
  /** 卡片口径 / 参数说明，配置面板悬浮提示用 */
  hint: string;
  key: DashboardCardKey;
  label: string;
  /** 常驻卡片（不允许隐藏，例如总资产） */
  required?: boolean;
  zone: DashboardCardZone;
}

/** 布局草稿：显隐 + 排序 + 列数，保存后生效并持久化 */
export interface DashboardLayout {
  columns: LayoutColumns;
  order: DashboardCardKey[];
  visible: Record<DashboardCardKey, boolean>;
}

/** 卡片参数：属展示阈值，改动即时生效 */
export interface DashboardParams {
  navRange: NavRange;
  refreshMinutes: number;
}

// #endregion

// #region 接口契约

/** 总资产卡 */
export interface TotalAssetsCard {
  /** 今日变动额（元） */
  dayChange: number;
  /** 今日变动幅度（%） */
  dayChangePct: number;
  /** 迷你走势（最近 16 个交易日收盘市值，元） */
  spark: number[];
  /** 总资产（元） */
  value: number;
}

/** 今日盈亏卡 */
export interface TodayPnlCard {
  /** 对比基准名称，如「沪深300」 */
  benchName: string;
  /** 浮动盈亏（元） */
  floating: number;
  /** 已实现盈亏（元，已扣费用） */
  realized: number;
  /** 今日盈亏合计（元） */
  total: number;
  /** 跑赢基准（百分点） */
  vsBenchPct: number;
}

/** 仓位卡 */
export interface PositionCard {
  /** 目标仓位区间（%） */
  band: [number, number];
  /** 当前仓位（%）：证券市值 / 总资产 */
  pct: number;
  /** 证券市值（元） */
  stockValue: number;
  /** 总资产（元，分母） */
  totalAssets: number;
}

/** 持仓 TOP 行 */
export interface HoldingTopItem {
  code: string;
  name: string;
  /** 占总资产比例（%） */
  pct: number;
}

/** 净值点：账户收盘市值 + 对比基准点位 */
export interface NavPoint {
  benchmark: number;
  date: string;
  nav: number;
}

/** 行业分布切片 */
export interface IndustrySlice {
  name: string;
  /** 占证券市值比例（%） */
  pct: number;
}

/** 行业分布卡 */
export interface IndustryCardData {
  items: IndustrySlice[];
  /** 口径说明（分母、覆盖范围） */
  note: string;
  /** 覆盖行业个数 */
  totalCount: number;
}

/** 待办标签语气 */
export type TodoTone = 'danger' | 'warning';

/** 今日待办行 */
export interface DashboardTodoItem {
  /** 右侧动作文案（无动作时留空，展示标签） */
  action?: string;
  detail: string;
  icon: string;
  id: string;
  tag?: { text: string; tone: TodoTone };
  title: string;
}

/** 市场热度卡 */
export interface MarketHeatData {
  downCount: number;
  flatCount: number;
  /** 近 5 日均成交额（亿元） */
  ma5Yi: number;
  /** 两市成交额（亿元） */
  turnoverYi: number;
  upCount: number;
  /** 上涨占比（0~1） */
  upRatio: number;
  /** 较 5 日均量变化（%） */
  vsMa5Pct: number;
}

/** 自定义看板聚合数据（GET /dashboard/custom-dashboard） */
export interface CustomDashboard {
  /** 卡片目录（顺序 + 分区 + 口径说明） */
  cards: DashboardCardMeta[];
  industry: IndustryCardData;
  marketHeat: MarketHeatData;
  navTrend: Record<NavRange, NavPoint[]>;
  /** 行情时间 HH:mm（A 股 15:00 收盘） */
  quoteTime: string;
  position: PositionCard;
  todos: DashboardTodoItem[];
  todayPnl: TodayPnlCard;
  topHoldings: HoldingTopItem[];
  totalAssets: TotalAssetsCard;
  /** 交易日 YYYY-MM-DD */
  tradeDate: string;
  /** 账户快照时间 HH:mm */
  updatedAt: string;
}

// #endregion

// #region 视图模型

/** 迷你卡视图模型（四类小卡共用一个组件，用 key 分流） */
export interface MiniCardVm {
  /** 今日盈亏：浮动 / 已实现拆解 */
  breakdown?: string;
  /** 补充说明（跑赢基准等） */
  extra?: { label: string; text: string; tone: 'down' | 'flat' | 'up' };
  /** 仓位卡仪表盘 */
  gauge?: {
    bandText: string;
    inBand: boolean;
    pct: number;
  };
  key: DashboardCardKey;
  label: string;
  /** 副说明（持仓数、口径等） */
  note?: string;
  /** 持仓 TOP 清单 */
  rows?: Array<{ name: string; text: string }>;
  /** 总资产卡迷你走势（元） */
  spark?: number[];
  tone: 'down' | 'flat' | 'up';
  /** 主数值（整数部分 + 千分位） */
  value: string;
  /** 主数值小数部分（小字展示） */
  valueDecimal?: string;
}

/** 净值图视图模型（窗口起点归一化为 100，账户与基准可比） */
export interface NavChartVm {
  benchReturnPct: number;
  /** 窗口末点日期 MM-DD */
  endLabel: string;
  navReturnPct: number;
  points: Array<{ bench: number; label: string; nav: number }>;
  /** 窗口起点日期 MM-DD */
  startLabel: string;
}

/** 行业图例项 */
export interface IndustryLegendVm {
  color: string;
  name: string;
  pct: number;
}

// #endregion
