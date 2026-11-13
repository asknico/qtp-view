<script lang="ts" setup>
/**
 * 1.3 市场概览
 * ---------------------------------------------------------------------------
 * 布局与视觉对齐设计稿《03_1.3市场概览.html》，风格与资产总览/今日速览统一：
 *   指数行情条（span 12，6 卡）→ 板块热力图(7) + 涨跌家数与量能(5) → 市场情绪与提示(12)
 * 设计稿说明：不含「北向实时净流入」（2024-05 起已取消披露）。
 *
 * 数据链路（接后端只动第一层，其余不动）：
 *   api/market-overview.ts → 演示数据 / 真实接口
 *   composables/use-market-overview.ts → data / loading / error / refresh
 *   data/selectors.ts → DTO 派生视图模型
 *   components/*.vue → 纯展示，props 即接口契约结构
 */
import type { HeatDimension } from './data/types';

import { computed, ref } from 'vue';

import { Button } from 'antdv-next';

import CardShell from '../_shared/card-shell.vue';
import BreadthCard from './components/breadth-card.vue';
import IndexStrip from './components/index-strip.vue';
import SectorHeatmap from './components/sector-heatmap.vue';
import SentimentCard from './components/sentiment-card.vue';
import { useMarketOverview } from './composables/use-market-overview';
import { heatTilesOf } from './data/selectors';

defineOptions({ name: 'MarketOverview' });

const {
  data,
  indexCards,
  loading,
  refresh,
  subtitle,
  turnoverVs5dPct,
  upSharePct,
  volumeBars,
} = useMarketOverview();

/** 热力图维度（行业 / 概念 / 地域） */
const dimension = ref<HeatDimension>('industry');

const heatTiles = computed(() =>
  data.value ? heatTilesOf(data.value, dimension.value) : [],
);

const DIMENSION_LABELS: Record<HeatDimension, string> = {
  concept: '概念',
  industry: '行业',
  region: '地域',
};

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
  <div class="mk-page">
    <header class="mk-page__head">
      <div class="mk-page__title-wrap">
        <h1 class="mk-page__title">市场概览</h1>
        <p class="mk-page__desc">
          {{
            subtitle ||
            '指数行情条常驻、板块热力图、涨跌家数与量能对比；不含北向实时净流入'
          }}
        </p>
      </div>
      <div class="mk-page__actions">
        <Button :loading="loading" @click="onRefresh">⟳ 刷新行情</Button>
        <Button type="primary" @click="onDemoAction('加入自选')">
          加入自选
        </Button>
      </div>
    </header>

    <div v-if="data" class="mk-grid">
      <!-- 指数行情条 -->
      <IndexStrip class="mk-grid__item mk-grid__item--12" :items="indexCards" />

      <!-- 板块热力图 -->
      <CardShell class="mk-grid__item mk-grid__item--7">
        <template #title>板块热力图</template>
        <template #sub>面积=成交额 · 颜色=今日涨跌幅</template>
        <template #actions>
          <div class="mk-seg">
            <button
              v-for="(label, key) in DIMENSION_LABELS"
              :key="key"
              class="mk-seg__item"
              :class="{ 'mk-seg__item--on': dimension === key }"
              type="button"
              @click="dimension = key"
            >
              {{ label }}
            </button>
          </div>
        </template>
        <SectorHeatmap :tiles="heatTiles" />
        <template #footer>
          格子面积按板块成交额占比分配 · 颜色深浅按涨跌幅度分级
        </template>
      </CardShell>

      <!-- 涨跌家数与量能 -->
      <CardShell class="mk-grid__item mk-grid__item--5">
        <template #title>涨跌家数与量能</template>
        <template #sub>全市场</template>
        <BreadthCard
          :breadth="data.breadth"
          :up-share-pct="upSharePct"
          :volume-bars="volumeBars"
        />
        <template #footer>
          上涨占比 = 上涨家数 / 全市场（上涨+下跌+平盘）
        </template>
      </CardShell>

      <!-- 市场情绪与提示 -->
      <CardShell class="mk-grid__item mk-grid__item--12">
        <template #title>市场情绪与提示</template>
        <template #sub>指数条常驻置顶 · 不提供预测</template>
        <SentimentCard
          :limit-down="data.breadth.limitDown"
          :limit-up="data.breadth.limitUp"
          :sentiment="data.sentiment"
          :turnover-vs5d-pct="turnoverVs5dPct"
        />
      </CardShell>
    </div>

    <div v-else class="mk-loading">
      {{ loading ? '正在加载市场概览…' : '暂无数据' }}
    </div>
  </div>
</template>

<style scoped>
.mk-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 6px 2px;
}

.mk-page__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.mk-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.3px;
}

.mk-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.mk-page__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

/* 头部按钮统一钉高：四页同款，避免主题/继承样式造成高度漂移 */
.mk-page__actions :deep(.ant-btn) {
  height: 32px;
  min-height: 32px;
  padding-inline: 15px;
  font-size: 14px;
  line-height: 30px;
  border-radius: 6px;
  box-shadow: none;
}

/* 主按钮也强制同高，并去掉自带下投影（黑主题下呈一条黑边） */
.mk-page__actions :deep(.ant-btn-primary),
.mk-page__actions :deep(.ant-btn-lg) {
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 15px !important;
  font-size: 14px !important;
  line-height: 30px !important;
  box-shadow: none !important;
}

/* ---- 12 列栅格：指数条 106px（与另两页一致）/ 热力与量能 / 情绪 ---- */
.mk-grid {
  display: grid;
  flex: 1;
  grid-template-rows: 106px minmax(0, 1.15fr) minmax(0, 0.95fr);
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  min-height: 0;
}

.mk-grid__item--12 {
  grid-column: span 12;
}

.mk-grid__item--7 {
  grid-column: span 7;
}

.mk-grid__item--5 {
  grid-column: span 5;
}

/* ---- 维度切换器（与净值曲线卡的 seg 同款） ---- */
.mk-seg {
  display: flex;
  padding: 2px;
  background: hsl(var(--muted) / 60%);
  border-radius: 6px;
}

.mk-seg__item {
  padding: 2px 9px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  user-select: none;
  background: none;
  border: none;
  border-radius: 4px;
}

.mk-seg__item--on {
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  box-shadow: 0 1px 2px rgb(16 24 40 / 10%);
}

.mk-loading {
  padding: 80px 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

@media (max-width: 1200px) {
  .mk-grid {
    grid-template-rows: none;
    grid-template-columns: 1fr;
  }

  .mk-grid__item--12,
  .mk-grid__item--7,
  .mk-grid__item--5 {
    grid-column: auto;
    min-height: 260px;
  }

  .mk-grid__item--12 {
    min-height: auto;
  }
}
</style>
