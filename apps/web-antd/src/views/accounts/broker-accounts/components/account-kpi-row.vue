<script lang="ts" setup>
import type { AccountKpiItem } from '../data/types';

import { computed } from 'vue';

import { splitAmount } from '../../_shared/format';

/**
 * 顶部四张 KPI：账户数 / 总资产 / 可用资金 / 本周净入金
 * 主数值与副行同高对齐，数值全部由 selectors 聚合，组件不参与计算。
 */
interface Props {
  items: AccountKpiItem[];
}

const props = defineProps<Props>();

const rows = computed(() =>
  props.items.map((item) => ({
    item,
    split: splitAmount(item.value, item.decimals),
  })),
);

/** 净流出用跌色（A 股习惯：绿跌） */
function valueClass(item: AccountKpiItem): string {
  return item.tone === 'down' ? 'is-down' : '';
}

const ICON_PATHS: Record<string, string> = {
  accountCount:
    '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>',
  totalAssets: '<path d="M3 20V9m5 11V4m5 16v-7m5 7V6m5 14v-9"/>',
  available:
    '<rect x="2" y="6" width="20" height="13" rx="2.5"/><circle cx="12" cy="12.5" r="2.6"/>',
  weeklyNetIn:
    '<path d="M12 4v12"/><path d="m6.5 11 5.5 5.5L17.5 11"/><path d="M5 21h14"/>',
};

const ICON_TONES = ['blue', 'teal', 'violet', 'amber'] as const;

function iconOf(key: string): string {
  return ICON_PATHS[key] ?? ICON_PATHS.accountCount ?? '';
}

function toneOf(index: number): string {
  return ICON_TONES[index % ICON_TONES.length] ?? 'blue';
}
</script>

<template>
  <div class="kpi-grid">
    <div
      v-for="(row, i) in rows"
      :key="row.item.key"
      class="kpi"
      :class="{ 'kpi--accent': row.item.accent }"
    >
      <div class="kpi__head">
        <span class="kpi__icon" :class="`kpi__icon--${toneOf(i)}`">
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
        }}<small v-if="row.item.decimals > 0">.{{ row.split.dec }}</small><small v-if="row.item.unit" class="kpi__unit">{{
          row.item.unit
        }}</small>
      </div>

      <div class="kpi__hint">{{ row.item.hint }}</div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  height: 100%;
}

.kpi {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 9px 14px 10px;
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

.kpi__icon--teal {
  color: hsl(172deg 66% 32%);
  background: hsl(172deg 72% 40% / 13%);
}

.kpi__icon--violet {
  color: hsl(258deg 68% 56%);
  background: hsl(258deg 85% 60% / 12%);
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
  margin-top: 2px;
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

.kpi__unit {
  margin-left: 3px !important;
}

.kpi__hint {
  height: 18px;
  margin-top: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 18px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
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
