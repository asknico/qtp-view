<script lang="ts" setup>
/**
 * KPI 卡片右下角的迷你走势（ECharts 版）
 * ---------------------------------------------------------------------------
 * 只画一条无坐标轴的面积折线：78×26，涨色线 + 自上而下渐隐填充。
 * 视觉与原来的手绘 SVG 对齐（线宽 1.6、上下各留约 8% 余量），
 * 但走统一的 useEcharts，主题切换时自动重渲染。
 */
import type { EChartsOption } from 'echarts';

import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getStockColor } from '#/constants/stock-theme';

interface Props {
  /** 走势序列（仅展示形状，不关心绝对值） */
  data: number[];
  /** 是否为跌色（默认涨色） */
  down?: boolean;
}

defineOptions({ name: 'KpiSparkline' });

const props = withDefaults(defineProps<Props>(), { down: false });

const { isDark } = usePreferences();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function buildOption(): EChartsOption {
  const stock = getStockColor(isDark.value);
  const color = props.down ? stock.down : stock.up;
  const data = props.data;

  return {
    animation: false,
    grid: { bottom: 0, left: 0, right: 0, top: 0 },
    series: [
      {
        areaStyle: {
          color: {
            colorStops: [
              { color: `${color}42`, offset: 0 },
              { color: `${color}00`, offset: 1 },
            ],
            global: false,
            type: 'linear',
            x: 0,
            x2: 0,
            y: 0,
            y2: 1,
          },
        },
        data,
        itemStyle: { color },
        lineStyle: { width: 1.6 },
        name: '走势',
        showSymbol: false,
        smooth: false,
        type: 'line',
      },
    ],
    // 类目轴只用来固定点的水平顺序（series.data 必须是纯数值，避免类目名匹配不上丢点）
    xAxis: {
      boundaryGap: false,
      data: data.map((_, i) => String(i)),
      show: false,
      type: 'category',
    },
    yAxis: {
      // 上下各留 8% 余量，等价于原 SVG 的 viewBox 2~22 / 24
      max: (extent: { max: number; min: number }) =>
        extent.max + (extent.max - extent.min) * 0.08 || extent.max + 1,
      min: (extent: { max: number; min: number }) =>
        extent.min - (extent.max - extent.min) * 0.08,
      scale: true,
      show: false,
      type: 'value',
    },
  };
}

async function render() {
  await renderEcharts(buildOption());
}

watch([() => props.data, isDark], () => render());
onMounted(() => render());
</script>

<template>
  <div class="kpi-spark">
    <EchartsUI ref="chartRef" height="100%" width="100%" />
  </div>
</template>

<style scoped>
.kpi-spark {
  width: 78px;
  height: 26px;
}
</style>
