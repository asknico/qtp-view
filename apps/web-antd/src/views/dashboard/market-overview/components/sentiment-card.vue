<script lang="ts" setup>
import type { MarketSentiment } from '../data/types';

import { formatYi, signedPct } from '../data/format';

interface Props {
  sentiment: MarketSentiment;
  /** 涨停家数（来自 breadth） */
  limitUp: number;
  /** 跌停家数（来自 breadth） */
  limitDown: number;
  /** 两市成交额较 5 日均量（%，由柱图数据反推） */
  turnoverVs5dPct: number;
}

defineProps<Props>();
</script>

<template>
  <div class="st">
    <!-- 4 项情绪指标 -->
    <div class="st__metrics">
      <div class="st__metric">
        <div class="st__label">两市成交额</div>
        <div class="st__value">{{ formatYi(sentiment.totalTurnoverYi) }}</div>
        <div class="st__note">
          较 5 日均量 {{ signedPct(turnoverVs5dPct, 1) }}
        </div>
      </div>
      <div class="st__metric">
        <div class="st__label">涨停 / 跌停</div>
        <div class="st__value">
          <span class="is-up">{{ limitUp }}</span>
          <span class="st__slash">/</span>
          <span class="is-down">{{ limitDown }}</span>
        </div>
        <div class="st__note">封板率 {{ sentiment.sealRatePct }}%</div>
      </div>
      <div class="st__metric">
        <div class="st__label">北向成交总额</div>
        <div class="st__value">
          {{ formatYi(sentiment.northTurnoverYi, 0) }}
        </div>
        <div class="st__note">仅披露总额，无实时净流入</div>
      </div>
      <div class="st__metric">
        <div class="st__label">融资余额</div>
        <div class="st__value">{{ formatYi(sentiment.marginBalanceYi) }}</div>
        <div class="st__note">
          较上周 {{ signedPct(sentiment.marginWoWPct, 2) }}
        </div>
      </div>
    </div>

    <!-- 数据可得性提示 -->
    <div class="st__warn">
      <span class="st__warn-icon">⚠</span>
      <p><b>数据可得性提示：</b>{{ sentiment.northDisclaimer }}</p>
    </div>

    <!-- 盘面时间轴 -->
    <div class="st__timeline">
      <div
        v-for="(item, i) in sentiment.timeline"
        :key="item.time"
        class="st__tl-row"
      >
        <span class="st__tl-time">{{ item.time }}</span>
        <span class="st__tl-rail">
          <i class="st__tl-dot" :class="`st__tl-dot--${item.tone}`"></i>
          <i v-if="i < sentiment.timeline.length - 1" class="st__tl-line"></i>
        </span>
        <div class="st__tl-body">
          <div class="st__tl-title">{{ item.title }}</div>
          <div class="st__tl-desc">{{ item.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.st {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

/* ---- 4 项指标 ---- */
.st__metrics {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.st__label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.st__value {
  margin-top: 1px;
  font-size: 18px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  letter-spacing: -0.3px;
  white-space: nowrap;
}

.st__slash {
  margin: 0 2px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.st__note {
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

/* ---- 提示条 ---- */
.st__warn {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: flex-start;
  padding: 7px 10px;
  background: hsl(32deg 95% 53% / 10%);
  border: 1px solid hsl(32deg 95% 53% / 28%);
  border-radius: 8px;
}

.st__warn-icon {
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 1.4;
  color: hsl(32deg 80% 40%);
}

.st__warn p {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: hsl(32deg 70% 35%);
}

.st__warn b {
  font-weight: 600;
}

/* ---- 时间轴 ---- */
.st__timeline {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.st__tl-row {
  display: flex;
  flex: 1;
  gap: 10px;
  min-height: 0;
}

.st__tl-time {
  flex: 0 0 44px;
  padding-top: 1px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
  text-align: right;
}

.st__tl-rail {
  display: flex;
  flex: 0 0 9px;
  flex-direction: column;
  align-items: center;
}

.st__tl-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-top: 4px;
  border-radius: 50%;
}

.st__tl-dot--up {
  background: hsl(var(--stock-up));
  box-shadow: 0 0 0 3px hsl(var(--stock-up) / 14%);
}

.st__tl-dot--info {
  background: hsl(215deg 85% 55%);
  box-shadow: 0 0 0 3px hsl(215deg 85% 55% / 14%);
}

.st__tl-dot--muted {
  background: hsl(var(--muted-foreground) / 60%);
  box-shadow: 0 0 0 3px hsl(var(--muted-foreground) / 12%);
}

.st__tl-line {
  flex: 1;
  width: 1px;
  margin-top: 3px;
  background: hsl(var(--border) / 70%);
}

.st__tl-body {
  flex: 1;
  min-width: 0;
  padding-bottom: 8px;
}

.st__tl-row:last-child .st__tl-body {
  padding-bottom: 0;
}

.st__tl-title {
  font-size: 12px;
  font-weight: 550;
}

.st__tl-desc {
  margin-top: 1px;
  font-size: 11px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.is-up {
  color: hsl(var(--stock-up));
}

.is-down {
  color: hsl(var(--stock-down));
}
</style>
