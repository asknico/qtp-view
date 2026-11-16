import type {
  CustomDashboard,
  DashboardCardKey,
  DashboardCardMeta,
  DashboardCardZone,
  DashboardLayout,
  IndustryCardData,
  IndustryLegendVm,
  MarketHeatData,
  MiniCardVm,
  NavChartVm,
  NavRange,
} from './types';

import {
  formatSigned,
  formatThousand,
  formatTurnover,
  splitAmount,
} from './format';

/** 净值窗口内归一化基准点（窗口起点 = 100） */
const NORM_BASE = 100;

/** 顶部四小卡：总资产 / 今日盈亏 / 仓位 / 持仓 TOP */
export function miniCardsOf(data: CustomDashboard): MiniCardVm[] {
  const { totalAssets, todayPnl, position, topHoldings } = data;
  const assets = splitAmount(totalAssets.value);
  const pnl = splitAmount(todayPnl.total);
  const [bandLow, bandHigh] = position.band;
  const positionText = position.pct.toFixed(1);
  const inBand = position.pct >= bandLow && position.pct <= bandHigh;

  return [
    {
      key: 'totalAssets',
      label: '总资产',
      note: `${formatSigned(totalAssets.dayChange)}（${formatSigned(totalAssets.dayChangePct, 2, true)}）`,
      spark: totalAssets.spark,
      tone: totalAssets.dayChange >= 0 ? 'up' : 'down',
      value: assets.int,
      valueDecimal: assets.dec,
    },
    {
      breakdown: `浮动 ${formatSigned(todayPnl.floating)} · 已实现 ${formatSigned(todayPnl.realized)}`,
      extra: {
        label: `跑赢${todayPnl.benchName}`,
        text: formatSigned(todayPnl.vsBenchPct, 2, true),
        tone: todayPnl.vsBenchPct >= 0 ? 'up' : 'down',
      },
      key: 'todayPnl',
      label: '今日盈亏',
      tone: todayPnl.total >= 0 ? 'up' : 'down',
      value: `${pnl.int}${pnl.dec === '00' ? '' : `.${pnl.dec}`}`,
    },
    {
      gauge: {
        bandText: `目标 ${bandLow}–${bandHigh}%`,
        inBand,
        pct: Number(positionText),
      },
      key: 'position',
      label: '仓位',
      note: inBand ? '区间内' : '偏离目标区间',
      tone: inBand ? 'flat' : 'down',
      value: `${positionText}%`,
    },
    {
      key: 'topHoldings',
      label: '持仓 TOP',
      rows: topHoldings.map((item) => ({
        name: item.name,
        text: `${item.pct.toFixed(1)}%`,
      })),
      tone: 'flat',
      value: '',
    },
  ];
}

/** 净值图：窗口起点归一化为 100，账户与基准同轴可比 */
export function navChartOf(data: CustomDashboard, range: NavRange): NavChartVm {
  const series = data.navTrend[range];
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) {
    return {
      benchReturnPct: 0,
      endLabel: '',
      navReturnPct: 0,
      points: [],
      startLabel: '',
    };
  }
  const navBase = first.nav === 0 ? 1 : first.nav;
  const benchBase = first.benchmark === 0 ? 1 : first.benchmark;
  const points = series.map((point) => ({
    bench: Math.round((point.benchmark / benchBase) * NORM_BASE * 100) / 100,
    label: point.date.slice(5).replace('-', '/'),
    nav: Math.round((point.nav / navBase) * NORM_BASE * 100) / 100,
  }));

  return {
    benchReturnPct: (last.benchmark / benchBase - 1) * 100,
    endLabel: last.date.slice(5),
    navReturnPct: (last.nav / navBase - 1) * 100,
    points,
    startLabel: first.date.slice(5),
  };
}

/** 行业分布图例（颜色由调用方按主题传入，保证与环图同色） */
export function industryLegendOf(
  data: IndustryCardData,
  colors: string[],
): IndustryLegendVm[] {
  return data.items.map((item, i) => ({
    color: colors[i % colors.length] ?? colors[0] ?? '#999999',
    name: item.name,
    pct: item.pct,
  }));
}

/** 市场热度文案：21,400 亿 → 2.14 万亿；19,705 亿 → 19,705 亿 */
export function marketHeatTextOf(heat: MarketHeatData) {
  const { turnoverYi, ma5Yi, vsMa5Pct, upRatio } = heat;
  return {
    ma5Text: `5 日均量 ${formatTurnover(ma5Yi)}`,
    turnoverText: formatTurnover(turnoverYi),
    upRatioText: `${(upRatio * 100).toFixed(1)}%`,
    vsMa5PctText: formatSigned(vsMa5Pct, 1, true),
  };
}

/** 默认布局：目录顺序全开、两列标准（与设计稿渲染结果一致） */
export function defaultLayoutOf(data: CustomDashboard): DashboardLayout {
  const visible = {} as Record<DashboardCardKey, boolean>;
  for (const card of data.cards) visible[card.key] = true;
  return {
    columns: 2,
    order: data.cards.map((card) => card.key),
    visible,
  };
}

/** 某分区内「可见且按 order 排序」的卡片 */
export function visibleCardsOf(
  data: CustomDashboard,
  layout: DashboardLayout,
  zone: DashboardCardZone,
): DashboardCardMeta[] {
  const metaOf = new Map(data.cards.map((card) => [card.key, card]));
  return layout.order
    .map((key) => metaOf.get(key))
    .filter(
      (card): card is DashboardCardMeta =>
        !!card && card.zone === zone && layout.visible[card.key] !== false,
    );
}

/** 卡片所属分区（拖拽跨区时用于拒绝） */
export function zoneOf(
  data: CustomDashboard,
  key: DashboardCardKey,
): DashboardCardZone | undefined {
  return data.cards.find((card) => card.key === key)?.zone;
}

/** 按 key 取小卡视图模型，供栅格内的卡片取数 */
export function miniCardByKeyOf(data: CustomDashboard) {
  const list = miniCardsOf(data);
  const map = new Map(list.map((item) => [item.key, item]));
  return (key: DashboardCardKey) => map.get(key);
}

/** 千分位（模板里偶尔直接用到） */
export { formatThousand };
