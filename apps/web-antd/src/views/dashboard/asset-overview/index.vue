<script lang="ts" setup>
/**
 * 1.1 资产总览
 * ---------------------------------------------------------------------------
 * 布局与视觉对齐设计稿《01_1.1资产总览.html》：
 *   KPI 行（span 12）→ 净值曲线(8) + 资产配置(4) → 分账户(5) + 目标进度(7)
 * 当前为演示数据（data/demo.ts），接入后端后仅替换数据来源，组件不动。
 */
import { Button } from 'antdv-next';

import CardShell from '../_shared/card-shell.vue';
import AccountsCard from './components/accounts-card.vue';
import AllocationCard from './components/allocation-card.vue';
import GoalsCard from './components/goals-card.vue';
import KpiCards from './components/kpi-cards.vue';
import NavTrendCard from './components/nav-trend-card.vue';
import {
  accountsSyncNote,
  brokerAccounts,
  goalHeaderHint,
  goalItems,
  kpiItems,
  pageDescription,
} from './data/demo';

defineOptions({ name: 'AssetOverview' });

function onDemoAction(name: string) {
  window.message.info(`【${name}】为演示入口，接入后端后开放`);
}
</script>

<template>
  <div class="ao-page">
    <header class="ao-page__head">
      <div class="ao-page__title-wrap">
        <h1 class="ao-page__title">资产总览</h1>
        <p class="ao-page__desc">{{ pageDescription }}</p>
      </div>
      <div class="ao-page__actions">
        <Button @click="onDemoAction('刷新行情')">⟳ 刷新行情</Button>
        <Button @click="onDemoAction('生成快照')">生成快照</Button>
        <Button type="primary" @click="onDemoAction('记一笔交易')">
          ＋ 记一笔交易
        </Button>
      </div>
    </header>

    <div class="ao-grid">
      <KpiCards class="ao-grid__item ao-grid__item--12" :items="kpiItems" />

      <CardShell class="ao-grid__item ao-grid__item--8">
        <template #title>资产净值曲线</template>
        <template #sub>区间与口径可切换</template>
        <NavTrendCard />
      </CardShell>

      <CardShell class="ao-grid__item ao-grid__item--4">
        <template #title>资产配置</template>
        <template #sub>按品种 · 可点击下钻明细 ›</template>
        <AllocationCard />
      </CardShell>

      <CardShell class="ao-grid__item ao-grid__item--5">
        <template #title>分账户资产</template>
        <template #sub>3 个账户</template>
        <AccountsCard :accounts="brokerAccounts" />
        <template #footer>{{ accountsSyncNote }}</template>
      </CardShell>

      <CardShell class="ao-grid__item ao-grid__item--7">
        <template #title>目标与进度</template>
        <template #sub>
          <span class="ao-pill">{{ goalHeaderHint }}</span>
        </template>
        <GoalsCard :items="goalItems" />
      </CardShell>
    </div>
  </div>
</template>

<style scoped>
.ao-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 6px 2px;
}

.ao-page__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.ao-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.3px;
}

.ao-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.ao-page__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

/* 头部按钮统一钉高：四页同款，避免主题/继承样式造成高度漂移 */
.ao-page__actions :deep(.ant-btn) {
  height: 32px;
  min-height: 32px;
  padding-inline: 15px;
  font-size: 14px;
  line-height: 30px;
  border-radius: 6px;
  box-shadow: none;
}

/* 主按钮也强制同高，并去掉自带下投影（黑主题下呈一条黑边） */
.ao-page__actions :deep(.ant-btn-primary),
.ao-page__actions :deep(.ant-btn-lg) {
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 15px !important;
  font-size: 14px !important;
  line-height: 30px !important;
  box-shadow: none !important;
}

.ao-pill {
  padding: 1px 7px;
  font-size: 10.5px;
  font-weight: 500;
  color: hsl(32deg 80% 40%);
  white-space: nowrap;
  background: hsl(32deg 95% 53% / 12%);
  border-radius: 10px;
}

/* ---- 12 列栅格 ---- */
.ao-grid {
  display: grid;
  flex: 1;
  grid-template-rows: 106px minmax(0, 330px) minmax(0, 300px);
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  min-height: 0;
}

.ao-grid__item--12 {
  grid-column: span 12;
}

.ao-grid__item--8 {
  grid-column: span 8;
}

.ao-grid__item--7 {
  grid-column: span 7;
}

.ao-grid__item--5 {
  grid-column: span 5;
}

.ao-grid__item--4 {
  grid-column: span 4;
}

@media (max-width: 1200px) {
  .ao-grid {
    grid-template-rows: none;
    grid-template-columns: 1fr;
  }

  .ao-grid__item--12,
  .ao-grid__item--8,
  .ao-grid__item--7,
  .ao-grid__item--5,
  .ao-grid__item--4 {
    grid-column: auto;
  }

  .ao-grid__item {
    min-height: 260px;
  }
}
</style>
