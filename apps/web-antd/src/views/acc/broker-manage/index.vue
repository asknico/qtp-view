<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';

import type { VxeGridProps } from '#/adapter/vxe-table';
import type {
  BrokerManage,
  BrokerManageSummary,
} from '#/api/acc/broker-manage/model';

import { computed, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { Popconfirm, Space, Tag } from 'antdv-next';
import dayjs from 'dayjs';

import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import {
  brokerManageChangeStatus,
  brokerManageExport,
  brokerManageList,
  brokerManageRemove,
  brokerManageSummary,
} from '#/api/acc/broker-manage';
import { downloadByData } from '#/utils/file/download';

import brokerManageModal from './broker-manage-modal.vue';
import {
  BROKER_STATUS_MAP,
  BROKER_TYPE_MAP,
  columns,
  MARKET_MAP,
  MARKET_OPTIONS,
  querySchema,
} from './data';

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 80,
    componentProps: {
      allowClear: true,
    },
  },
  schema: querySchema(),
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  columns,
  height: 'auto',
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues = {}) => {
        return await brokerManageList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        });
      },
    },
  },
  rowConfig: {
    keyField: 'brokerId',
  },
  id: 'acc-broker-manage-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const [BrokerManageModal, modalApi] = useVbenModal({
  connectedComponent: brokerManageModal,
});

/** 顶部四张统计卡数据 */
const summary = ref<BrokerManageSummary>();

/** 覆盖市场副标题：按市场逐项统计券商数（沪 45 · 深 44 …），统计为 0 的市场不展示 */
const marketStatsText = computed(() => {
  const counts = summary.value?.marketCounts;
  if (!counts) {
    return '沪深北港美去重统计';
  }
  const text = MARKET_OPTIONS.map((o) => ({
    label: o.label.split(' ')[0],
    count: counts[o.value] ?? 0,
  }))
    .filter((m) => m.count > 0)
    .map((m) => `${m.label} ${m.count}`)
    .join(' · ');
  return text || '沪深北港美去重统计';
});

async function loadSummary() {
  summary.value = await brokerManageSummary();
}

function reload() {
  tableApi.query();
  loadSummary();
}

onMounted(loadSummary);

async function handleAdd() {
  // 新建默认排序号 = 当前最大排序号 + 1（实时取汇总，避免页面残留旧值）
  const latest = await brokerManageSummary();
  summary.value = latest;
  modalApi.setData({ nextOrderNum: (latest.maxOrderNum ?? 0) + 1 });
  modalApi.open();
}

async function handleEdit(row: BrokerManage) {
  modalApi.setData({ id: row.brokerId });
  modalApi.open();
}

async function handleChangeStatus(row: BrokerManage) {
  await brokerManageChangeStatus({
    id: row.brokerId,
    brokerStatus: row.brokerStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
  });
  reload();
}

function handleMultiRemove() {
  const rows = tableApi.grid.getCheckboxRecords();
  const ids = rows.map((row: BrokerManage) => row.brokerId);
  window.modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的 ${ids.length} 家券商吗？存在关联账户时将被拒绝。`,
    onOk: async () => {
      await brokerManageRemove(ids);
      reload();
    },
  });
}

async function handleExport() {
  // 勾选行优先：N条 = 勾选条数；未勾选时按当前筛选条件导出（N条 = 命中条数）
  const checkedRows = tableApi.grid.getCheckboxRecords() as BrokerManage[];
  const checkedIds = checkedRows.map((row) => row.brokerId);
  const formValues = await tableApi.formApi.getValues();
  const hide = window.message.loading({
    content: '正在导出券商列表...',
    duration: 9999,
  });
  try {
    // 原生响应：文件名由后端生成（券商管理_{N条}_{yyyyMMddHHmmss}.xlsx），经 download-filename 头下发
    const resp = (await brokerManageExport(formValues, checkedIds)) as {
      data: Blob;
      headers: Record<string, any>;
    };
    const raw = (resp.headers?.['download-filename'] as string) || '';
    const fileName = raw
      ? decodeURIComponent(raw)
      : `券商管理_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    downloadByData(resp.data, fileName);
    window.message.success('导出成功');
  } catch (error) {
    console.error(error);
    window.message.error('导出失败');
  } finally {
    hide();
  }
}
</script>

