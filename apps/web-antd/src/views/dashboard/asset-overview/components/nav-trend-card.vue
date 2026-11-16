<script lang="ts" setup>
import type { EChartsOption } from 'echarts';

import type { EchartsUIType } from '@vben/plugins/echarts';

import type { NavMode, NavRange } from '../data/types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getStockColor } from '#/constants/stock-theme';

import {
  flowMarks,
  formatSigned,
  getNavSeries,
  getNavStats,
  maxDrawdownStat,
} from '../data/demo';

defineOptions({ name: 'NavTrendCard' });

const RANGE_OPTIONS: Array<{ label: string; value: NavRange }> = [
  { label: '近1月', value: '1m' },
  { label: '近3月', value: '3m' },
  { label: '近1年', value: '1y' },
  { label: '全部', value: 'all' },
];

const MODE_OPTIONS: Array<{ label: string; value: NavMode }> = [
  { label: 'TWR', value: 'twr' },
  { label: 'XIRR', value: 'xirr' },
  { label: '简单', value: 'simple' },
];

const range = ref<NavRange>('1y');
const mode = ref<NavMode>('twr');

const { isDark } = usePreferences();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const series = computed(() => getNavSeries(range.value, mode.value));
const stats = computed(() => getNavStats(range.value));

const dateRangeLabel = computed(() => {
  const s = series.value;
  const first = s[0];
  const last = s[s.length - 1];
  if (!first || !last) return '';
  return `${first.date} ~ ${last.date} · 日频`;
});

/** 坐标轴/分隔线颜色随主题 */
const axisColor = computed(() =>
  isDark.value ? 'hsl(240 5% 45%)' : '#8d97a8',
);
const splitColor = computed(() =>
  isDark.value ? 'hsl(240 5% 20%)' : '#eef1f7',
);

