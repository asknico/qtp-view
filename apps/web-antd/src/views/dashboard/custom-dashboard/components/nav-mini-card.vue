<script lang="ts" setup>
/**
 * 净值曲线卡（自定义看板用紧凑版）
 * ---------------------------------------------------------------------------
 * 与 1.1 资产总览的大图不同，这里只保留「账户 vs 沪深300」两条线：
 * 窗口起点归一化为 100，纵轴刻度隐藏，横轴取 6 个等距日期，
 * 盈亏数字放在图上方一行，卡片压到 216px 高仍可读。
 */
import type { EChartsOption } from 'echarts';

import type { EchartsUIType } from '@vben/plugins/echarts';

import type { NavChartVm } from '../data/types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getStockColor } from '#/constants/stock-theme';

import { formatSigned } from '../data/format';

defineOptions({ name: 'NavMiniCard' });

const props = defineProps<Props>();

interface Props {
  chart: NavChartVm;
}

const { isDark } = usePreferences();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const axisColor = computed(() =>
  isDark.value ? 'hsl(240 5% 45%)' : '#98a3b5',
);
const splitColor = computed(() =>
  isDark.value ? 'hsl(240 5% 20%)' : '#eef1f7',
);

/** 图例色：账户用涨色（本区间为上涨），基准用中性灰蓝 */
const navColor = computed(() => {
  const stock = getStockColor(isDark.value);
  return props.chart.navReturnPct >= 0 ? stock.up : stock.down;
});

function buildOption(): EChartsOption {
  const { points } = props.chart;
  const labels = points.map((p) => p.label);
  const navData = points.map((p) => p.nav);
  const benchData = points.map((p) => p.bench);

  return {
    animation: false,
    grid: { bottom: 16, left: 2, right: 4, top: 6 },
    series: [
      {
        areaStyle: {
          color: {
            colorStops: [
              { color: `${navColor.value}3D`, offset: 0 },
              { color: `${navColor.value}00`, offset: 1 },
            ],
            global: false,
            type: 'linear',
            x: 0,
            x2: 0,
            y: 0,
            y2: 1,
          },
        },
        data: navData,
        itemStyle: { color: navColor.value },
        lineStyle: { width: 1.8 },
        name: '账户',
        showSymbol: false,
        smooth: false,
        type: 'line',
      },
      {
        data: benchData,
        itemStyle: { color: axisColor.value },
        lineStyle: { type: 'dashed', width: 1.1 },
        name: '沪深300',
        showSymbol: false,
        smooth: false,
        type: 'line',
      },
    ],
    xAxis: {
      axisLabel: {
        color: axisColor.value,
        fontSize: 12,
        interval: Math.max(1, Math.ceil(labels.length / 5)),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      boundaryGap: false,
      data: labels,
      type: 'category',
    },
    yAxis: {
      axisLabel: { show: false },
      // 上下各留 6% 余量，避免线贴边
      max: (extent: { max: number; min: number }) =>
        extent.max + (extent.max - extent.min) * 0.06 || extent.max + 1,
      min: (extent: { max: number; min: number }) =>
        extent.min - (extent.max - extent.min) * 0.06,
      scale: true,
      splitLine: { lineStyle: { color: splitColor.value, width: 1 } },
      type: 'value',
    },
  };
}

async function render() {
  await renderEcharts(buildOption());
}

watch([() => props.chart, isDark], () => render());
onMounted(() => render());
</script>

<template>
  <div class="navm">
    <div class="navm__stats">
      <span class="navm__stat">
        账户
        <b :style="{ color: navColor }">
          {{ formatSigned(chart.navReturnPct, 2, true) }}
        </b>
      </span>
      <span class="navm__stat">
        沪深300
        <b class="navm__bench">
          {{ formatSigned(chart.benchReturnPct, 2, true) }}
        </b>
      </span>
      <span class="navm__range">{{ chart.startLabel }} ~ {{ chart.endLabel }}</span>
    </div>
    <div class="navm__chart">
      <EchartsUI ref="chartRef" height="100%" width="100%" />
    </div>
    <div class="navm__foot">
      窗口起点归一化为 100（口径：收盘市值含出入金现金；基准为沪深300 收盘点位）
    </div>
  </div>
</template>

<style scoped>
.navm {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.navm__stats {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: baseline;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.navm__stat b {
  font-size: var(--font-base);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
}

.navm__bench {
  color: hsl(var(--muted-foreground));
}

.navm__range {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.navm__chart {
  flex: 1;
  min-height: 0;
}

.navm__foot {
  flex: 0 0 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground) / 85%);
  white-space: nowrap;
}
</style>
