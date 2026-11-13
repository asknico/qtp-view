<script lang="ts" setup>
/**
 * 年度目标完成度（半环仪表）
 * ---------------------------------------------------------------------------
 * 与市场概览「上涨占比」同款 SVG 弧线做法：pathLength=100 + dasharray，
 * 无需 ECharts；刻度线（目标 / 预警线）由百分比实时算坐标。
 */
interface Props {
  /** 达成率 0~100 */
  ratePct: number;
  /** 预警线刻度（%，默认 80） */
  warnPct?: number;
  /** 目标收益展示（如 +15.0%） */
  targetDisplay: string;
  /** 当前收益展示（如 +12.40%） */
  doneDisplay: string;
  /** 剩余可承受回撤展示（如 -6.8%） */
  drawdownDisplay: string;
}

const props = withDefaults(defineProps<Props>(), { warnPct: 80 });

/** 半环圆心与半径（与 viewBox 0 0 260 150 对应） */
const CX = 130;
const CY = 132;
const R = 114;

/** 百分比 → 弧上角度（180°=左端 0%，0°=右端 100%） */
function pointAt(pct: number, radius: number): { x: number; y: number } {
  const theta = (Math.PI * (1 - Math.min(Math.max(pct, 0), 100))) / 100;
  return {
    x: CX + radius * Math.cos(theta),
    y: CY - radius * Math.sin(theta),
  };
}

/** 刻度线坐标：从半径内侧拉到外侧 */
function tick(pct: number): { x1: number; x2: number; y1: number; y2: number } {
  const p1 = pointAt(pct, R - 8);
  const p2 = pointAt(pct, R + 8);
  return { x1: p1.x, x2: p2.x, y1: p1.y, y2: p2.y };
}

/** 刻度文字坐标（弧外侧） */
function tickLabel(pct: number): { x: number; y: number } {
  return pointAt(pct, R + 19);
}

const targetTick = tick(100);
const targetLabel = tickLabel(100);
const warnTick = tick(props.warnPct);
const warnLabel = tickLabel(props.warnPct);

/** 半环弧线路径（背景与进度共用，用 dasharray 控制进度） */
const ARC_PATH = `M ${CX - R},${CY} A ${R},${R} 0 0 1 ${CX + R},${CY}`;
</script>

<template>
  <div class="gg">
    <svg class="gg__gauge" height="100%" viewBox="0 0 260 150" width="100%">
      <!-- 背景弧 -->
      <path
        :d="ARC_PATH"
        fill="none"
        pathLength="100"
        stroke="hsl(var(--muted) / 70%)"
        stroke-linecap="round"
        stroke-width="11"
      />
      <!-- 进度弧 -->
      <path
        :d="ARC_PATH"
        fill="none"
        pathLength="100"
        stroke="hsl(var(--stock-up))"
        :stroke-dasharray="`${Math.min(ratePct, 100)} 100`"
        stroke-linecap="round"
        stroke-width="11"
      />
      <!-- 目标刻度（100%） -->
      <line
        :x1="targetTick.x1"
        :x2="targetTick.x2"
        :y1="targetTick.y1"
        :y2="targetTick.y2"
        stroke="hsl(var(--border))"
        stroke-width="1.5"
      />
      <text
        :x="targetLabel.x"
        :y="targetLabel.y + 3"
        fill="hsl(var(--muted-foreground))"
        font-size="8.5"
        text-anchor="end"
      >
        目标
      </text>
      <!-- 预警线刻度 -->
      <line
        :x1="warnTick.x1"
        :x2="warnTick.x2"
        :y1="warnTick.y1"
        :y2="warnTick.y2"
        stroke="hsl(var(--border))"
        stroke-width="1.5"
      />
      <text
        :x="warnLabel.x"
        :y="warnLabel.y - 3"
        fill="hsl(var(--muted-foreground))"
        font-size="8.5"
        text-anchor="middle"
      >
        {{ warnPct }}%
      </text>
      <!-- 中心数值 -->
      <text
        class="gg__rate"
        fill="hsl(var(--stock-up))"
        font-size="21"
        font-weight="650"
        text-anchor="middle"
        :x="CX"
        :y="CY - 14"
      >
        {{ ratePct.toFixed(1) }}%
      </text>
      <text
        fill="hsl(var(--muted-foreground))"
        font-size="9.5"
        text-anchor="middle"
        :x="CX"
        :y="CY + 2"
      >
        年度目标达成率
      </text>
    </svg>

    <div class="gg__kv">
      <div>
        <div class="gg__kv-label">目标收益</div>
        <div class="gg__kv-value">{{ targetDisplay }}</div>
      </div>
      <div>
        <div class="gg__kv-label">当前收益</div>
        <div class="gg__kv-value is-up">{{ doneDisplay }}</div>
      </div>
      <div>
        <div class="gg__kv-label">剩余可承受回撤</div>
        <div class="gg__kv-value is-down">{{ drawdownDisplay }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gg {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  min-height: 0;
}

.gg__gauge {
  display: block;
  flex: 1;
  min-height: 0;
}

.gg__rate {
  font-variant-numeric: tabular-nums;
}

.gg__kv {
  display: flex;
  flex: 0 0 auto;
  gap: 26px;
  justify-content: center;
  padding-bottom: 2px;
}

.gg__kv-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.gg__kv-value {
  margin-top: 1px;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}
</style>
