<script lang="ts" setup>
/**
 * 顶部四小卡的内容体
 * ---------------------------------------------------------------------------
 * 四张卡共用一个组件，按 key 分流渲染：
 *   totalAssets  → 金额（小数小字）+ 今日变动 + 迷你走势
 *   todayPnl     → 盈亏合计 + 浮动/已实现拆解 + 跑赢基准
 *   position     → 仓位半环 + 目标区间判定
 *   topHoldings  → 前 4 大持仓占比清单
 */
import type { MiniCardVm } from '../data/types';

import { computed } from 'vue';

import HalfGauge from './half-gauge.vue';

interface Props {
  card?: MiniCardVm;
}

const props = defineProps<Props>();

const SPARK_WIDTH = 132;
const SPARK_HEIGHT = 22;
const SPARK_PAD = 2;

/** 迷你走势：归一化到 132×22 视口，上下各留 2px */
const spark = computed(() => {
  const data = props.card?.spark ?? [];
  if (data.length < 2) return { area: '', line: '' };
  const values = [...data];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = SPARK_WIDTH / (values.length - 1);
  const points = values.map((value, i) => {
    const x = step * i;
    const y =
      SPARK_HEIGHT -
      SPARK_PAD -
      ((value - min) / span) * (SPARK_HEIGHT - SPARK_PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    area: `0,${SPARK_HEIGHT} ${points.join(' ')} ${SPARK_WIDTH},${SPARK_HEIGHT}`,
    line: points.join(' '),
  };
});
</script>

<template>
  <div v-if="!card" class="mc mc--empty">暂无数据</div>

  <!-- 总资产 -->
  <div
    v-else-if="card.key === 'totalAssets'"
    class="mc"
    :class="`mc--${card.tone}`"
  >
    <div class="mc__row">
      <div class="mc__value">
        {{ card.value
        }}<small v-if="card.valueDecimal">.{{ card.valueDecimal }}</small>
      </div>
      <svg
        v-if="spark.line"
        class="mc__spark"
        preserveAspectRatio="none"
        :viewBox="`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`"
      >
        <polygon :points="spark.area" fill="currentColor" opacity="0.1" />
        <polyline
          :points="spark.line"
          fill="none"
          stroke="currentColor"
          stroke-linejoin="round"
          stroke-width="1.5"
        />
      </svg>
    </div>
    <div class="mc__note">{{ card.note }}</div>
  </div>

  <!-- 今日盈亏 -->
  <div
    v-else-if="card.key === 'todayPnl'"
    class="mc"
    :class="`mc--${card.tone}`"
  >
    <div class="mc__value">{{ card.value }}</div>
    <div class="mc__sub">{{ card.breakdown }}</div>
    <div v-if="card.extra" class="mc__sub">
      {{ card.extra.label }}
      <b :class="`t-${card.extra.tone}`">{{ card.extra.text }}</b>
    </div>
  </div>

  <!-- 仓位 -->
  <div v-else-if="card.key === 'position'" class="mc mc--gauge">
    <div class="mc__gauge">
      <HalfGauge
        color="hsl(var(--chart-1))"
        :pct="card.gauge?.pct ?? 0"
        :value-text="card.value"
      />
    </div>
    <div class="mc__gauge-side">
      <div class="mc__gauge-label">{{ card.gauge?.bandText }}</div>
      <b :class="card.gauge?.inBand ? 't-flat' : 't-down'">{{ card.note }}</b>
    </div>
  </div>

  <!-- 持仓 TOP -->
  <div v-else class="mc">
    <div v-for="row in card.rows ?? []" :key="row.name" class="mc__list-row">
      <span class="mc__list-name">{{ row.name }}</span>
      <span class="mc__list-value">{{ row.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.mc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: hsl(var(--foreground));
}

.mc--empty {
  align-items: center;
  justify-content: center;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

/* 涨跌色只作用在数值区，标题与说明保持中性色 */
.mc--up .mc__value,
.mc--up .mc__note,
.mc--up .mc__spark {
  color: hsl(var(--stock-up));
}

.mc--down .mc__value,
.mc--down .mc__note,
.mc--down .mc__spark {
  color: hsl(var(--stock-down));
}

.mc--flat .mc__value {
  color: hsl(var(--foreground));
}

.mc__row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  justify-content: space-between;
}

/* 迷你卡容积有限，数值取“中型数值”18 —— 与卡片标题 13 拉开层级，
   又不至于把副行挤出 112px 的高度 */
.mc__value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-value);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  letter-spacing: -0.6px;
  white-space: nowrap;
}

.mc__value small {
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0;
  opacity: 0.75;
}

.mc__spark {
  flex: 0 0 78px;
  width: 78px;
  height: 22px;
  margin-bottom: 2px;
}

.mc__note {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.mc__sub {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.mc__sub b {
  font-weight: var(--font-weight-strong);
}

.t-up {
  color: hsl(var(--stock-up));
}

.t-down {
  color: hsl(var(--stock-down));
}

.t-flat {
  color: hsl(var(--foreground));
}

.mc--gauge {
  flex-direction: row;
  gap: 8px;
  align-items: center;
}

.mc__gauge {
  flex: 0 0 92px;
}

.mc__gauge-side {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: var(--font-small);
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.mc__gauge-label {
  white-space: nowrap;
}

.mc__list-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-small);
  line-height: 1.4;
}

.mc__list-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc__list-value {
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
}
</style>
