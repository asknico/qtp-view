<script lang="ts" setup>
/**
 * 半环仪表（仓位 / 市场热度共用）
 * ---------------------------------------------------------------------------
 * 纯 SVG 绘制：底轨 + 数值弧，不用图表库（占用小、主题色走后直接跟随）。
 * 数值文本由 CSS 覆盖层渲染，避免 SVG text 在不同字号下的基线差异。
 */
import { computed } from 'vue';

interface Props {
  /** 说明文案（数值下方） */
  caption?: string;
  /** 弧线颜色，默认图表主蓝 */
  color?: string;
  /** 百分比取值 0~100（超出按边界截断） */
  pct: number;
  /** 主数值文案（如 62.0%） */
  valueText: string;
}

const props = withDefaults(defineProps<Props>(), {
  caption: '',
  color: 'hsl(var(--chart-1))',
});

const RADIUS = 42;
const TRACK = `M ${50 - RADIUS} 50 A ${RADIUS} ${RADIUS} 0 0 1 ${50 + RADIUS} 50`;

const clamped = computed(() => Math.min(100, Math.max(0, props.pct)));

/** 数值弧：起点固定在左侧 (8,50)，末端按角度插值 */
const arc = computed(() => {
  const theta = Math.PI * (clamped.value / 100);
  const x = 50 - RADIUS * Math.cos(theta);
  const y = 50 - RADIUS * Math.sin(theta);
  return `M ${50 - RADIUS} 50 A ${RADIUS} ${RADIUS} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
});
</script>

<template>
  <div class="hgauge">
    <div class="hgauge__box">
      <svg
        class="hgauge__svg"
        viewBox="0 0 100 56"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          :d="TRACK"
          fill="none"
          stroke="hsl(var(--border))"
          stroke-linecap="round"
          stroke-width="8"
        />
        <path
          v-if="clamped > 0"
          :d="arc"
          fill="none"
          :stroke="color"
          stroke-linecap="round"
          stroke-width="8"
        />
      </svg>
      <div class="hgauge__center">
        <span class="hgauge__value" :style="{ color }">{{ valueText }}</span>
      </div>
    </div>
    <span v-if="caption" class="hgauge__caption">{{ caption }}</span>
  </div>
</template>

<style scoped>
.hgauge {
  position: relative;
  width: 100%;
  min-width: 0;
}

.hgauge__svg {
  display: block;
  width: 100%;
  height: auto;
}

.hgauge__box {
  position: relative;
}

.hgauge__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2px;
}

.hgauge__value {
  font-size: var(--font-value);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  letter-spacing: -0.4px;
}

.hgauge__caption {
  display: block;
  margin-top: 3px;
  font-size: var(--font-small);
  line-height: 1.2;
  color: hsl(var(--muted-foreground));
  text-align: center;
}
</style>