function buildOption(): EChartsOption {
  const stock = getStockColor(isDark.value);
  const primary = isDark.value ? '#3991EF' : '#116FD4';
  const data = series.value;
  const base = data[0];
  if (!base) return {};

  /**
   * X 轴为 category，类目名统一为 MM/DD。
   * 注意：series.data 只能给纯数值，不能给 [date, value] 数组对——
   * category 轴会把数组首元素当类目名去匹配，'2026-04-01' 匹配不到 '04/01'，
   * 该点会被直接丢弃（轴能画出来但折线空白）。
   */
  const axisLabels = data.map((p) => p.date.slice(5).replace('-', '/'));

  /** 万元格式化：1052300 → '105.2万' */
  const wan = (v: number) => `${(v / 10_000).toFixed(1).replace(/\.0$/, '')}万`;

  /** 区间最大回撤（滚动峰值口径，与 maxDrawdownStat 一致）：标注随区间动态重算 */
  let runPeakIdx = 0;
  let worstPct = 0;
  let peakIdx = 0;
  let troughIdx = 0;
  data.forEach((p, i) => {
    if (p.nav > (data[runPeakIdx]?.nav ?? 0)) runPeakIdx = i;
    const runPeakNav = data[runPeakIdx]?.nav ?? 0;
    const dd = runPeakNav > 0 ? (runPeakNav - p.nav) / runPeakNav : 0;
    if (dd > worstPct) {
      worstPct = dd;
      peakIdx = runPeakIdx;
      troughIdx = i;
    }
  });
  const peakNav = data[peakIdx]?.nav ?? 0;
  const troughNav = data[troughIdx]?.nav ?? 0;
  const lastNav = data[data.length - 1]?.nav ?? 0;
  const peakLabel = axisLabels[peakIdx] ?? '';
  const troughLabel = axisLabels[troughIdx] ?? '';
  const lastLabel = axisLabels[data.length - 1] ?? '';
  const drawdownPct = worstPct * 100;
  const dangerColor = 'hsl(0 72% 51%)';

  /** 引线抬升高度：按区间净值跨度自适应，保证文字离开曲线主体 */
  const navMax = Math.max(...data.map((p) => p.nav));
  const navMin = Math.min(...data.map((p) => p.nav));
  const lift = (navMax - navMin) * 0.14;

  /** 回撤标注（峰值/谷底差距太小则不展示，避免近1月等窄区间出现无意义的色带） */
  const showBand = drawdownPct >= 2;

  /** 入金/出金菱形标记（文字改由 markLine 引线承载） */
  const flowPoints = data
    .map((p, i) => ({ i, p }))
    .filter(({ p }) => p.flow !== 0)
    .map(({ i, p }) => ({
      itemStyle: { color: p.flow > 0 ? '#E0A13B' : stock.flat },
      symbolSize: 9,
      value: [i, p.nav],
    }));

  /**
   * 引线标注：文字抬升到数据点上方，细线 + 箭头指回数据点。
   * ECharts 6 的两点式 markLine 只支持端点元组格式 [fromPoint, toPoint]，
   * 线自身的 label/lineStyle 由端点配置合并而来（to 端优先）。
   * from = 文字锚点（上方），to = 数据点（箭头端）。
   */
  type CalloutPair = [
    { coord: [string, number] },
    {
      coord: [string, number];
      label: {
        align?: 'center' | 'left' | 'right';
        color: string;
        distance: number;
        fontSize: number;
        fontWeight: number;
        formatter: string;
        position: 'start';
      };
      lineStyle: { color: string; width: number };
    },
  ];
  /**
   * dir='up'：文字在数据点上方（默认）；dir='down'：文字在数据点下方。
   * align 控制文字相对锚点的水平展开方向，避免靠边文字被裁剪。
   */
  const callout = (
    x: string,
    y: number,
    text: string,
    color: string,
    opts: {
      align?: 'center' | 'left' | 'right';
      dir?: 'down' | 'up';
      mul?: number;
    } = {},
  ): CalloutPair => [
    { coord: [x, y + lift * (opts.mul ?? 1) * (opts.dir === 'down' ? -1 : 1)] },
    {
      coord: [x, y],
      label: {
        align: opts.align,
        color,
        distance: 3,
        fontSize: 11,
        fontWeight: 600,
        formatter: text,
        position: 'start',
      },
      lineStyle: { color, width: 1 },
    },
  ];

  const callouts = [
    ...(showBand
      ? [
          callout(
            peakLabel,
            peakNav,
            `峰值 ${wan(peakNav)}（${peakLabel}）`,
            primary,
            {
              align: 'left',
            },
          ),
          callout(
            troughLabel,
            troughNav,
            `谷底 ${wan(troughNav)}（${troughLabel}）· 回撤 -${drawdownPct.toFixed(1)}%`,
            dangerColor,
            { align: 'left', dir: 'down', mul: 1.5 },
          ),
        ]
      : []),
    ...data
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => p.flow !== 0)
      .map(({ i, p }) =>
        callout(
          axisLabels[i] ?? '',
          p.nav,
          `${p.flow > 0 ? '入金' : '出金'} ${wan(Math.abs(p.flow))}`,
          p.flow > 0 ? '#E0A13B' : axisColor.value,
          { mul: 1.2 },
        ),
      ),
  ];

  /** 峰值 / 谷底 / 终点市值标记点（峰值/谷底只留色点，文字由引线标注承载） */
  const pointMarks = [
    ...(showBand
      ? [
          {
            coord: [peakLabel, peakNav],
            itemStyle: { color: primary },
            name: '区间峰值',
            symbol: 'circle' as const,
            symbolSize: 7,
          },
          {
            coord: [troughLabel, troughNav],
            itemStyle: { color: dangerColor },
            name: '区间谷底',
            symbol: 'circle' as const,
            symbolSize: 7,
          },
        ]
      : []),
    {
      coord: [lastLabel, lastNav],
      itemStyle: { color: primary },
      name: '终点市值',
      label: {
        align: 'right' as const,
        color: primary,
        distance: 6,
        fontSize: 12,
        fontWeight: 700,
        formatter: wan(lastNav),
        offset: [-4, 0],
        position: 'bottom' as const,
      },
      symbol: 'circle' as const,
      symbolSize: 6,
    },
  ];

  return {
    axisPointer: {
      lineStyle: { color: axisColor.value },
    },
    grid: { bottom: 22, containLabel: true, left: 8, right: 8, top: 16 },
    legend: {
      data: ['账户净值', '沪深300'],
      icon: 'roundRect',
      itemHeight: 3,
      itemWidth: 14,
      right: 8,
      textStyle: { color: axisColor.value, fontSize: 11 },
      top: 0,
    },
    series: [
      {
        areaStyle: {
          color: {
            colorStops: [
              { color: `${primary}2E`, offset: 0 },
              { color: `${primary}05`, offset: 1 },
            ],
            global: false,
            type: 'linear',
            x: 0,
            x2: 0,
            y: 0,
            y2: 1,
          },
        },
        data: data.map((p) => p.nav),
        itemStyle: { color: primary },
        lineStyle: { width: 2 },
        markArea: showBand
          ? {
              data: [
                [
                  {
                    itemStyle: {
                      borderColor: 'hsl(0 84% 60% / 40%)',
                      borderType: 'dashed' as const,
                      borderWidth: 1,
                      color: 'hsl(0 84% 60% / 8%)',
                    },
                    xAxis: peakLabel,
                  },
                  { xAxis: troughLabel },
                ],
              ],
              silent: true,
            }
          : undefined,
        markLine: {
          data: callouts,
          label: { fontSize: 11 },
          lineStyle: { width: 1 },
          silent: true,
          symbol: ['none', 'arrow'],
          symbolSize: 5,
        },
        markPoint: { data: pointMarks, silent: true },
        name: '账户净值',
        showSymbol: false,
        smooth: 0.25,
        type: 'line',
      },
      {
        data: data.map((p) => p.benchmark * (base.nav / base.benchmark)),
        itemStyle: { color: stock.flat },
        lineStyle: { type: 'dashed', width: 1 },
        name: '沪深300',
        showSymbol: false,
        smooth: 0.25,
        type: 'line',
      },
      {
        data: flowPoints,
        name: '出入金',
        symbol: 'diamond',
        tooltip: {
          formatter: (p) => {
            const raw = Array.isArray(p.value) ? p.value[1] : p.value;
            const mark =
              Number(raw) > 0 ? flowMarks.deposit : flowMarks.withdraw;
            return mark.label;
          },
        },
        type: 'scatter',
        z: 5,
      },
    ],
    tooltip: {
      backgroundColor: isDark.value ? '#1C1C1F' : '#FFFFFF',
      borderColor: splitColor.value,
      textStyle: { color: isDark.value ? '#E4E4E7' : '#1A2130', fontSize: 11 },
      trigger: 'axis',
      valueFormatter: (v) => {
        const n = Array.isArray(v) ? Number(v[1]) : Number(v);
        return Number.isFinite(n)
          ? `${n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 元`
          : '';
      },
    },
    xAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisColor.value, fontSize: 10 },
      boundaryGap: false,
      data: axisLabels,
      splitLine: { show: false },
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        color: axisColor.value,
        fontSize: 10,
        formatter: (v: number) => `${(v / 10_000).toFixed(0)}万`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      scale: true,
      // 上方留引线文字空间；仅当显示谷底标注时下方也留出（否则白占高度）
      max: (extent: { max: number }) =>
        Math.ceil((extent.max + lift) / 50_000) * 50_000,
      min: showBand
        ? (extent: { min: number }) =>
            Math.floor((extent.min - lift * 2.2) / 50_000) * 50_000
        : undefined,
      splitLine: { lineStyle: { color: splitColor.value }, show: true },
      type: 'value',
    },
  };
}

