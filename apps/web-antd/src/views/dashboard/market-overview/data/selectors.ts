import type {
  HeatDimension,
  HeatTileVm,
  IndexCardVm,
  MarketOverview,
  VolumeBarVm,
} from './types';

import { formatYi, idxValue, signed, signedPct, toneClass } from './format';

/**
 * 市场概览（1.3）视图模型派生
 * ---------------------------------------------------------------------------
 * DTO → 展示模型的唯一入口：组件只管画，页面只管排版，
 * 所有「占比计算 / 柱高归一 / 文案拼装」集中在此，方便单测与接口切换。
 */

/** 指数行情条：6 张卡 */
export function buildIndexCards(data: MarketOverview): IndexCardVm[] {
  return data.indices.map((idx) => ({
    changeDisplay: signed(idx.change),
    code: idx.code,
    dir: toneClass(idx.changePct),
    name: idx.name,
    pctDisplay: signedPct(idx.changePct),
    spark: idx.spark,
    turnoverDisplay: `成交额 ${formatYi(idx.turnoverYi, 0)}`,
    valueDisplay: idxValue(idx.value),
  }));
}

/** 热力树图格子（按维度取数；面积 = 成交额，颜色 = 涨跌幅，由组件着色） */
export function heatTilesOf(
  data: MarketOverview,
  dimension: HeatDimension,
): HeatTileVm[] {
  return data.heatmaps[dimension].map((sector) => ({
    changePct: sector.changePct,
    name: sector.name,
    pctDisplay: signedPct(sector.changePct, 2),
    turnoverDisplay: formatYi(sector.turnoverYi, 0),
    turnoverYi: sector.turnoverYi,
  }));
}

/** 上涨占比（%）：由家数反推，保证与 kv 列表同源 */
export function upSharePctOf(data: MarketOverview): number {
  const { downCount, flatCount, upCount } = data.breadth;
  const total = upCount + downCount + flatCount;
  return total > 0 ? (upCount / total) * 100 : 0;
}

/** 量能柱：按 5 日最大值归一柱高 */
export function volumeBarsOf(data: MarketOverview): VolumeBarVm[] {
  const bars = data.breadth.volume5d;
  const max = Math.max(...bars.map((b) => b.turnoverYi), 1);
  return bars.map((bar, i) => ({
    date: bar.date,
    heightPct: (bar.turnoverYi / max) * 100,
    isToday: i === bars.length - 1,
    turnoverDisplay: formatYi(bar.turnoverYi, 0),
  }));
}

/** 两市成交额较 5 日均量（%）：由 volume5d 反推，与柱图同源 */
export function turnoverVs5dPctOf(data: MarketOverview): number {
  const bars = data.breadth.volume5d;
  if (bars.length < 2) return 0;
  const prev = bars.slice(0, -1);
  const today = bars[bars.length - 1];
  if (!today) return 0;
  const avg = prev.reduce((sum, b) => sum + b.turnoverYi, 0) / prev.length;
  return avg > 0 ? (today.turnoverYi / avg - 1) * 100 : 0;
}

/** 页头副标题 */
export function subtitleOf(data: MarketOverview): string {
  return `${data.tradeDate} 收盘 · 行情 ${data.quoteTime} · 数据同步 ${data.updatedAt}`;
}
