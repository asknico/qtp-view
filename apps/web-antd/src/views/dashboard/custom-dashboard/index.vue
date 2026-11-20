<script lang="ts" setup>
/**
 * 1.6 自定义看板
 * ---------------------------------------------------------------------------
 * 布局对齐《06_1.6自定义看板.html》，视觉与另外五个驾驶舱页面统一：
 *   左：顶部四小卡（总资产 / 今日盈亏 / 仓位 / 持仓 TOP）
 *      + 内容卡栅格（净值曲线 / 行业分布 / 今日待办 / 市场热度，列数可配）
 *   右：看板配置（显隐 · 列数 · 参数 · 导出导入）
 *
 * 交互：卡片把手拖拽排序（同分区内）、显隐开关、列数切换、区间切换、
 *       布局保存（localStorage 持久化）/ 恢复默认 / 导出 / 导入。
 * 数据：api/custom-dashboard.ts 走演示数据，组件与页面零改动即可接口化。
 */
import type { DashboardCardKey, DashboardTodoItem } from './data/types';

import { computed } from 'vue';

import { Button } from 'antdv-next';

import CardShell from '#/components/card-shell.vue';

import DashboardCard from './components/dashboard-card.vue';
import HeatCard from './components/heat-card.vue';
import IndustryCard from './components/industry-card.vue';
import LayoutConfigPanel from './components/layout-config-panel.vue';
import MiniCardBody from './components/mini-card-body.vue';
import NavMiniCard from './components/nav-mini-card.vue';
import TodoCard from './components/todo-card.vue';
import { useCustomDashboard } from './composables/use-custom-dashboard';
import { navChartOf } from './data/selectors';

defineOptions({ name: 'CustomDashboard' });

const {
  columns,
  data,
  dirty,
  dragKey,
  draft,
  error,
  exportLayout,
  hiddenCount,
  importLayout,
  loading,
  miniCardOf,
  miniCards,
  moveCard,
  panelCards,
  params,
  resetLayout,
  saveLayout,
  setColumns,
  setNavRange,
  setRefresh,
  toggleVisible,
} = useCustomDashboard();

const pageDesc =
  '拖拽式卡片布局：卡片显隐、列数、参数阈值可配置，布局可导出 / 导入。';

/** 净值区间切换（图内 3M / 6M / 1Y，与右侧「卡片参数 · 净值区间」同源） */
const RANGE_TABS: Array<{ label: string; value: '1y' | '3m' | '6m' }> = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

const navChart = computed(() =>
  data.value ? navChartOf(data.value, params.value.navRange) : null,
);

const visibleCount = computed(
  () => miniCards.value.length + panelCards.value.length,
);

const gridStyle = computed(() => ({
  '--cud-cols': String(columns.value),
}));

function onDragStart(key: DashboardCardKey) {
  dragKey.value = key;
}

function onDragEnd() {
  dragKey.value = '';
}

function onDropCard(key: DashboardCardKey) {
  if (dragKey.value) moveCard(dragKey.value, key);
  dragKey.value = '';
}

function onSave() {
  saveLayout();
  window.message.success('布局已保存，下次进入沿用该布局');
}

function onReset() {
  resetLayout();
  window.message.info('已恢复默认布局，点「保存布局」后生效');
}

