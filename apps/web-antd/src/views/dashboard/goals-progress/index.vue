<script lang="ts" setup>
/**
 * 1.4 目标与进度
 * ---------------------------------------------------------------------------
 * 布局与视觉对齐设计稿《04_1.4目标与进度.html》，风格与资产总览/今日速览/市场概览统一：
 *   KPI 行(12) → 年度完成度仪表(4) + 多目标进度(8) → 里程碑记录(12)
 * 图表形态：半环仪表 = SVG（与市场概览「上涨占比」同款做法），
 *           目标进度条 / 里程碑表 = Vue 原生（遵循驾驶舱「进度条用原生组件」约定）。
 * 当前为演示数据（data/demo.ts），接入后端后仅替换数据来源，组件不动。
 */
import { computed } from 'vue';

import { Button } from 'antdv-next';

import CardShell from '../_shared/card-shell.vue';
import GoalsKpiStrip from './components/goals-kpi-strip.vue';
import MilestoneTable from './components/milestone-table.vue';
import TargetBarsCard from './components/target-bars-card.vue';
import YearGaugeCard from './components/year-gauge-card.vue';
import { useGoalsProgress } from './composables/use-goals-progress';

defineOptions({ name: 'GoalsProgress' });

const {
  allOnTrack,
  bars,
  data,
  gaugeDisplays,
  kpis,
  loading,
  milestoneRows,
  milestoneStats,
  refresh,
  subtitle,
  yearRatePct,
} = useGoalsProgress();

const pageDesc =
  '年度 / 月度收益目标、仓位区间、交易频率上限的完成度，以及长期里程碑记录。';

function onDemoAction(name: string) {
  window.message.info(`【${name}】为演示入口，接入后端后开放`);
}

async function onRefresh() {
  await refresh();
  if (data.value) {
    window.message.success(`已刷新 · 数据同步于 ${data.value.updatedAt}`);
  }
}

/** 达成状态徽标文案 */
const trackPill = computed(() =>
  allOnTrack.value ? '全部达标' : '存在超限项',
);
</script>

<template>
  <div class="gp-page">
    <header class="gp-page__head">
      <div class="gp-page__title-wrap">
        <h1 class="gp-page__title">目标进度</h1>
        <p class="gp-page__desc">{{ subtitle || pageDesc }}</p>
      </div>
      <div class="gp-page__actions">
        <Button :loading="loading" @click="onRefresh">⟳ 刷新</Button>
        <Button @click="onDemoAction('调整目标')">调整目标</Button>
        <Button type="primary" @click="onDemoAction('生成月度报告')">
          生成月度报告
        </Button>
      </div>
    </header>

    <div v-if="data" class="gp-grid">
      <!-- KPI 四卡 -->
      <GoalsKpiStrip class="gp-grid__item gp-grid__item--12" :items="kpis" />

      <!-- 年度目标完成度 -->
      <CardShell class="gp-grid__item gp-grid__item--4">
        <template #title>年度目标完成度</template>
        <template #sub>{{ data.tradeDate.slice(0, 4) }} 年度</template>
        <YearGaugeCard
          :done-display="gaugeDisplays.doneDisplay"
          :drawdown-display="gaugeDisplays.drawdownDisplay"
          :rate-pct="yearRatePct"
          :target-display="gaugeDisplays.targetDisplay"
        />
      </CardShell>

      <!-- 多目标进度 -->
      <CardShell class="gp-grid__item gp-grid__item--8">
        <template #title>多目标进度</template>
        <template #sub>实时计算 · 超限标红</template>
        <template #actions>
          <span
            class="gp-pill"
            :class="allOnTrack ? 'gp-pill--ok' : 'gp-pill--warn'"
          >
            {{ trackPill }}
          </span>
        </template>
        <TargetBarsCard :bars="bars" />
      </CardShell>

      <!-- 里程碑记录 -->
      <CardShell class="gp-grid__item gp-grid__item--12" flush>
        <template #title>里程碑记录</template>
        <template #sub>长期目标追踪</template>
        <template #actions>
          <Button size="small" @click="onDemoAction('新建里程碑')">
            ＋ 新建里程碑
          </Button>
        </template>
        <MilestoneTable :rows="milestoneRows" />
        <template #footer>
          里程碑达成后自动写入 9.7 目标达成 · 历史达成率 {{ milestoneStats }}
        </template>
      </CardShell>
    </div>

    <div v-else class="gp-loading">
      {{ loading ? '正在加载目标进度…' : '暂无数据' }}
    </div>
  </div>
</template>

<style scoped>
.gp-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 6px 2px;
}

.gp-page__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.gp-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.3px;
}

.gp-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.gp-page__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

/* 头部按钮统一钉高：四页同款，避免主题/继承样式造成高度漂移 */
.gp-page__actions :deep(.ant-btn) {
  height: 32px;
  min-height: 32px;
  padding-inline: 15px;
  font-size: 14px;
  line-height: 30px;
  border-radius: 6px;
  box-shadow: none;
}

/* 主按钮也强制同高，并去掉自带下投影（黑主题下呈一条黑边） */
.gp-page__actions :deep(.ant-btn-primary),
.gp-page__actions :deep(.ant-btn-lg) {
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 15px !important;
  font-size: 14px !important;
  line-height: 30px !important;
  box-shadow: none !important;
}

/* ---- 12 列栅格：与另三页同节奏（gap 6px / KPI 行钉高） ---- */
.gp-grid {
  display: grid;
  flex: 1;
  grid-template-rows: 96px minmax(0, 258px) minmax(0, 1fr);
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  min-height: 0;
}

.gp-grid__item--12 {
  grid-column: span 12;
}

.gp-grid__item--8 {
  grid-column: span 8;
}

.gp-grid__item--4 {
  grid-column: span 4;
}

/* 达成状态徽标 */
.gp-pill {
  display: inline-flex;
  align-items: center;
  height: 19px;
  padding: 0 7px;
  font-size: 10.5px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 10px;
}

.gp-pill--ok {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

.gp-pill--warn {
  color: hsl(32deg 80% 40%);
  background: hsl(32deg 95% 53% / 12%);
}

.gp-loading {
  padding: 80px 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

@media (max-width: 1200px) {
  .gp-grid {
    grid-template-rows: none;
    grid-template-columns: 1fr;
  }

  .gp-grid__item--12,
  .gp-grid__item--8,
  .gp-grid__item--4 {
    grid-column: auto;
    min-height: 260px;
  }

  .gp-grid__item--12:first-child {
    min-height: auto;
  }
}
</style>
