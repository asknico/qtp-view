<script lang="ts" setup>
import type { AccountOverview } from './data/types';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button } from 'antdv-next';

import CardShell from '#/components/card-shell.vue';

import { fetchBrokerAccountOverview } from './api/broker-accounts';
import AccountDetailCard from './components/account-detail-card.vue';
import AccountKpiRow from './components/account-kpi-row.vue';
import AccountOverviewCard from './components/account-overview-card.vue';
import CreateAccountModal from './components/create-account-modal.vue';
import EditAccountModal from './components/edit-account-modal.vue';
import FeeRateCard from './components/fee-rate-card.vue';
import PoolConfigModal from './components/pool-config-modal.vue';
import SyncAccountModal from './components/sync-account-modal.vue';
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

/** 卡片条容器：圆点切换时用它做平滑滚动 */
const stripEl = ref<HTMLElement | null>(null);

onMounted(async () => {
  await reload();
});

/** 拉取/刷新页面数据（新建、同步完成后都会触发） */
async function reload() {
  const data = await fetchBrokerAccountOverview();
  overview.value = data;
  if (
    !selectedId.value ||
    !data.accounts.some((a) => a.id === selectedId.value)
  ) {
    selectedId.value = activeAccountsOf(data.accounts)[0]?.id ?? '';
  }
}

const activeAccounts = computed(() =>
  overview.value ? activeAccountsOf(overview.value.accounts) : [],
);

/** 页头描述：账户数随数据动态生成，避免与概览卡「N 个」不一致 */
const pageDesc = computed(
  () =>
    `${activeAccounts.value.length} 个启用账户的资产、可用资金、板块权限与分账户费率（全佣 / 净佣口径），休眠账户单独保留备查。`,
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

/* ---- 卡片圆点切换 ----
   一行固定三张可视，多出的卡片靠下方圆点切换：
   圆点数 = 卡片数，黑点为当前选中卡片，点击圆点平滑滚动到对应卡片 */

/** 当前选中卡片在可视卡片中的下标（未选中任何可见卡片时为 -1，全灰） */
const dotIndex = computed(() =>
  activeAccounts.value.findIndex((a) => a.id === selectedId.value),
);

/** 点击圆点：选中该卡片并把它滚动到可视区内（左对齐，不超过最大滚动位） */
function goToDot(index: number) {
  const account = activeAccounts.value[index];
  if (!account) return;
  onSelect(account.id);
  scrollToCard(index);
}

function scrollToCard(index: number) {
  const strip = stripEl.value;
  const card = strip?.children[index] as HTMLElement | undefined;
  if (!strip || !card) return;
  const left =
    card.getBoundingClientRect().left -
    strip.getBoundingClientRect().left +
    strip.scrollLeft;
  const max = strip.scrollWidth - strip.clientWidth;
  strip.scrollTo({ left: Math.min(left, max), behavior: 'smooth' });
}

/** 三个写操作弹窗（对齐设计稿 FORM·2.1-A / SYNC·2.1-B / EDIT·2.1-C） */
const [CreateModal, createModalApi] = useVbenModal({
  connectedComponent: CreateAccountModal,
});
const [SyncModal, syncModalApi] = useVbenModal({
  connectedComponent: SyncAccountModal,
});
const [EditModal, editModalApi] = useVbenModal({
  connectedComponent: EditAccountModal,
});
const [PoolModal, poolModalApi] = useVbenModal({
  connectedComponent: PoolConfigModal,
});

function onCreate() {
  createModalApi.setData({});
  createModalApi.open();
}

function onEdit() {
  if (!currentAccount.value) return;
  editModalApi.setData({ account: currentAccount.value });
  editModalApi.open();
}

/** 券商资金池配置（2.4 券商级一对一）：按账户所属券商打开配置弹窗（同券商多账户共用一个池） */
function onConfigPool(id: string) {
  const account = overview.value?.accounts.find((a) => a.id === id);
  if (!account) return;
  selectedId.value = id;
  poolModalApi.setData({
    broker: { code: account.brokerCode, name: account.broker },
  });
  poolModalApi.open();
}

function onSync() {
  syncModalApi.setData({
    accounts: activeAccounts.value.map((a) => ({
      id: a.id,
      alias: a.alias,
      broker: a.broker,
    })),
  });
  syncModalApi.open();
}
</script>

<template>
  <div class="ba-page">
    <header class="ba-page__head">
      <div class="ba-page__title-wrap">
        <h1 class="ba-page__title">券商账户</h1>
        <p class="ba-page__desc">{{ pageDesc }}</p>
      </div>
      <div class="ba-page__actions">
        <span v-if="overview" class="ba-page__sync">
          <i class="ba-page__dot"></i>{{ overview.syncedAt }}
        </span>
        <Button v-access:code="['acc:sync:exec']" @click="onSync">
          ⟳ 同步账户
        </Button>
        <Button
          v-access:code="['acc:brokerAccount:add']"
          type="primary"
          @click="onCreate"
        >
          ＋ 新增账户
        </Button>
      </div>
    </header>

    <div v-if="overview" class="ba-grid">
      <AccountKpiRow class="ba-grid__kpi" :items="kpiItems" />

      <!-- 账户卡片：一行三张可视，多账户靠下方圆点切换（不折行、无滚动条） -->
      <div class="ba-grid__accounts-wrap">
        <div ref="stripEl" class="ba-grid__accounts">
          <AccountOverviewCard
            v-for="account in activeAccounts"
            :key="account.id"
            class="ba-accounts__card"
            :account="account"
            :selected="account.id === selectedId"
            @config-pool="onConfigPool"
            @select="onSelect"
          />
        </div>
        <div
          v-if="activeAccounts.length > 1"
          class="ba-accounts__dots"
          role="tablist"
          aria-label="账户卡片切换"
        >
          <button
            v-for="(account, i) in activeAccounts"
            :key="account.id"
            class="ba-accounts__dot"
            :class="{ 'is-active': i === dotIndex }"
            type="button"
            role="tab"
            :aria-selected="i === dotIndex"
            :aria-label="account.alias || account.id"
            @click="goToDot(i)"
          ></button>
        </div>
      </div>

      <CardShell class="ba-grid__detail">
        <template #title>账户详情</template>
        <template #sub>{{ currentAccount?.id ?? '—' }}</template>
        <template #actions>
          <button
            v-access:code="['acc:brokerAccount:edit']"
            class="ba-link"
            type="button"
            @click="onEdit"
          >
            编辑
          </button>
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
          @select="onSelect"
        />
      </CardShell>
    </div>

    <!-- 新增账户 / 同步账户 / 编辑账户 / 资金池配置弹窗 -->
    <CreateModal @reload="reload" />
    <SyncModal @reload="reload" />
    <EditModal @reload="reload" />
    <PoolModal @reload="reload" />
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
  font-size: var(--font-page);
  font-weight: var(--font-weight-strong);
  letter-spacing: -0.3px;
}

