<script lang="ts" setup>
/**
 * 板块热力图（矩形树图 / Treemap，ECharts 版）
 * ---------------------------------------------------------------------------
 * 面积 = 板块今日成交额，颜色 = 今日涨跌幅（红涨绿跌，幅度越深越饱和），
 * 格内两行标签：板块名 + 涨跌幅（同花顺行情热力图同款布局）。
 * 小格子放不下标签时 ECharts 会自动截断，悬浮可见完整信息。
 */
import type {
  DefaultLabelFormatterCallbackParams,
  EChartsOption,
} from 'echarts';

import type { EchartsUIType } from '@vben/plugins/echarts';

import type { HeatTileVm } from '../data/types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { getStockColor } from '#/constants/stock-theme';

import { heatTileAlphaPct } from '../data/format';

interface Props {
  tiles: HeatTileVm[];
}

defineOptions({ name: 'SectorHeatmap' });

const props = defineProps<Props>();

const { isDark } = usePreferences();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

/** hex 颜色追加透明度（0~100） */
function withAlpha(hex: string, alphaPct: number): string {
  const a = Math.round((alphaPct / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** 板块名 → 展示模型（tooltip / label 按 name 回查，避免往 data 塞自定义字段） */
const tileByName = computed(
  () => new Map(props.tiles.map((tile) => [tile.name, tile])),
);

/** 图例四档色（与 heatTileAlphaPct 同一色阶，保持图例与格子同源） */
const LEGEND = computed(() => {
  const stock = getStockColor(isDark.value);
  return [
    {
      color: withAlpha(stock.up, heatTileAlphaPct(2.2)),
      label: '涨幅 >2%',
    },
    {
      color: withAlpha(stock.up, heatTileAlphaPct(1)),
      label: '涨幅 0~2%',
    },
    {
      color: withAlpha(stock.down, heatTileAlphaPct(1)),
      label: '跌幅 0~-2%',
    },
    {
      color: withAlpha(stock.down, heatTileAlphaPct(2.2)),
      label: '跌幅 <-2%',
    },
  ];
});

function buildOption(): EChartsOption {
  const stock = getStockColor(isDark.value);
  // 格子留缝色 = 卡片底色；标签色随主题取中性前景色（参考稿为深色文字）
  const gapColor = isDark.value ? '#14171d' : '#ffffff';
  const labelColor = isDark.value ? '#e8eaf0' : '#33363c';
  const tileOf = (name: unknown) => tileByName.value.get(String(name ?? ''));

  return {
    animation: false,
    series: [
      {
        breadcrumb: { show: false },
        data: props.tiles.map((tile) => ({
          itemStyle: {
            color: withAlpha(
              tile.changePct >= 0 ? stock.up : stock.down,
              heatTileAlphaPct(tile.changePct),
            ),
          },
          name: tile.name,
          value: tile.turnoverYi,
        })),
        itemStyle: {
          borderColor: gapColor,
          borderRadius: 3,
          borderWidth: 1,
          gapWidth: 1,
        },
        label: {
          color: labelColor,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 18,
          overflow: 'truncate',
          position: 'inside',
          formatter: (p: DefaultLabelFormatterCallbackParams) => {
            const tile = tileOf(p.name);
            return tile ? `${tile.name}\n${tile.pctDisplay}` : String(p.name);
          },
        },
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        nodeClick: false,
        roam: false,
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgb(16 24 40 / 24%)',
          },
        },
        type: 'treemap',
      },
    ],
    tooltip: {
      appendToBody: false,
      backgroundColor: isDark.value ? '#1d222b' : '#ffffff',
      borderColor: isDark.value ? '#333a46' : '#e3e6ec',
      confine: true,
      extraCssText: 'box-shadow: 0 4px 14px rgb(16 24 40 / 12%);',
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const tile = tileOf(p?.name);
        if (!tile) return '';
        return `${tile.name}<br/>涨跌幅 ${tile.pctDisplay}<br/>成交额 ${tile.turnoverDisplay}`;
      },
      padding: [6, 10],
      textStyle: {
        color: isDark.value ? '#e8eaf0' : '#33363c',
        fontSize: 12,
      },
      trigger: 'item',
    },
  };
}

async function render() {
  await renderEcharts(buildOption());
}

watch([() => props.tiles, isDark], () => render());
onMounted(() => render());
</script>

<template>
  <div class="heat">
    <div class="heat__chart">
      <EchartsUI ref="chartRef" height="100%" width="100%" />
    </div>
    <div class="heat__legend">
      <span v-for="item in LEGEND" :key="item.label">
        <i :style="{ background: item.color }"></i>{{ item.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.heat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.heat__chart {
  flex: 1;
  min-height: 0;
}

.heat__legend {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding-top: 8px;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
  border-top: 1px solid hsl(var(--border) / 50%);
}

.heat__legend span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.heat__legend i {
  display: inline-block;
  width: 12px;
  height: 8px;
  border-radius: 2px;
}
</style>
