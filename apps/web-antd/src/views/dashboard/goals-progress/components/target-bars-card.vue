<script lang="ts" setup>
import type { TargetBarVm } from '../data/types';

interface Props {
  bars: TargetBarVm[];
}

defineProps<Props>();
</script>

<template>
  <div class="tb">
    <div v-for="bar in bars" :key="bar.key" class="tb__row">
      <div class="tb__head">
        <span class="tb__label" :class="{ 'tb__label--over': bar.overLimit }">
          {{ bar.label }}
        </span>
        <span class="tb__value" :class="{ 'tb__value--over': bar.overLimit }">
          {{ bar.valueDisplay }}
        </span>
      </div>
      <div class="tb__track">
        <i
          class="tb__bar"
          :class="[`tb__bar--${bar.tone}`, { 'tb__bar--over': bar.overLimit }]"
          :style="{ width: `${bar.widthPct}%` }"
        ></i>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tb {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 0;
  padding: 2px 0;
}

.tb__row {
  min-height: 0;
}

.tb__head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 11.5px;
}

.tb__label {
  overflow: hidden;
  text-overflow: ellipsis;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.tb__label--over {
  font-weight: 600;
  color: hsl(var(--stock-up));
}

.tb__value {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
}

.tb__value--over {
  font-weight: 600;
  color: hsl(var(--stock-up));
}

.tb__track {
  height: 6px;
  overflow: hidden;
  background: hsl(var(--muted) / 80%);
  border-radius: 3px;
}

.tb__bar {
  display: block;
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s;
}

/* 收益进度：涨色 */
.tb__bar--up {
  background: hsl(var(--stock-up) / 75%);
}

/* 仓位区间：主题蓝（主题安全色，--primary 深色下不可用） */
.tb__bar--act {
  background: hsl(215deg 85% 55%);
}

/* 限制类安全：跌色（绿） */
.tb__bar--down {
  background: hsl(var(--stock-down) / 70%);
}

/* 超限：标红 */
.tb__bar--over {
  background: hsl(var(--stock-up));
}
</style>
