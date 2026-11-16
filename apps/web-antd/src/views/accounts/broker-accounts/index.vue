<script lang="ts" setup>
import type { AccountOverview } from './data/types';

import { computed, onMounted, ref } from 'vue';

import { Button } from 'antdv-next';

import CardShell from '../_shared/card-shell.vue';
import { fetchBrokerAccountOverview } from './api/broker-accounts';
import AccountDetailCard from './components/account-detail-card.vue';
import AccountKpiRow from './components/account-kpi-row.vue';
import AccountOverviewCard from './components/account-overview-card.vue';
import FeeRateCard from './components/fee-rate-card.vue';
import { pageDescription } from './data/demo';
import {
  activeAccountsOf,
  feeRowsOf,
  feeSummaryOf,
  kpiItemsOf,
} from './data/selectors';

/**
 * 2.1 券商账户
 * ---------------------------------------------------------------------------
 * 布局对齐设计稿《07_2.1券商账户.html》，与驾驶舱五个页面同一套视觉口径：
 *   KPI 行（span 12）→ 三个账户概览卡（各 span 4，可点选）
 *   → 账户详情（5）+ 分账户费率与口径（7）
 * 数据：api/broker-accounts.ts 走演示数据，接入后端时组件与页面零改动。
 */
defineOptions({ name: 'BrokerAccounts' });

const overview = ref<AccountOverview | null>(null);
const selectedId = ref('');

onMounted(async () => {
  const data = await fetchBrokerAccountOverview();
  overview.value = data;
  selectedId.value = activeAccountsOf(data.accounts)[0]?.id ?? '';
});

const activeAccounts = computed(() =>
  overview.value ? activeAccountsOf(overview.value.accounts) : [],
);

const kpiItems = computed(() =>
  overview.value ? kpiItemsOf(overview.value) : [],
);

const feeRows = computed(() =>
  overview.value ? feeRowsOf(overview.value.accounts) : [],
);

const feeSummary = computed(() =>
  overview.value
    ? feeSummaryOf(overview.value.accounts)
    : {
        maxNetAccountName: '',
        maxNetCommissionRate: 0,
        maxNetEffectiveRate: 0,
        weightedRate: 0,
      },
);

const currentAccount = computed(
  () =>
    overview.value?.accounts.find(
      (account) => account.id === selectedId.value,
    ) ?? null,
);

function onSelect(id: string) {
  if (!id) return;
  selectedId.value = id;
}

function onDemoAction(name: string) {
  window.message.info(`【${name}】为演示入口，接入后端后开放`);
}

function onCreate() {
  onDemoAction('新建账户');
}

function onEdit() {
  onDemoAction(`编辑 ${currentAccount.value?.id ?? ''}`);
}

function onSync() {
  window.message.success(
    `已同步 ${activeAccounts.value.length} 个账户（${overview.value?.syncedAt ?? ''}）`,
  );
}
</script>

<template>
  <div class="ba-page">
    <header class="ba-page__head">
      <div class="ba-page__title-wrap">
        <h1 class="ba-page__title">券商账户</h1>
        <p class="ba-page__desc">{{ pageDescription }}</p>
      </div>
      <div class="ba-page__actions">
        <span v-if="overview" class="ba-page__sync">
          <i class="ba-page__dot"></i>{{ overview.syncedAt }}
        </span>
        <Button @click="onSync">⟳ 同步账户</Button>
        <Button type="primary" @click="onCreate">＋ 新建账户</Button>
      </div>
    </header>

    <div v-if="overview" class="ba-grid">
      <AccountKpiRow class="ba-grid__kpi" :items="kpiItems" />

      <AccountOverviewCard
        v-for="account in activeAccounts"
        :key="account.id"
        class="ba-grid__account"
        :account="account"
        :selected="account.id === selectedId"
        @select="onSelect"
      />

      <CardShell class="ba-grid__detail">
        <template #title>账户详情</template>
        <template #sub>{{ currentAccount?.id ?? '—' }}</template>
        <template #actions>
          <button class="ba-link" type="button" @click="onEdit">编辑</button>
        </template>
        <AccountDetailCard :account="currentAccount" />
      </CardShell>

      <CardShell class="ba-grid__rate" flush>
        <template #title>账户费率与口径</template>
        <template #sub>2026 主流 万 1 – 万 3</template>
        <FeeRateCard
          :rows="feeRows"
          :selected-id="selectedId"
          :summary="feeSummary"
          @create="onCreate"
          @select="onSelect"
        />
      </CardShell>
    </div>
  </div>
</template>

<style scoped>
.ba-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 6px 2px;
}

.ba-page__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.ba-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.3px;
}

.ba-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.ba-page__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

.ba-page__sync {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.ba-page__dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  background: hsl(172deg 62% 42%);
  border-radius: 50%;
}

/* 按钮统一：同高、同基线、无下投影（黑色主按钮边框色由全局 styles/ui.css 统一） */
.ba-page__actions :deep(.ant-btn) {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 15px !important;
  font-size: 14px !important;
  line-height: 30px !important;
  border-radius: 6px;
  box-shadow: none !important;
}

.ba-link {
  padding: 0;
  font-size: 12px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: none;
  border: none;
}

/* ---- 12 列栅格 ---- */
.ba-grid {
  display: grid;
  flex: 1;
  grid-template-rows: 96px 168px minmax(0, 1fr);
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  min-height: 0;
}

.ba-grid__kpi {
  grid-column: span 12;
}

.ba-grid__account {
  grid-column: span 4;
}

.ba-grid__detail {
  grid-column: span 5;
  min-height: 0;
}

.ba-grid__rate {
  grid-column: span 7;
  min-height: 0;
}

@media (max-width: 1200px) {
  .ba-grid {
    grid-template-rows: none;
    grid-template-columns: 1fr;
  }

  .ba-grid__kpi,
  .ba-grid__account,
  .ba-grid__detail,
  .ba-grid__rate {
    grid-column: auto;
  }

  .ba-grid__account {
    min-height: 168px;
  }

  .ba-grid__detail {
    min-height: 420px;
  }

  .ba-grid__rate {
    min-height: 420px;
  }
}
</style>
