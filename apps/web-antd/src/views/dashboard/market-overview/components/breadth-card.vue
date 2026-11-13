<script lang="ts" setup>
import type { MarketBreadth, VolumeBarVm } from '../data/types';

interface Props {
  breadth: MarketBreadth;
  /** 上涨占比（%，由家数反推） */
  upSharePct: number;
  volumeBars: VolumeBarVm[];
}

defineProps<Props>();
</script>

<template>
  <div class="bd">
    <!-- 上半：半圆仪表 + 家数列表 -->
    <div class="bd__top">
      <svg class="bd__gauge" viewBox="0 0 200 112" width="55%">
        <!-- 背景弧 -->
        <path
          d="M16,100 A84,84 0 0 1 184,100"
          fill="none"
          pathLength="100"
          stroke="hsl(var(--muted) / 70%)"
          stroke-linecap="round"
          stroke-width="11"
        />
        <!-- 占比弧 -->
        <path
          d="M16,100 A84,84 0 0 1 184,100"
          fill="none"
          pathLength="100"
          stroke="hsl(var(--stock-up))"
          stroke-linecap="round"
          :stroke-dasharray="`${Math.min(upSharePct, 100)} 100`"
          stroke-width="11"
        />
        <!-- 50% 刻度 -->
        <line
          stroke="hsl(var(--border))"
          stroke-width="1.5"
          x1="100"
          x2="100"
          y1="8"
          y2="17"
        />
        <text
          fill="hsl(var(--muted-foreground))"
          font-size="8.5"
          text-anchor="middle"
          x="100"
          y="6"
        >
          50%
        </text>
        <text
          class="bd__gauge-value"
          fill="hsl(var(--stock-up))"
          font-size="21"
          font-weight="650"
          text-anchor="middle"
          x="100"
          y="88"
        >
          {{ upSharePct.toFixed(1) }}%
        </text>
        <text
          fill="hsl(var(--muted-foreground))"
          font-size="9.5"
          text-anchor="middle"
          x="100"
          y="104"
        >
          上涨占比
        </text>
      </svg>

      <div class="bd__kv">
        <div class="bd__kv-row">
          <span>上涨家数</span>
          <b class="is-up">{{ breadth.upCount.toLocaleString() }}</b>
        </div>
        <div class="bd__kv-row">
          <span>下跌家数</span>
          <b class="is-down">{{ breadth.downCount.toLocaleString() }}</b>
        </div>
        <div class="bd__kv-row">
          <span>平盘家数</span>
          <b>{{ breadth.flatCount.toLocaleString() }}</b>
        </div>
        <div class="bd__kv-row">
          <span>涨停</span>
          <b class="is-up">{{ breadth.limitUp }}</b>
        </div>
        <div class="bd__kv-row">
          <span>跌停</span>
          <b class="is-down">{{ breadth.limitDown }}</b>
        </div>
      </div>
    </div>

    <!-- 下半：两市成交额 vs 5 日均量 -->
    <div class="bd__vol">
      <div class="bd__vol-title">两市成交额 vs 5 日均量</div>
      <div class="bd__bars">
        <div
          v-for="bar in volumeBars"
          :key="bar.date"
          class="bd__bar-col"
          :title="`${bar.date} · ${bar.turnoverDisplay}`"
        >
          <div class="bd__bar-track">
            <i
              class="bd__bar"
              :class="{ 'bd__bar--today': bar.isToday }"
              :style="{ height: `${bar.heightPct}%` }"
            ></i>
          </div>
          <span class="bd__bar-date">{{ bar.date }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bd {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.bd__top {
  display: flex;
  flex: 1;
  gap: 10px;
  min-height: 0;
}

.bd__gauge {
  flex: 0 0 auto;
  max-height: 100%;
}

.bd__gauge-value {
  font-variant-numeric: tabular-nums;
}

.bd__kv {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 2px 0;
}

.bd__kv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;
  font-size: 11.5px;
  border-bottom: 1px dashed hsl(var(--border) / 50%);
}

.bd__kv-row:last-child {
  border-bottom: none;
}

.bd__kv-row span {
  color: hsl(var(--muted-foreground));
}

.bd__kv-row b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.bd__vol {
  flex: 0 0 auto;
  padding-top: 8px;
  border-top: 1px solid hsl(var(--border) / 50%);
}

.bd__vol-title {
  margin-bottom: 6px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.bd__bars {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  height: 58px;
}

.bd__bar-col {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  height: 100%;
}

.bd__bar-track {
  display: flex;
  flex: 1;
  align-items: flex-end;
  justify-content: center;
  min-height: 0;
}

.bd__bar {
  display: block;
  width: 62%;
  min-height: 4px;
  background: hsl(var(--muted-foreground) / 35%);
  border-radius: 3px 3px 0 0;
  transition: height 0.4s;
}

.bd__bar--today {
  /* 主题安全色：--primary 在深色主题下是黑色，柱体需恒定亮色（设计稿蓝） */
  background: hsl(215deg 85% 55%);
}

.bd__bar-date {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  white-space: nowrap;
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}
</style>
