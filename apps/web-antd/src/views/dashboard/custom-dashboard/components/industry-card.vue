<script lang="ts" setup>
/**
 * 行业分布卡
 * ---------------------------------------------------------------------------
 * 环图只画占比，图例用 HTML 列表（右侧），颜色与环图同源（chart 色板）。
 * 「其他」固定用灰蓝色，避免和真实行业抢视觉。
 */
import type { EChartsOption } from 'echarts';

import type { EchartsUIType } from '@vben/plugins/echarts';

import type { IndustryCardData } from '../data/types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getChartPalette } from '#/constants/stock-theme';

import { industryLegendOf } from '../data/selectors';

defineOptions({ name: 'IndustryCard' });

const props = defineProps<Props>();

interface Props {
  data: IndustryCardData;
}

const { isDark } = usePreferences();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

/** 前三色 + 第四色，末位「其他」固定灰蓝 */
const colors = computed(() => {
  const palette = getChartPalette(isDark.value);
  return [palette[0], palette[1], palette[3], palette[4], palette[6]];
});

const legend = computed(() => industryLegendOf(props.data, colors.value));

function buildOption(): EChartsOption {
  return {
    series: [
      {
        avoidLabelOverlap: true,
        data: props.data.items.map((item, i) => ({
          itemStyle: { color: colors.value[i % colors.value.length] },
          name: item.name,
          value: item.pct,
        })),
        itemStyle: {
          borderColor: isDark.value ? 'hsl(240 6% 10%)' : '#FFFFFF',
          borderRadius: 2,
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        radius: ['62%', '88%'],
        type: 'pie',
      },
    ],
  };
}

async function render() {
  await renderEcharts(buildOption());
}

watch([() => props.data, isDark, colors], () => render());
onMounted(() => render());
</script>

<template>
  <div class="ind">
    <div class="ind__chart">
      <EchartsUI ref="chartRef" height="100%" width="100%" />
      <div class="ind__center">
        <span class="ind__center-label">行业</span>
        <b class="ind__center-value">{{ data.totalCount }} 个</b>
      </div>
    </div>
    <div class="ind__legend">
      <div v-for="item in legend" :key="item.name" class="ind__row">
        <span class="ind__dot" :style="{ background: item.color }"></span>
        <span class="ind__name">{{ item.name }}</span>
        <b class="ind__pct">{{ item.pct }}%</b>
      </div>
      <div class="ind__note" :title="data.note">{{ data.note }}</div>
    </div>
  </div>
</template>

<style scoped>
.ind {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 100%;
  min-height: 0;
}

.ind__chart {
  position: relative;
  flex: 0 0 118px;
  height: 118px;
}

.ind__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.ind__center-label {
  font-size: 9.5px;
  color: hsl(var(--muted-foreground));
}

.ind__center-value {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.2px;
}

.ind__legend {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ind__row {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
}

.ind__dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.ind__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ind__pct {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--foreground));
}

.ind__note {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 9.5px;
  line-height: 1.4;
  color: hsl(var(--muted-foreground) / 85%);
  white-space: nowrap;
}
</style>
