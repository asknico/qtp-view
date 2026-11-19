<script lang="ts" setup>
import type { TodoKpiVm } from '../data/types';

interface Props {
  items: TodoKpiVm[];
}

defineProps<Props>();
</script>

<template>
  <div class="tkpi-grid">
    <div
      v-for="item in items"
      :key="item.key"
      class="tkpi"
      :class="{ 'tkpi--accent': item.accent }"
    >
      <div class="tkpi__label">{{ item.label }}</div>
      <div class="tkpi__value">{{ item.value }}</div>
      <div class="tkpi__note">{{ item.note }}</div>
    </div>
  </div>
</template>

<style scoped>
.tkpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  height: 100%;
}

.tkpi {
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

.tkpi:hover {
  border-color: hsl(var(--border));
  box-shadow: 0 3px 10px rgb(16 24 40 / 7%);
}

.tkpi--accent {
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 6%),
    hsl(var(--card)) 58%
  );
}

.tkpi__label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.tkpi__value {
  margin-top: 3px;
  overflow: hidden;
  font-size: var(--font-kpi);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.tkpi__note {
  height: 20px;
  margin-top: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  line-height: 20px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .tkpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
