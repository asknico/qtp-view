<script lang="ts" setup>
/**
 * 市场热度卡
 * ---------------------------------------------------------------------------
 * 上涨占比半环 + 成交额口径说明。占比由上涨/下跌/平盘家数反推（见 data/demo），
 * 因此环上数字与页脚家数永远同源，不会出现「58.2% 对不上家数」的矛盾。
 */
import type { MarketHeatData } from '../data/types';

import { computed } from 'vue';

import { marketHeatTextOf } from '../data/selectors';
import HalfGauge from './half-gauge.vue';

interface Props {
  data: MarketHeatData;
}

const props = defineProps<Props>();

const texts = computed(() => marketHeatTextOf(props.data));
</script>

<template>
  <div class="heat">
    <div class="heat__gauge">
      <HalfGauge
        caption="上涨占比"
        color="hsl(var(--stock-up))"
        :pct="data.upRatio * 100"
        :value-text="texts.upRatioText"
      />
    </div>
    <div class="heat__meta">
      <div class="heat__summary" :title="texts.ma5Text">
        两市成交 <b>{{ texts.turnoverText }}</b>
        <span class="heat__sep">·</span>
        较 5 日均量 <b class="heat__up">{{ texts.vsMa5PctText }}</b>
      </div>
      <div class="heat__counts">
        涨 {{ data.upCount }} · 跌 {{ data.downCount }} · 平
        {{ data.flatCount }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.heat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
  height: 100%;
  min-height: 0;
}

.heat__gauge {
  width: 132px;
  margin: 0 auto;
}

.heat__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.heat__summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heat__summary b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--foreground));
}

.heat__sep {
  margin: 0 2px;
}

.heat__up {
  color: hsl(var(--stock-up)) !important;
}

.heat__counts {
  font-variant-numeric: tabular-nums;
  text-align: center;
}
</style>