<template>
  <Page :auto-content-height="true">
    <!-- 顶部四张统计卡：券商总数 / 覆盖市场 / 佣金区间 / 佣金口径分布 -->
    <div class="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">券商总数</div>
        <div class="mt-1 text-xl font-semibold">
          {{ summary?.total ?? '-'
          }}<span class="ml-1 text-xs font-normal text-muted-foreground">家</span>
        </div>
        <div class="mt-0.5 text-xs text-muted-foreground">
          启用 {{ summary?.activeCount ?? 0 }} · 停用
          {{ summary?.inactiveCount ?? 0 }}
        </div>
      </div>
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">覆盖市场</div>
        <div class="mt-1 text-xl font-semibold">
          {{ summary?.marketCount ?? '-'
          }}<span class="ml-1 text-xs font-normal text-muted-foreground">个</span>
        </div>
        <div class="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {{ marketStatsText }}
        </div>
      </div>
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">默认佣金区间</div>
        <div class="mt-1 text-xl font-semibold tabular-nums">
          <template v-if="summary?.minRate != null && summary?.maxRate != null">
            万{{ (summary.minRate * 10_000).toFixed(2) }}–{{
              (summary.maxRate * 10_000).toFixed(2)
            }}
          </template>
          <template v-else>-</template>
        </div>
        <div class="mt-0.5 text-xs text-muted-foreground">
          由各券商档案维护，账户可单独覆盖
        </div>
      </div>
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">佣金口径分布</div>
        <div class="mt-1 text-xl font-semibold tabular-nums">
          {{ summary?.allInCount ?? 0 }}/{{ summary?.total ?? 0 }}
          <span class="ml-1 text-xs font-normal text-muted-foreground">全佣</span>
        </div>
        <div class="mt-0.5 text-xs text-muted-foreground">
          净佣 {{ summary?.netCount ?? 0 }} 家需另叠加规费
        </div>
      </div>
    </div>

    <BasicTable table-title="券商列表">
      <template #toolbar-tools>
        <Space>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['acc:brokerManage:remove']"
            @click="handleMultiRemove"
          >
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            v-access:code="['acc:brokerManage:export']"
            @click="handleExport"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            type="primary"
            v-access:code="['acc:brokerManage:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <template #brokerName="{ row }">
        <span class="font-medium">{{ row.brokerName }}</span>
        <span v-if="row.shortName" class="ml-1.5 text-xs text-gray-400">
          {{ row.shortName }}
        </span>
      </template>
      <template #brokerType="{ row }">
        <Tag>{{ BROKER_TYPE_MAP.get(row.brokerType) ?? row.brokerType }}</Tag>
      </template>
      <template #brokerStatus="{ row }">
        <Tag :color="row.brokerStatus === 'ACTIVE' ? 'success' : 'default'">
          {{ BROKER_STATUS_MAP.get(row.brokerStatus) ?? row.brokerStatus }}
        </Tag>
      </template>
      <template #commissionRate="{ row }">
        <span class="font-medium tabular-nums">{{
          row.commissionRateWan
        }}</span>
        <span class="ml-1 text-xs text-gray-400 tabular-nums">
          {{ row.commissionRate }}
        </span>
      </template>
      <template #commissionMode="{ row }">
        <Tag
          :color="row.commissionMode === 'ALL_IN' ? 'processing' : 'warning'"
        >
          {{ row.commissionModeText }}
        </Tag>
      </template>
      <template #supportMarkets="{ row }">
        <Tag v-for="m in row.supportMarkets" :key="m" class="mr-1!">
          {{ MARKET_MAP.get(m) ?? m }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Space>
          <action-button
            v-access:code="['acc:brokerManage:edit']"
            @click="handleEdit(row)"
          >
            编辑
          </action-button>
          <Popconfirm
            placement="left"
            :title="
              row.brokerStatus === 'ACTIVE'
                ? `确认停用「${row.brokerName}」？停用后新建账户时将无法再选择该券商`
                : `确认启用「${row.brokerName}」？`
            "
            @confirm="handleChangeStatus(row)"
          >
            <action-button
              :danger="row.brokerStatus === 'ACTIVE'"
              v-access:code="['acc:brokerManage:status']"
              @click.stop=""
            >
              {{ row.brokerStatus === 'ACTIVE' ? '停用' : '启用' }}
            </action-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <BrokerManageModal @reload="reload" />
  </Page>
</template>
