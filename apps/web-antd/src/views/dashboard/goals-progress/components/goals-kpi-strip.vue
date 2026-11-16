<script lang="ts" setup>
import type { GoalKpiVm } from '../data/types';

interface Props {
  items: GoalKpiVm[];
}

defineProps<Props>();
</script>

<template>
  <div class="gkpi-grid">
    <div
      v-for="item in items"
      :key="item.key"
      class="gkpi"
      :class="{ 'gkpi--accent': item.accent }"
    >
      <div class="gkpi__label">{{ item.label }}</div>
      <div class="gkpi__value">
        {{ item.value }}<small v-if="item.suffix">{{ item.suffix }}</small>
      </div>
      <div class="gkpi__delta">
        <span v-if="item.deltaUp" class="gkpi__delta-up">{{
          item.deltaUp
        }}</span>
        <span v-if="item.note" class="gkpi__note">{{ item.note }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gkpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  height: 100%;
}

.gkpi {
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

.gkpi:hover {
  border-color: hsl(var(--border));
  box-shadow: 0 3px 10px rgb(16 24 40 / 7%);
}

.gkpi--accent {
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 6%),
    hsl(var(--card)) 58%
  );
}

.gkpi__label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.gkpi__value {
  margin-top: 3px;
  overflow: hidden;
  font-size: 23px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  letter-spacing: -0.6px;
  white-space: nowrap;
}

.gkpi__value small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0;
}

/* 副行固定高度 + 钉底：四张卡信息行永远同一水平线（与另两页 KPI 同策略） */
.gkpi__delta {
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

.gkpi__delta-up {
  color: hsl(var(--stock-up));
}

.gkpi__note {
  overflow: hidden;
  text-overflow: ellipsis;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 1200px) {
  .gkpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