function onExport() {
  const blob = new Blob([exportLayout()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `custom-dashboard-layout-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  window.message.success('布局已导出（仅展示配置，不含账户数据）');
}

function onImport(text: string) {
  const message = importLayout(text);
  if (message) {
    window.message.error(message);
    return;
  }
  window.message.success('布局已导入，点「保存布局」后生效');
}

function onTodoAction(item: DashboardTodoItem) {
  window.message.info(`【${item.action ?? '待办'}】为演示入口，接入后端后开放`);
}

function onIndustryAnalysis() {
  window.message.info('【行业分析】为演示入口，接入后端后开放');
}

function onToggle(key: DashboardCardKey) {
  const card = data.value?.cards.find((item) => item.key === key);
  if (card) toggleVisible(card);
}
</script>

<template>
  <div class="cud-page">
    <header class="cud-page__head">
      <div class="cud-page__title-wrap">
        <h1 class="cud-page__title">自定义看板</h1>
        <p class="cud-page__desc">{{ pageDesc }}</p>
      </div>
      <div class="cud-page__actions">
        <span v-if="dirty" class="cud-dirty">草稿未保存</span>
        <Button @click="onReset">恢复默认</Button>
        <Button :disabled="!dirty" type="primary" @click="onSave">
          保存布局
        </Button>
      </div>
    </header>

    <div v-if="data && draft" class="cud-body">
      <div class="cud-main">
        <div class="cud-mini" :class="{ 'cud-mini--single': columns === 1 }">
          <DashboardCard
            v-for="card in miniCards"
            :key="card.key"
            :card-key="card.key"
            :dragging="dragKey === card.key"
            :hint="card.hint"
            :label="card.label"
            dense
            @drag-end="onDragEnd"
            @drag-start="onDragStart"
            @drop-card="onDropCard"
          >
            <MiniCardBody :card="miniCardOf(card.key)" />
          </DashboardCard>
        </div>

        <div class="cud-panels" :style="gridStyle">
          <DashboardCard
            v-for="card in panelCards"
            :key="card.key"
            :card-key="card.key"
            :dragging="dragKey === card.key"
            :hint="card.hint"
            :label="card.label"
            @drag-end="onDragEnd"
            @drag-start="onDragStart"
            @drop-card="onDropCard"
          >
            <template #extra>
              <span
                v-if="card.key === 'industry'"
                class="cud-link"
                @click="onIndustryAnalysis"
              >
                分析 ›
              </span>
              <span v-else-if="card.key === 'navTrend'" class="cud-seg">
                <button
                  v-for="tab in RANGE_TABS"
                  :key="tab.value"
                  class="cud-seg__btn"
                  :class="{ 'cud-seg__btn--on': params.navRange === tab.value }"
                  type="button"
                  @click="setNavRange(tab.value)"
                >
                  {{ tab.label }}
                </button>
              </span>
            </template>

            <NavMiniCard
              v-if="card.key === 'navTrend' && navChart"
              :chart="navChart"
            />
            <IndustryCard
              v-else-if="card.key === 'industry'"
              :data="data.industry"
            />
            <TodoCard
              v-else-if="card.key === 'todo'"
              :items="data.todos"
              @action="onTodoAction"
            />
            <HeatCard
              v-else-if="card.key === 'marketHeat'"
              :data="data.marketHeat"
            />
          </DashboardCard>
        </div>

        <div v-if="visibleCount === 0" class="cud-empty">
          所有卡片已隐藏，可在右侧「看板配置」重新开启。
        </div>
      </div>

      <CardShell class="cud-side">
        <template #title>看板配置</template>
        <template #sub>拖拽排序 · 卡片可隐藏</template>
        <template #actions>
          <span class="cud-count">显示 {{ visibleCount }} 张</span>
        </template>

        <LayoutConfigPanel
          :cards="data.cards"
          :layout="draft"
          :params="params"
          @export="onExport"
          @import-layout="onImport"
          @set-columns="setColumns"
          @set-range="setNavRange"
          @set-refresh="setRefresh"
          @toggle="onToggle"
        />

        <template #footer>
          <span>已隐藏 {{ hiddenCount }} 张</span>
          <span class="cud-side__right">
            快照 {{ data.tradeDate }} {{ data.updatedAt }} · 行情
            {{ data.quoteTime }} 收盘
          </span>
        </template>
      </CardShell>
    </div>

    <div v-else class="cud-loading">
      {{ loading ? '正在加载看板…' : error || '暂无数据' }}
    </div>
  </div>
</template>

<style scoped>
.cud-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 14px 6px 2px;
}

.cud-page__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.cud-page__title {
  margin: 0;
  font-size: var(--font-page);
  font-weight: var(--font-weight-strong);
  letter-spacing: -0.3px;
}

.cud-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
}

.cud-page__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

/* 按钮统一：同高、同基线、无下投影（黑色主按钮边框色由全局 styles/ui.css 统一） */
.cud-page__actions :deep(.ant-btn) {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 15px !important;
  font-size: var(--font-base) !important;
  line-height: 30px !important;
  border-radius: 6px;
  box-shadow: none !important;
}

.cud-dirty {
  padding: 1px 7px;
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  color: hsl(32deg 80% 40%);
  white-space: nowrap;
  background: hsl(32deg 95% 53% / 12%);
  border-radius: 10px;
}

.cud-body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 6px;
  align-items: start;
  min-height: 0;
}

.cud-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cud-mini {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.cud-mini--single {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 迷你卡 116px：标题行 33 + 正文内边距 16 + 数值 21 + 说明两行 36 的实测高度。
   原来 108px 在数值升到 18px 后只剩 2px 余量，容易把副行压掉 */
.cud-mini > * {
  height: 116px;
}

.cud-panels {
  display: grid;
  grid-template-columns: repeat(var(--cud-cols, 2), minmax(0, 1fr));
  gap: 6px;
}

.cud-panels > * {
  min-height: 236px;
}

.cud-side {
  position: sticky;
  top: 0;
}

.cud-side__right {
  margin-left: auto;
}

.cud-count {
  padding: 1px 7px;
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  background: hsl(var(--muted) / 60%);
  border-radius: 10px;
}

.cud-link {
  font-size: var(--font-small);
  color: hsl(215deg 85% 55%);
  white-space: nowrap;
  cursor: pointer;
}

.cud-seg {
  display: inline-flex;
  gap: 2px;
  padding: 1px;
  background: hsl(var(--muted) / 60%);
  border-radius: 6px;
}

.cud-seg__btn {
  padding: 1px 7px;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 5px;
}

.cud-seg__btn--on {
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  box-shadow: 0 1px 2px rgb(16 24 40 / 8%);
}

.cud-empty {
  padding: 40px 0;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  text-align: center;
  border: 1px dashed hsl(var(--border));
  border-radius: 12px;
}

.cud-loading {
  padding: 80px 0;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  text-align: center;
}

@media (max-width: 1200px) {
  .cud-body {
    grid-template-columns: 1fr;
  }

  .cud-side {
    position: static;
  }

  .cud-mini {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cud-panels {
    grid-template-columns: 1fr;
  }
}
</style>