async function render() {
  await renderEcharts(buildOption());
}

watch([range, mode, isDark], () => render(), { immediate: false });

/** 首次渲染 */
onMounted(() => render());
</script>

<template>
  <div class="nav-card">
    <div class="nav-card__toolbar">
      <div class="seg-group">
        <span
          v-for="opt in RANGE_OPTIONS"
          :key="opt.value"
          class="seg"
          :class="{ 'seg--on': range === opt.value }"
          @click="range = opt.value"
        >
          {{ opt.label }}
        </span>
      </div>
      <div class="seg-group">
        <span
          v-for="opt in MODE_OPTIONS"
          :key="opt.value"
          class="seg"
          :class="{ 'seg--on': mode === opt.value }"
          @click="mode = opt.value"
        >
          {{ opt.label }}
        </span>
      </div>
    </div>
    <div class="nav-card__legend">
      <span class="nav-card__range">{{ dateRangeLabel }}</span>
      <span class="pill pill--down">最大回撤 {{ formatSigned(-maxDrawdownStat.pct, 1, true) }}</span>
      <span class="pill pill--warn"><i class="dot dot--flow"></i>{{ flowMarks.deposit.label }}</span>
      <span class="pill pill--flat"><i class="dot dot--flat"></i>{{ flowMarks.withdraw.label }}</span>
    </div>
    <div class="nav-card__chart">
      <EchartsUI ref="chartRef" height="100%" width="100%" />
    </div>
    <div class="nav-card__footer">
      <span>区间收益
        <b class="is-up">{{
          formatSigned(stats.rangeReturn, 2, true)
        }}</b></span>
      <span>TWR <b>{{ formatSigned(stats.twr, 2, true) }}</b></span>
      <span>XIRR <b>{{ formatSigned(stats.xirr, 2, true) }}</b></span>
      <span class="nav-card__note">出入金已剔除 · 基准：沪深300 · 演示数据</span>
    </div>
  </div>
</template>

<style scoped>
.nav-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.nav-card__toolbar {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.seg-group {
  display: flex;
  padding: 2.5px;
  background: hsl(var(--muted) / 55%);
  border: 1px solid hsl(var(--border) / 50%);
  border-radius: 8px;
}

.seg {
  padding: 2px 9px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  user-select: none;
  border-radius: 6px;
  transition:
    color 0.15s,
    background 0.15s;
}

.seg:hover {
  color: hsl(var(--foreground));
}

.seg--on {
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  box-shadow: 0 1px 3px rgb(16 24 40 / 12%);
}

.nav-card__legend {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.nav-card__range {
  margin-right: auto;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.pill {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 19px;
  padding: 0 7px;
  font-size: 10.5px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 10px;
}

.pill--down {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

.pill--warn {
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 12%);
}

.pill--flat {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 70%);
}

.dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.dot--flow {
  background: #e0a13b;
}

.dot--flat {
  background: hsl(var(--muted-foreground));
}

.nav-card__chart {
  flex: 1;
  min-height: 0;
}

.nav-card__footer {
  display: flex;
  flex: 0 0 auto;
  gap: 14px;
  margin-top: 6px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.nav-card__footer b {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.is-up {
  color: hsl(var(--stock-up)) !important;
}

.nav-card__note {
  margin-left: auto;
}
</style>
