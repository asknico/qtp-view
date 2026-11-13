import type {
  GoalKpiVm,
  GoalsOverview,
  MilestoneRowVm,
  TargetBarVm,
} from './types';

/**
 * 目标与进度（1.4）视图模型派生
 * ---------------------------------------------------------------------------
 * DTO → 展示模型的唯一入口：组件只管画，页面只管排版，
 * 所有「达成率 / 条宽 / 超限判定 / 文案拼装」集中在此，方便单测与接口切换。
 */

const signedPct = (v: number, digits = 2): string => {
  const fixed = v.toFixed(digits);
  return v > 0 ? `+${fixed}%` : `${fixed}%`;
};

/** 年度目标达成率（%）：已完成 / 目标，0 目标兜底 */
export function yearRatePctOf(data: GoalsOverview): number {
  return data.yearTargetPct > 0
    ? Math.min((data.yearDonePct / data.yearTargetPct) * 100, 100)
    : 0;
}

/** 月度目标达成率（%） */
function monthRatePctOf(data: GoalsOverview): number {
  return data.monthTargetPct > 0
    ? Math.min((data.monthDonePct / data.monthTargetPct) * 100, 100)
    : 0;
}

/** KPI 四卡：年度 / 月度 / 仓位区间 / 交易频率 */
export function goalKpisOf(data: GoalsOverview): GoalKpiVm[] {
  const inRange =
    data.positionCurPct >= data.positionRange[0] &&
    data.positionCurPct <= data.positionRange[1];

  return [
    {
      accent: true,
      deltaUp: `已完成 ${signedPct(data.yearDonePct)}`,
      key: 'year',
      label: '年度收益目标',
      note: `达成率 ${yearRatePctOf(data).toFixed(1)}%`,
      suffix: '%',
      value: data.yearTargetPct.toFixed(1),
    },
    {
      deltaUp: signedPct(data.monthDonePct),
      key: 'month',
      label: '月度收益目标',
      note: `还差 ${(data.monthTargetPct - data.monthDonePct).toFixed(2)}%`,
      suffix: '%',
      value: data.monthTargetPct.toFixed(1),
    },
    {
      key: 'position',
      label: '仓位目标区间',
      note: `当前 ${data.positionCurPct}% · ${inRange ? '处于区间内' : '已偏离区间'}`,
      suffix: '%',
      value: `${data.positionRange[0]}–${data.positionRange[1]}`,
    },
    {
      key: 'frequency',
      label: '交易频率目标',
      note: `本月 ${data.monthTradeCount} 笔 · 剩余 ${Math.max(
        data.monthTradeLimit - data.monthTradeCount,
        0,
      )} 笔`,
      suffix: `笔/月`,
      value: `≤${data.monthTradeLimit}`,
    },
  ];
}

/** 多目标进度条（收益类红色、区间类蓝色、限制类绿色，超限标红） */
export function targetBarsOf(data: GoalsOverview): TargetBarVm[] {
  const posRangeWidth =
    ((data.positionCurPct - data.positionRange[0]) /
      Math.max(data.positionRange[1] - data.positionRange[0], 1)) *
    100;
  const posInRange =
    data.positionCurPct >= data.positionRange[0] &&
    data.positionCurPct <= data.positionRange[1];
  const singleOver = data.singleStockTop.pct > data.singleStockLimitPct;
  const tradeOver = data.monthTradeCount > data.monthTradeLimit;

  return [
    {
      key: 'year',
      label: '年度收益目标',
      tone: 'up',
      valueDisplay: `${signedPct(data.yearDonePct)} / ${data.yearTargetPct.toFixed(2)}%`,
      widthPct: yearRatePctOf(data),
    },
    {
      key: 'month',
      label: `月度收益目标（${data.monthLabel}）`,
      tone: 'up',
      valueDisplay: `${signedPct(data.monthDonePct)} / ${data.monthTargetPct.toFixed(2)}%`,
      widthPct: monthRatePctOf(data),
    },
    {
      key: 'position',
      label: `总仓位（区间 ${data.positionRange[0]}–${data.positionRange[1]}%）`,
      overLimit: !posInRange,
      tone: 'act',
      valueDisplay: `${data.positionCurPct}%`,
      widthPct: Math.min(Math.max(posRangeWidth, 0), 100),
    },
    {
      key: 'single',
      label: `单票最大仓位（上限 ${data.singleStockLimitPct}%）`,
      overLimit: singleOver,
      tone: singleOver ? 'up' : 'down',
      valueDisplay: `${data.singleStockTop.name} ${data.singleStockTop.pct}%`,
      widthPct: Math.min(
        (data.singleStockTop.pct / data.singleStockLimitPct) * 100,
        100,
      ),
    },
    {
      key: 'frequency',
      label: `本月交易笔数（上限 ${data.monthTradeLimit}）`,
      overLimit: tradeOver,
      tone: tradeOver ? 'up' : 'down',
      valueDisplay: `${data.monthTradeCount} 笔`,
      widthPct: Math.min(
        (data.monthTradeCount / data.monthTradeLimit) * 100,
        100,
      ),
    },
  ];
}

/** 硬性约束是否全部达标（仓位区间内 + 单票/笔数未超限） */
export function allOnTrackOf(data: GoalsOverview): boolean {
  return targetBarsOf(data).every((bar) => !bar.overLimit);
}

/** 里程碑表格行 */
export function milestoneRowsOf(data: GoalsOverview): MilestoneRowVm[] {
  return data.milestones.map((ms) => {
    const tagMap: Record<string, { tagClass: string; tagText: string }> = {
      done: { tagClass: 'is-done', tagText: '已达成' },
      in_progress: {
        tagClass: 'is-progress',
        tagText:
          ms.progressPct === undefined ? '进行中' : `进行中 ${ms.progressPct}%`,
      },
      pending: { tagClass: 'is-pending', tagText: '未开始' },
    };
    const fallback = { tagClass: 'is-pending', tagText: '未开始' };
    const tag = tagMap[ms.status] ?? fallback;
    return {
      condition: ms.condition,
      date: ms.date,
      tagClass: tag.tagClass,
      tagText: tag.tagText,
      title: ms.title,
    };
  });
}

/** 达成统计（已达成 / 全部） */
export function milestoneStatsOf(data: GoalsOverview): string {
  const done = data.milestones.filter((m) => m.status === 'done').length;
  return `${done}/${data.milestones.length}`;
}

/** 年度仪表盘卡片下方的三个数值展示 */
export function yearGaugeDisplaysOf(data: GoalsOverview): {
  doneDisplay: string;
  drawdownDisplay: string;
  targetDisplay: string;
} {
  return {
    doneDisplay: signedPct(data.yearDonePct),
    drawdownDisplay: `${data.remainingDrawdownPct}%`,
    targetDisplay: `+${data.yearTargetPct.toFixed(1)}%`,
  };
}

/** 页头副标题 */
export function subtitleOf(data: GoalsOverview): string {
  return `${data.tradeDate} 收盘 · 数据同步 ${data.updatedAt}`;
}