.ba-page__desc {
  max-width: 820px;
  margin: 4px 0 0;
  font-size: var(--font-body);
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
  font-size: var(--font-small);
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
  font-size: var(--font-base) !important;
  line-height: 30px !important;
  border-radius: 6px;
  box-shadow: none !important;
}

.ba-link {
  padding: 0;
  font-size: var(--font-small);
  color: hsl(var(--primary));
  cursor: pointer;
  background: none;
  border: none;
}

/* ---- 12 列栅格 ----
   KPI 行 104px：图标行 24 + 数字 26 + 提示行 20 + 内边距 19 的实测高度，
   原 96px 在数字升到 26px 后会溢出 1.5px；
   账户卡行 186px：卡片 172 + 间隙 4 + 圆点行 10 */
.ba-grid {
  display: grid;
  flex: 1;
  grid-template-rows: 104px 186px minmax(0, 1fr);
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  min-height: 0;
}

.ba-grid__kpi {
  grid-column: span 12;
}

.ba-grid__accounts-wrap {
  display: flex;
  flex-direction: column;
  grid-column: span 12;
  gap: 4px;
  min-width: 0;
  min-height: 0;
}

.ba-grid__accounts {
  display: flex;
  flex: 1;
  gap: 6px;
  min-height: 0;
  overflow: auto hidden;

  /* 圆点切换取代滚动条：隐藏原生滚动条，仍保留 JS 平滑滚动能力 */
  scrollbar-width: none;
}

.ba-grid__accounts::-webkit-scrollbar {
  display: none;
}

/* 一行固定三张可视：多出的账户由圆点切换，永不折行 */
.ba-accounts__card {
  flex: 0 0 calc((100% - 12px) / 3);
  min-width: 0;
}

.ba-accounts__dots {
  display: flex;
  flex: 0 0 auto;
  gap: 7px;
  align-items: center;
  justify-content: center;
}

.ba-accounts__dot {
  width: 7px;
  height: 7px;
  padding: 0;
  cursor: pointer;
  background: hsl(var(--muted-foreground) / 35%);
  border: none;
  border-radius: 50%;
  transition:
    background-color 0.2s,
    transform 0.2s;
}

.ba-accounts__dot:hover {
  transform: scale(1.25);
}

.ba-accounts__dot.is-active {
  background: hsl(var(--foreground));
  transform: scale(1.15);
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
  .ba-grid__accounts-wrap,
  .ba-grid__detail,
  .ba-grid__rate {
    grid-column: auto;
  }

  /* 窄屏：单张卡片占满可视宽度，仍由圆点切换 */
  .ba-accounts__card {
    flex: 0 0 min(100%, 320px);
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
