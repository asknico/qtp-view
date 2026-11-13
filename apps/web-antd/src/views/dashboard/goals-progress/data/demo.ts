import type { GoalsOverview } from './types';

/**
 * 目标与进度（1.4）演示数据
 * ---------------------------------------------------------------------------
 * 数值取自 UI 设计稿《04_1.4目标与进度.html》，并与市场概览页对齐：
 * tradeDate = 2026-10-28（与市场概览同一交易日，页间数据可互相印证）。
 */

/** 演示数据工厂：每次调用返回新对象，便于将来替换为接口响应 */
export function demoGoalsOverview(): GoalsOverview {
  return {
    monthDonePct: 1.8,
    monthLabel: '10月',
    monthTargetPct: 2,
    monthTradeCount: 4,
    monthTradeLimit: 10,
    milestones: [
      {
        condition: '月度收益 > 0 且回撤 < 5%',
        date: '2026-06-30',
        status: 'done',
        title: '连续 6 个月正收益',
      },
      {
        condition: '超额收益 ≥ 5%',
        date: '2026-09-30',
        status: 'done',
        title: '单季度跑赢沪深300 超 5%',
      },
      {
        condition: '含分红、扣费用后',
        date: '2026-12-31',
        progressPct: 82.7,
        status: 'in_progress',
        title: '年度收益 ≥ 15%',
      },
      {
        condition: '当前 -8.4%',
        date: '2026-12-31',
        status: 'in_progress',
        title: '全年最大回撤 < 12%',
      },
      {
        condition: '净值 > 1.2864',
        date: '2027-03-31',
        status: 'pending',
        title: '累计净值创新高',
      },
    ],
    positionCurPct: 68.3,
    positionRange: [60, 75],
    remainingDrawdownPct: -6.8,
    singleStockLimitPct: 20,
    singleStockTop: { name: '贵州茅台', pct: 12.4 },
    tradeDate: '2026-10-28',
    updatedAt: '16:10',
    yearDonePct: 12.4,
    yearTargetPct: 15,
  };
}
