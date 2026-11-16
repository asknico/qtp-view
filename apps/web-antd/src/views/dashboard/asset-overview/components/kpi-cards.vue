<script lang="ts" setup>
import type { KpiItem } from '../data/types';

import { computed } from 'vue';

import { formatSigned, splitAmount } from '../data/demo';
import KpiSparkline from './kpi-sparkline.vue';

interface Props {
  items: KpiItem[];
}

const props = defineProps<Props>();

interface KpiRow {
  item: KpiItem;
  hasSpark: boolean;
  split: ReturnType<typeof splitAmount>;
}

/** 主数值按正负着色：有 trend 的才染涨跌色，无 trend 用前景色 */
function valueClass(item: KpiItem): string {
  if (!item.trend || item.trend === 'flat') return '';
  return item.trend === 'up' ? 'is-up' : 'is-down';
}

/** 胶囊徽标方向类 */
function pillClass(value: number): string {
  return value >= 0 ? 'kpi__pill--up' : 'kpi__pill--down';
}

/** 副行涨跌色 */
function deltaClass(value: number | undefined): string {
  if (!value) return '';
  return value > 0 ? 'is-up' : 'is-down';
}

/** 图标（feather 风格线性图标，currentColor 随色调） */
const ICON_PATHS: Record<string, string> = {
  floatingPnl: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  maxDrawdown:
    '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  realizedPnl:
    '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  todayPnl:
    '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  totalAssets:
    '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>',
};

function iconOf(key: string): string {
  return ICON_PATHS[key] ?? ICON_PATHS.totalAssets ?? '';
}

/** 行数据：主数值拆分 + 是否有迷你走势 */
const rows = computed<KpiRow[]>(() =>
  props.items.map((item) => ({
    item,
    hasSpark: Boolean(item.spark && item.spark.length > 1),
    split: splitAmount(item.value, item.decimals ?? 2),
  })),
);
</script>

<template>
  <div class="kpi-grid">
    <div
      v-for="row in rows"
      :key="row.item.key"
      class="kpi"
      :class="{
        'kpi--accent': row.item.accent,
        'kpi--has-spark': row.hasSpark,
      }"
    >
      <!-- 标签行：图标色块 + 标签（参考设计稿的彩色 chip） -->
      <div class="kpi__head">
        <span
          class="kpi__icon"
          :class="`kpi__icon--${row.item.tone ?? 'blue'}`"
        >
          <svg
            fill="none"
            height="14"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <!-- eslint-disable-next-line vue/no-v-html -- 图标为本地常量 -->
            <g v-html="iconOf(row.item.key)" />
          </svg>
        </span>
        <span class="kpi__label">{{ row.item.label }}</span>
      </div>

      <div class="kpi__value" :class="valueClass(row.item)">
        {{ row.split.int
        }}<small>.{{ row.split.dec }}{{ row.item.suffix ?? '' }}</small>
      </div>

      <!-- 副行：涨跌值 + 涨跌幅胶囊 + 说明 -->
      <div
        v-if="row.item.change !== undefined || row.item.changePct !== undefined"
        class="kpi__delta"
      >
        <span
          v-if="row.item.change !== undefined"
          :class="deltaClass(row.item.change)"
        >
          {{ formatSigned(row.item.change) }}
        </span>
        <span
          v-if="row.item.changePct !== undefined"
          class="kpi__pill"
          :class="pillClass(row.item.changePct)"
        >
          {{ formatSigned(row.item.changePct, 2, true) }}
        </span>
        <span v-if="row.item.changeLabel" class="kpi__muted">{{
          row.item.changeLabel
        }}</span>
      </div>
      <div v-else-if="row.item.note" class="kpi__delta">
        <span class="kpi__muted">{{ row.item.note }}</span>
      </div>

      <KpiSparkline
        v-if="row.hasSpark && row.item.spark"
        class="kpi__spark"
        :data="row.item.spark"
      />
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  height: 100%;
}

.kpi {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 14px;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 80%);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.kpi:hover {
  border-color: hsl(var(--border));
  box-shadow: 0 3px 10px rgb(16 24 40 / 7%);
}

.kpi--accent {
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 6%),
    hsl(var(--card)) 58%
  );
}

/* 带 sparkline 的卡片：主数值与副行避开右下角图形区 */
.kpi--has-spark .kpi__value,
.kpi--has-spark .kpi__delta {
  max-width: calc(100% - 82px);
}

/* ---- 标签行：图标色块 + 标签 ---- */
.kpi__head {
  display: flex;
  gap: 7px;
  align-items: center;
  min-width: 0;
}

.kpi__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
}

.kpi__icon--blue {
  color: hsl(215deg 85% 48%);
  background: hsl(215deg 90% 52% / 11%);
}

.kpi__icon--orange {
  color: hsl(24deg 85% 44%);
  background: hsl(28deg 92% 50% / 13%);
}

.kpi__icon--violet {
  color: hsl(258deg 68% 56%);
  background: hsl(258deg 85% 60% / 12%);
}

.kpi__icon--teal {
  color: hsl(172deg 66% 32%);
  background: hsl(172deg 72% 40% / 13%);
}

.kpi__icon--amber {
  color: hsl(32deg 90% 40%);
  background: hsl(38deg 95% 50% / 15%);
}

.kpi__label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.kpi__value {
  margin-top: 4px;
  overflow: hidden;
  font-size: 24px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  letter-spacing: -0.7px;
  white-space: nowrap;
}

.kpi__value small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0;
}

/* ---- 副行：固定高度 + 钉底，与今日速览 KPI 同一水平对齐策略 ---- */
.kpi__delta {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 20px;
  margin-top: auto;
  overflow: hidden;
  font-size: 11.5px;
  line-height: 20px;
  white-space: nowrap;
}

.kpi__muted {
  overflow: hidden;
  text-overflow: ellipsis;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.kpi__pill {
  flex: 0 0 auto;
  padding: 1px 7px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 999px;
}

.kpi__pill--up {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 10%);
}

.kpi__pill--down {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

/* ---- sparkline：ECharts 迷你图容器（尺寸与卡片右下角留白对齐） ---- */
.kpi__spark {
  position: absolute;
  right: 12px;
  bottom: 10px;
  width: 78px;
  height: 26px;
  pointer-events: none;
  opacity: 0.9;
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
