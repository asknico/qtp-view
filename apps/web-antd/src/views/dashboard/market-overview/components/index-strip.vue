<script lang="ts" setup>
import type { IndexCardVm } from '../data/types';

interface Props {
  items: IndexCardVm[];
}

defineProps<Props>();

/** sparkline 折线点集（viewBox 54x20，与设计稿一致） */
function sparkPoints(spark: number[]): string {
  if (spark.length < 2) return '';
  const min = Math.min(...spark);
  const max = Math.max(...spark);
  const span = max - min || 1;
  return spark
    .map((v, i) => {
      const x = (i / (spark.length - 1)) * 54;
      const y = 18 - ((v - min) / span) * 16;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function sparkOf(item: IndexCardVm): string {
  return sparkPoints(item.spark);
}

const gridStyle = { gridTemplateColumns: 'repeat(6, 1fr)' };
</script>

<template>
  <div class="idx-grid" :style="gridStyle">
    <div v-for="item in items" :key="item.code" class="idx">
      <div class="idx__head">
        <span class="idx__name">{{ item.name }}</span>
        <svg
          v-if="sparkOf(item)"
          class="idx__spark"
          height="20"
          viewBox="0 0 54 20"
          width="54"
        >
          <defs>
            <linearGradient
              :id="`idx-spark-${item.code}`"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                class="idx__spark-stop"
                offset="0%"
                :stop-color="
                  item.dir === 'is-down'
                    ? 'hsl(var(--stock-down) / 26%)'
                    : 'hsl(var(--stock-up) / 26%)'
                "
              />
              <stop offset="100%" stop-color="hsl(var(--stock-up) / 0%)" />
            </linearGradient>
          </defs>
          <polygon
            :points="`0,20 ${sparkOf(item)} 54,20`"
            :fill="`url(#idx-spark-${item.code})`"
          />
          <polyline
            :points="sparkOf(item)"
            class="idx__spark-line"
            :class="item.dir"
          />
        </svg>
      </div>
      <div class="idx__value" :class="item.dir">{{ item.valueDisplay }}</div>
      <div class="idx__foot">
        <span class="idx__change" :class="item.dir">
          {{ item.changeDisplay }} {{ item.pctDisplay }}
        </span>
        <span class="idx__turnover">{{ item.turnoverDisplay }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.idx-grid {
  display: grid;
  gap: 6px;
  height: 100%;
}

.idx {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 10px 14px 9px;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 80%);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.idx:hover {
  border-color: hsl(var(--border));
  box-shadow: 0 3px 10px rgb(16 24 40 / 7%);
}

.idx__head {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.idx__name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.idx__spark {
  flex: 0 0 auto;
  opacity: 0.9;
}

.idx__spark-line {
  fill: none;
  stroke: hsl(var(--stock-up));
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.idx__spark-line.is-down {
  stroke: hsl(var(--stock-down));
}

.idx__value {
  font-size: 21px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.idx__foot {
  display: flex;
  gap: 6px;
  align-items: baseline;
  justify-content: space-between;
  min-width: 0;
  font-size: 11px;
}

.idx__change {
  flex: 0 0 auto;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.idx__turnover {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}
</style>
