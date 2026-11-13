<script lang="ts" setup>
import type { GoalItem } from '../data/types';

interface Props {
  items: GoalItem[];
}

defineProps<Props>();

/** percent 类：完成度 0-100 */
function percentOf(item: GoalItem): number {
  if (item.kind !== 'percent' || !item.target) return 0;
  return Math.min(((item.current ?? 0) / item.target) * 100, 100);
}

/** count 类：完成度 0-100 */
function countOf(item: GoalItem): number {
  if (item.kind !== 'count' || !item.target) return 0;
  return Math.min(((item.current ?? 0) / item.target) * 100, 100);
}

/** band 类：当前值在标尺上的位置 %（标尺固定 0-100） */
function bandPos(item: GoalItem): number {
  return item.current ?? 0;
}

function bandLeft(item: GoalItem): number {
  return item.band?.[0] ?? 0;
}

function bandWidth(item: GoalItem): number {
  if (!item.band) return 0;
  return item.band[1] - item.band[0];
}
</script>

<template>
  <div class="goals">
    <div v-for="item in items" :key="item.key" class="goals__row">
      <div class="goals__label">
        {{ item.label }}
        <span v-if="item.hint" class="goals__hint">{{ item.hint }}</span>
      </div>

      <!-- percent：单值进度条 -->
      <template v-if="item.kind === 'percent'">
        <div class="goals__bar">
          <i :style="{ width: `${percentOf(item)}%` }"></i>
        </div>
        <div class="goals__value">
          <b>{{ item.current }}%</b>
          <span class="goals__muted">/ {{ item.target }}%</span>
        </div>
      </template>

      <!-- band：区间标尺 -->
      <template v-else-if="item.kind === 'band'">
        <div class="goals__band">
          <span
            class="goals__band-range"
            :style="{
              left: `${bandLeft(item)}%`,
              width: `${bandWidth(item)}%`,
            }"
          ></span>
          <i class="goals__band-pin" :style="{ left: `${bandPos(item)}%` }"></i>
        </div>
        <div class="goals__value">
          <b>{{ item.current }}%</b>
        </div>
      </template>

      <!-- count：笔数 -->
      <template v-else>
        <div class="goals__bar">
          <i
            class="goals__bar--count"
            :style="{ width: `${countOf(item)}%` }"
          ></i>
        </div>
        <div class="goals__value">
          <b>{{ item.current }}</b>
          <span class="goals__muted">/ {{ item.target }} {{ item.unit }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.goals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: space-around;
  height: 100%;
}

.goals__row {
  display: flex;
  gap: 14px;
  align-items: center;
}

.goals__label {
  flex: 0 0 190px;
  font-size: 12px;
  white-space: nowrap;
}

.goals__hint {
  margin-left: 4px;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
}

.goals__bar {
  position: relative;
  flex: 1;
  height: 8px;
  overflow: hidden;
  background: hsl(var(--muted) / 70%);
  border-radius: 999px;
}

.goals__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 55%),
    hsl(var(--primary))
  );
  border-radius: 999px;
  transition: width 0.4s ease;
}

.goals__bar--count {
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 35%),
    hsl(var(--primary) / 75%)
  );
}

.goals__value {
  flex: 0 0 96px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.goals__value b {
  font-weight: 600;
}

.goals__muted {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

/* 区间标尺 */
.goals__band {
  position: relative;
  flex: 1;
  height: 8px;
  background: hsl(var(--muted) / 70%);
  border-radius: 999px;
}

.goals__band-range {
  position: absolute;
  height: 100%;
  background: hsl(var(--primary) / 18%);
  border-radius: 999px;
}

.goals__band-pin {
  position: absolute;
  top: -2px;
  width: 4px;
  height: 12px;
  background: hsl(var(--primary));
  border-radius: 999px;
  box-shadow: 0 0 0 2px hsl(var(--card));
  transform: translateX(-50%);
  transition: left 0.4s ease;
}
</style>
