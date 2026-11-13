<script lang="ts" setup>
/**
 * 1.2 今日速览
 * ---------------------------------------------------------------------------
 * 布局与视觉对齐设计稿《02_1.2今日速览.html》：
 *   KPI 行（span 12，5 卡）→ 涨榜(6) + 跌榜(6) → 今日成交记录(12)
 *
 * 数据链路（接后端只动第一层，其余不动）：
 *   api/today-overview.ts  → 演示数据 / 真实接口
 *   composables/use-today-overview.ts → data / loading / error / refresh
 *   data/selectors.ts      → DTO 派生 KPI 卡与页脚文案
 *   components/*.vue       → 纯展示，props 即接口契约结构
 */
import { computed } from 'vue';

import { Button } from 'antdv-next';

import CardShell from '../_shared/card-shell.vue';
import KpiStrip from './components/kpi-strip.vue';
import MoverTable from './components/mover-table.vue';
import TradeTable from './components/trade-table.vue';
import { useTodayOverview } from './composables/use-today-overview';
import {
  dataSourceOf,
  gainerFooterOf,
  loserFooterOf,
  subtitleOf,
  syncedModulesOf,
  tradeTotalsOf,
} from './data/selectors';

defineOptions({ name: 'TodayOverview' });

const { data, kpiCards, loading, refresh } = useTodayOverview();

const subtitle = computed(() =>
  data.value
    ? subtitleOf(data.value)
    : '今日成交、持仓涨跌、费用与操作纪律一屏看完',
);

const dataSource = computed(() => (data.value ? dataSourceOf(data.value) : ''));

function onDemoAction(name: string) {
  window.message.info(`【${name}】为演示入口，接入后端后开放`);
}

async function onRefresh() {
  await refresh();
  if (data.value) {
    window.message.success(`已刷新 · 数据同步于 ${data.value.updatedAt}`);
  }
}
</script>

<template>
  <div class="to-page">
    <header class="to-page__head">
      <div class="to-page__title-wrap">
        <h1 class="to-page__title">今日速览</h1>
        <p class="to-page__desc">{{ subtitle }}</p>
      </div>
      <div class="to-page__actions">
        <Button :loading="loading" @click="onRefresh">⟳ 刷新</Button>
        <Button @click="onDemoAction('导出日报')">导出日报</Button>
        <Button type="primary" @click="onDemoAction('开始复盘')">
          开始复盘
        </Button>
      </div>
    </header>

    <div v-if="data" class="to-grid">
      <KpiStrip class="to-grid__item to-grid__item--12" :items="kpiCards" />

      <CardShell class="to-grid__item to-grid__item--6">
        <template #title>
          今日持仓涨跌榜 · <span class="to-up">涨</span>
        </template>
        <template #sub>今日涨幅 TOP5</template>
        <template #actions>
          <button
            class="to-link"
            type="button"
            @click="onDemoAction('全部持仓')"
          >
            全部持仓 ›
          </button>
        </template>
        <MoverTable :rows="data.gainers" empty-text="今日无上涨持仓" />
        <template #footer>{{ gainerFooterOf(data) }}</template>
      </CardShell>

      <CardShell class="to-grid__item to-grid__item--6">
        <template #title>
          今日持仓涨跌榜 · <span class="to-down">跌</span>
        </template>
        <template #sub>今日跌幅 TOP5</template>
        <template #actions>
          <button
            class="to-link"
            type="button"
            @click="onDemoAction('设置预警')"
          >
            设置预警 ›
          </button>
        </template>
        <MoverTable :rows="data.losers" empty-text="今日无下跌持仓" />
        <template #footer>{{ loserFooterOf(data) }}</template>
      </CardShell>

      <CardShell class="to-grid__item to-grid__item--12">
        <template #title>今日成交记录</template>
        <template #sub>
          <span class="to-chip">数据来源：{{ dataSource }}</span>
        </template>
        <template #actions>
          <button
            class="to-link"
            type="button"
            @click="onDemoAction('跳转交易流水')"
          >
            跳转交易流水 ›
          </button>
        </template>
        <TradeTable :rows="data.trades" />
        <template #footer>
          <span>{{ tradeTotalsOf(data) }}</span>
          <span class="to-muted">{{ syncedModulesOf(data) }}</span>
        </template>
      </CardShell>
    </div>

    <div v-else class="to-loading">
      {{ loading ? '正在加载今日速览…' : '暂无数据' }}
    </div>
  </div>
</template>

<style scoped>
.to-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 6px 2px;
}

.to-page__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.to-page__title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.3px;
}

.to-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.to-page__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

/* 头部按钮统一钉高：四页同款，避免主题/继承样式造成高度漂移 */
.to-page__actions :deep(.ant-btn) {
  height: 32px;
  min-height: 32px;
  padding-inline: 15px;
  font-size: 14px;
  line-height: 30px;
  border-radius: 6px;
  box-shadow: none;
}

/* 主按钮也强制同高，并去掉自带下投影（黑主题下呈一条黑边） */
.to-page__actions :deep(.ant-btn-primary),
.to-page__actions :deep(.ant-btn-lg) {
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 15px !important;
  font-size: 14px !important;
  line-height: 30px !important;
  box-shadow: none !important;
}

/* ---- 12 列栅格：KPI 106px（与资产总览一致）/ 涨跌榜 / 成交记录 ---- */
.to-grid {
  display: grid;
  flex: 1;
  grid-template-rows: 106px minmax(0, 1.25fr) minmax(0, 1fr);
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  min-height: 0;
}

.to-grid__item--12 {
  grid-column: span 12;
}

.to-grid__item--6 {
  grid-column: span 6;
}

.to-loading {
  padding: 80px 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

/* ---- 卡片内的小元素 ---- */
.to-up,
.to-down {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 17px;
  padding: 0 5px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 4px;
}

.to-up {
  color: hsl(var(--stock-up));
  background: hsl(var(--stock-up) / 10%);
}

.to-down {
  color: hsl(var(--stock-down));
  background: hsl(var(--stock-down) / 10%);
}

.to-link {
  padding: 0;
  font-size: 11.5px;

  /* 主题安全色：--primary 在深色主题下是黑色，链接需恒定亮色 */
  color: hsl(215deg 85% 55%);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.to-link:hover {
  color: hsl(215deg 85% 45%);
  opacity: 1;
}

.to-chip {
  display: inline-flex;
  padding: 1px 7px;
  font-size: 10.5px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 60%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.to-muted {
  margin-left: auto;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 1200px) {
  .to-grid {
    grid-template-rows: none;
    grid-template-columns: 1fr;
  }

  .to-grid__item--12,
  .to-grid__item--6 {
    grid-column: auto;
  }

  .to-grid__item {
    min-height: 260px;
  }
}
</style>
