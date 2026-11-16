<script lang="ts" setup>
import type { EChartsOption } from 'echarts';

import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getChartPalette } from '#/constants/stock-theme';

import {
  allocationItems,
  allocationNote,
  formatWan,
  positionLimit,
} from '../data/demo';

defineOptions({ name: 'AllocationCard' });

const { isDark } = usePreferences();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

/** 中心合计 */
const totalWan = computed(() =>
  formatWan(allocationItems.reduce((sum, item) => sum + item.value, 0)),
);

/** 图例圆点颜色与 echarts 色板同源，随主题切换 */
const legendColors = computed(() => {
  const palette = getChartPalette(isDark.value);
  return [
    palette[0],
    palette[1],
    palette[3],
    palette[6],
    palette[7] ?? palette[2],
  ];
});

function buildOption(): EChartsOption {
  const palette = getChartPalette(isDark.value);
  // 依次取色板：蓝(股票) 紫(ETF) 橙(可转债) 灰蓝(现金) 灰(其他)
  const colors = [
    palette[0],
    palette[1],
    palette[3],
    palette[6],
    palette[7] ?? palette[2],
  ];
  return {
    series: [
      {
        avoidLabelOverlap: true,
        data: allocationItems.map((item, i) => ({
          itemStyle: { color: colors[i % colors.length] },
          name: item.name,
          value: item.value,
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgb(0 0 0 / 20%)',
          },
          scaleSize: 3,
        },
        itemStyle: {
          borderColor: isDark.value ? 'hsl(240 6% 10%)' : '#FFFFFF',
          borderRadius: 3,
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        radius: ['66%', '88%'],
        type: 'pie',
      },
    ],
    tooltip: {
      backgroundColor: isDark.value ? '#1C1C1F' : '#FFFFFF',
      textStyle: { color: isDark.value ? '#E4E4E7' : '#1A2130', fontSize: 11 },
      trigger: 'item',
      valueFormatter: (v) => formatWan(Number(v)),
    },
  };
}

async function render() {
  await renderEcharts(buildOption());
}

watch(isDark, () => render());
onMounted(() => render());
</script>

<template>
  <div class="alloc">
    <div class="alloc__chart-wrap">
      <div class="alloc__chart">
        <EchartsUI ref="chartRef" height="100%" width="100%" />
      </div>
      <div class="alloc__center">
        <span class="alloc__center-label">总资产</span>
        <b class="alloc__center-value">{{ totalWan }}</b>
      </div>
      <!-- 图例与图表同源取色：直接用色板索引 -->
      <ul class="alloc__legend">
        <li v-for="(item, i) in allocationItems" :key="item.key">
          <span class="alloc__legend-name">
            <i class="alloc__dot" :style="{ background: legendColors[i] }"></i>{{ item.name }}
          </span>
          <span class="alloc__legend-pct">{{ item.percent }}%</span>
          <span class="alloc__legend-val">{{ formatWan(item.value) }}</span>
        </li>
      </ul>
    </div>
    <div class="alloc__limit">
      <div class="alloc__limit-head">
        <span>股票仓位上限 {{ positionLimit.limit }}%</span>
        <b>{{ positionLimit.current }}% / {{ positionLimit.limit }}%</b>
      </div>
      <div class="alloc__bar">
        <i
          :style="{
            width: `${(positionLimit.current / positionLimit.limit) * 100}%`,
          }"
        ></i>
      </div>
    </div>
    <div class="alloc__note">ⓘ {{ allocationNote }}</div>
  </div>
</template>

<style scoped>
.alloc {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.alloc__chart-wrap {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  min-height: 0;
}

.alloc__chart {
  flex: 0 0 58%;
  align-self: stretch;
  min-width: 0;
}

.alloc__center {
  position: absolute;
  top: 50%;
  left: 29%;
  text-align: center;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.alloc__center-label {
  display: block;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
}

.alloc__center-value {
  font-size: 17px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}

/* 图例色与 echarts 色板（getChartPalette）保持一致；常规流式布局，绝不与下方仓位条重叠 */
.alloc__legend {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
  min-width: 0;
  padding: 0 0 0 4px;
  margin: 0;
  list-style: none;
}

.alloc__legend li {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 2px 6px;
  font-size: 11px;
  white-space: nowrap;
  border-radius: 6px;
  transition: background 0.15s;
}

.alloc__legend li:hover {
  background: hsl(var(--muted) / 50%);
}

.alloc__legend-name {
  display: inline-flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  min-width: 52px;
  color: hsl(var(--foreground));
}

.alloc__legend-pct {
  min-width: 32px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--foreground));
  text-align: right;
}

.alloc__legend-val {
  min-width: 48px;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
  text-align: right;
}

.alloc__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

.alloc__limit {
  flex: 0 0 auto;
  margin-top: 10px;
}

.alloc__limit-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
}

.alloc__limit-head b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.alloc__bar {
  height: 6px;
  overflow: hidden;
  background: hsl(var(--muted) / 70%);
  border-radius: 999px;
}

.alloc__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 55%),
    hsl(var(--primary))
  );
  border-radius: 999px;
  transition: width 0.4s ease;
}

.alloc__note {
  margin-top: 8px;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
}
</style>
