/**
 * 目标与进度（1.4）数据结构
 * ---------------------------------------------------------------------------
 * 上半部分是「接口契约」：字段与后端 DTO 一一对应，接入时保持结构不变即可。
 * 下半部分是「视图模型」：仅前端渲染使用，由 data/selectors.ts 从契约派生。
 *
 * 分层约定（与资产总览 / 今日速览 / 市场概览一致）：
 *   api/goals-progress.ts  → 只负责取数（演示数据 / 真实接口）
 *   data/selectors.ts      → 只负责 DTO → 视图模型
 *   components/*.vue       → 只负责渲染，不关心数据来源
 * 因此后期切接口时只改 api 层的 USE_DEMO 开关，组件与页面零改动。
 */

// #region 接口契约

/** 目标与进度聚合数据（GET /dashboard/goals-progress） */
export interface GoalsOverview {
  /** 交易日 YYYY-MM-DD */
  tradeDate: string;
  /** 数据同步时间 HH:mm */
  updatedAt: string;
  /** 年度收益目标（%，如 15 表示 +15%） */
  yearTargetPct: number;
  /** 年度已完成收益（%，如 12.4 表示 +12.40%） */
  yearDonePct: number;
  /** 剩余可承受回撤（%，负数） */
  remainingDrawdownPct: number;
  /** 月度目标所属月份（展示文案，如「10月」） */
  monthLabel: string;
  /** 月度收益目标（%） */
  monthTargetPct: number;
  /** 月度已完成收益（%） */
  monthDonePct: number;
  /** 仓位目标区间 [下限, 上限]（%） */
  positionRange: [number, number];
  /** 当前总仓位（%） */
  positionCurPct: number;
  /** 单票最大仓位上限（%） */
  singleStockLimitPct: number;
  /** 当前最大单票持仓 */
  singleStockTop: {
    name: string;
    pct: number;
  };
  /** 本月交易笔数上限 */
  monthTradeLimit: number;
  /** 本月已完成交易笔数 */
  monthTradeCount: number;
  /** 里程碑记录（按时间正序） */
  milestones: Milestone[];
}

/** 里程碑状态 */
export type MilestoneStatus = 'done' | 'in_progress' | 'pending';

/** 里程碑条目 */
export interface Milestone {
  /** 目标日期 YYYY-MM-DD */
  date: string;
  /** 里程碑标题 */
  title: string;
  /** 达成条件说明 */
  condition: string;
  status: MilestoneStatus;
  /** 进行中的完成度（%），仅 in_progress 时有值 */
  progressPct?: number;
}

/** 查询参数：预留日期维度 */
export interface GoalsQuery {
  /** 交易日 YYYY-MM-DD，缺省为最新交易日 */
  date?: string;
}

// #endregion

// #region 视图模型（仅前端渲染使用）

/** KPI 卡展示模型 */
export interface GoalKpiVm {
  key: string;
  label: string;
  /** 主值展示（含区间/上限等，如「60–75」「≤10」） */
  value: string;
  /** 主值后缀（小号字，如「%」「笔/月」） */
  suffix?: string;
  /** 首卡强调底色 */
  accent?: boolean;
  /** 副行强调段文案（涨色） */
  deltaUp?: string;
  /** 副行说明段文案（灰色） */
  note?: string;
}

/** 目标进度条展示模型 */
export interface TargetBarVm {
  key: string;
  label: string;
  /** 右侧数值展示（如「+12.40% / 15.00%」） */
  valueDisplay: string;
  /** 条宽 0~100 */
  widthPct: number;
  /** 色调：up=红（收益进度） act=蓝（仓位区间） down=绿（限制类安全） */
  tone: 'act' | 'down' | 'up';
  /** 超限：标红并提示 */
  overLimit?: boolean;
}

/** 里程碑行展示模型 */
export interface MilestoneRowVm {
  date: string;
  title: string;
  condition: string;
  tagText: string;
  /** tag 色调类：is-done / is-progress / is-pending */
  tagClass: string;
}

// #endregion
