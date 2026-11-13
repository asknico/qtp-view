<script lang="ts" setup>
import type { KpiTone, KpiToneColor, TodayKpiCard } from '../data/types';

interface Props {
  items: TodayKpiCard[];
}

defineProps<Props>();

const TONE_CLASS: Record<KpiTone, string> = {
  down: 'is-down',
  flat: '',
  muted: 'kpi__muted',
  up: 'is-up',
  warn: 'kpi__warn',
};

function toneClass(tone?: KpiTone): string {
  return tone ? TONE_CLASS[tone] : '';
}

/** 图标（feather 风格线性图标，currentColor 随色调） */
const ICON_PATHS: Record<string, string> = {
  fee: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  operationCount:
    '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>',
  realizedPnl:
    '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  tradeCount:
    '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/>',
  turnover:
    '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
};

function iconOf(key?: string): string {
  return (key ? ICON_PATHS[key] : undefined) ?? ICON_PATHS.tradeCount ?? '';
}

function iconTone(tone?: KpiToneColor): string {
  return `kpi__icon--${tone ?? 'blue'}`;
}
</script>

<template>
  <div class="kpi-grid">
    <div
      v-for="item in items"
      :key="item.key"
      class="kpi"
      :class="{ 'kpi--accent': item.accent }"
    >
      <!-- 标签行：图标色块 + 标签（与资产总览同一套彩色 chip） -->
      <div class="kpi__head">
        <span class="kpi__icon" :class="iconTone(item.tone)">
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
            <g v-html="iconOf(item.icon)" />
          </svg>
        </span>
        <span class="kpi__label">{{ item.label }}</span>
      </div>

      <div
        class="kpi__value"
        :class="
          item.valueTone === 'up'
            ? 'is-up'
            : item.valueTone === 'down'
              ? 'is-down'
              : ''
        "
      >
        {{ item.display }}<small v-if="item.unit">{{ item.unit }}</small>
      </div>

      <div v-if="item.parts.length > 0 || item.pill" class="kpi__foot">
        <span
          v-for="(part, index) in item.parts"
          :key="index"
          :class="toneClass(part.tone)"
        >
          {{ part.text }}
        </span>
        <span
          v-if="item.pill"
          class="kpi__pill"
          :class="`kpi__pill--${item.pill.tone}`"
        >
          {{ item.pill.text }}
        </span>
      </div>
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
  font-size: 24px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  letter-spacing: -0.7px;
  white-space: nowrap;
}

.kpi__value small {
  margin-left: 3px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0;
}

/* foot 固定高度 + 钉底：五张卡的信息行永远在同一水平线，
   不随内容差异（纯文本 vs 胶囊）或增删而上下浮动 */
.kpi__foot {
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
}

.kpi__warn {
  color: hsl(32deg 80% 40%);
}

/* ---- 胶囊徽标 ---- */
.kpi__pill {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 1px 7px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 999px;
}

.kpi__pill--ok {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

.kpi__pill--danger {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 10%);
}

.kpi__pill--warn {
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 12%);
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-rows: none;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
