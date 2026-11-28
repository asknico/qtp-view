<script setup lang="ts">
import type { EChartsOption } from 'echarts';

import type { VbenFormProps } from '@vben/common-ui';
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { VxeGridProps } from '#/adapter/vxe-table';
import type {
  BankCardOption,
  BankTransfer,
  BankTransferSummary,
  DepositPlan,
} from '#/api/acc/bank-transfer/model';
import type { AccountOption } from '#/api/acc/cash-flow/model';

import { computed, onMounted, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Popconfirm, Space, Tag } from 'antdv-next';
import dayjs from 'dayjs';

import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import {
  bankTransferAccountOptions,
  bankTransferBankCardOptions,
  bankTransferExport,
  bankTransferList,
  bankTransferMonthlyChart,
  bankTransferRemove,
  bankTransferSummary,
  depositPlanCurrent,
  depositPlanRemove,
} from '#/api/acc/bank-transfer';
import { downloadByData } from '#/utils/file/download';

import bankTransferImportModal from './bank-transfer-import-modal.vue';
import { columns, querySchema, SOURCE_TYPE_MAP } from './data';
import depositPlanModal from './deposit-plan-modal.vue';
import transferModal from './transfer-modal.vue';

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 80,
    componentProps: {
      allowClear: true,
    },
  },
  schema: querySchema(),
  // 4 个筛选项 + 操作按钮（重置/搜索）同行：占满 5 列网格
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
  showCollapseButton: false,
};

const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  columns,
  /** 高度自适应行数（不设固定 height，避免少量数据时大片留白） */
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues = {}) => {
        // 账户是整页唯一筛选维度：未就绪时先返回空页，避免闪现全账户数据
        if (!currentAccount.value) {
          listTotal.value = 0;
          return { rows: [], total: 0 };
        }
        const { transferDateRange, ...rest } = formValues as Record<
          string,
          any
        >;
        const resp = await bankTransferList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          accountCode: currentAccount.value,
          beginDate: transferDateRange?.[0],
          endDate: transferDateRange?.[1],
          ...rest,
        });
        // 当前账户+筛选条件下的总条数（导出按钮置灰判断、文件名 N 条用）
        listTotal.value = resp?.total ?? 0;
        return resp;
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'acc-bank-transfer-index',
  showFooter: true,
  /** 合计行（设计稿口径）：本页转入 − 转出 = 净入金；注意必须返回二维数组（每行一个数组） */
  footerMethod: ({ columns, data }) => {
    const net = data.reduce(
      (acc, row: any) =>
        acc +
        (row.transferType === 'IN_TRANSFER'
          ? Number(row.amount ?? 0)
          : -Number(row.amount ?? 0)),
      0,
    );
    return [
      columns.map((col, idx) => {
        if (idx === 0) {
          return '本页合计';
        }
        if (col.field === 'signedAmount') {
          return `${net >= 0 ? '+' : '-'}${money(Math.abs(net))}`;
        }
        if (col.field === 'remark') {
          return '净入金';
        }
        return '';
      }),
    ];
  },
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const [TransferModal, transferModalApi] = useVbenModal({
  connectedComponent: transferModal,
});

const [TransferImportModal, importModalApi] = useVbenModal({
  connectedComponent: bankTransferImportModal,
});

const [PlanModal, planModalApi] = useVbenModal({
  connectedComponent: depositPlanModal,
});

/** 券商账户切换（整页唯一筛选维度）：账户选项 + 当前选中账户 */
const accountOptions = ref<AccountOption[]>([]);
const currentAccount = ref<string>();

/** 当前账户信息（页头上下文条展示） */
const currentAccountInfo = computed(() =>
  accountOptions.value.find((o) => o.accountCode === currentAccount.value),
);

/** 当前账户关联银行卡（上下文条展示） */
const accountCards = ref<BankCardOption[]>([]);

/** 右侧「累计净入金」卡数据 */
const summary = ref<BankTransferSummary>();

/** 当前账户+筛选条件下的记录总条数（导出按钮置灰、导出文件名用） */
const listTotal = ref(0);

/** 右侧「入金计划」卡数据（null = 无计划，undefined = 加载中） */
const plan = ref<DepositPlan | null | undefined>(undefined);

async function loadSummary() {
  summary.value = await bankTransferSummary(currentAccount.value);
}

async function loadPlan() {
  plan.value = await depositPlanCurrent(currentAccount.value);
}

async function loadAccountCards() {
  accountCards.value = currentAccount.value
    ? await bankTransferBankCardOptions(currentAccount.value)
    : [];
}

function reload() {
  tableApi.query();
  loadSummary();
  loadPlan();
  loadCharts();
  loadAccountCards();
}

/** 切换券商账户：整页数据（记录 / 汇总 / 计划 / 曲线）联动刷新 */
function switchAccount(code: string) {
  if (code === currentAccount.value) return;
  currentAccount.value = code;
}

watch(currentAccount, () => reload());

onMounted(async () => {
  const options = await bankTransferAccountOptions();
  accountOptions.value = options.filter((o) => o.accountStatus === 'ACTIVE');
  // 默认选中第一个启用账户（watch 触发整页加载）；无账户时也要走一次空态加载
  if (accountOptions.value.length > 0) {
    currentAccount.value = accountOptions.value[0]?.accountCode;
  } else {
    reload();
  }
});

function handleAddPlan() {
  planModalApi.setData({ accountCode: currentAccount.value });
  planModalApi.open();
}

function handleEditPlan() {
  if (plan.value) {
    planModalApi.setData({ ...plan.value });
    planModalApi.open();
  }
}

async function handleRemovePlan() {
  if (plan.value) {
    await depositPlanRemove(plan.value.id);
    window.message.success('入金计划已删除');
    loadPlan();
  }
}

function handleAdd() {
  transferModalApi.setData({ accountCode: currentAccount.value });
  transferModalApi.open();
}

function handleImport() {
  // 归属账户锁定为页头所选券商账户，弹窗内不可变更
  importModalApi.setData({ accountCode: currentAccount.value });
  importModalApi.open();
}

function handleEdit(row: BankTransfer) {
  transferModalApi.setData({ id: row.id });
  transferModalApi.open();
}

async function handleRemove(row: BankTransfer) {
  await bankTransferRemove([row.id]);
  reload();
}

function handleMultiRemove() {
  const rows = tableApi.grid.getCheckboxRecords() as BankTransfer[];
  const editableRows = rows.filter((row) => row.editable);
  if (editableRows.length === 0) {
    window.message.warning('勾选中无可删除的手工转账（导入/系统转账不可删除）');
    return;
  }
  window.modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的 ${editableRows.length} 条手工转账吗？导入/系统转账将自动跳过。`,
    onOk: async () => {
      await bankTransferRemove(editableRows.map((row) => row.id));
      reload();
    },
  });
}

async function handleExport() {
  // 勾选行优先：N条 = 勾选条数；未勾选时按当前筛选条件导出
  const checkedRows = tableApi.grid.getCheckboxRecords() as BankTransfer[];
  const checkedIds = checkedRows.map((row) => row.id);
  const formValues = await tableApi.formApi.getValues();
  const { transferDateRange, ...rest } = formValues as Record<string, any>;
  const hide = window.message.loading({
    content: '正在导出转账记录...',
    duration: 9999,
  });
  try {
    // 原生响应：文件名由后端生成（银证转账_{N条}_{yyyyMMddHHmmss}.xlsx），经 download-filename 头下发
    const resp = (await bankTransferExport(
      {
        accountCode: currentAccount.value,
        beginDate: transferDateRange?.[0],
        endDate: transferDateRange?.[1],
        ...rest,
      },
      checkedIds,
    )) as { data: Blob; headers: Record<string, any> };
    const raw = (resp.headers?.['download-filename'] as string) || '';
    // 后端文件名：银证转账_{券商名称}_{N条}_{ts}.xlsx；响应头缺失时本地兜底拼接
    const fileName = raw
      ? decodeURIComponent(raw)
      : `银证转账_${currentAccountInfo.value?.brokerName || ''}_${
          checkedIds.length > 0 ? checkedRows.length : listTotal.value
        }条_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    downloadByData(resp.data, fileName);
    window.message.success('导出成功');
  } catch (error) {
    console.error(error);
    window.message.error('导出失败');
  } finally {
    hide();
  }
}

/** ===== 累计净入金卡：迷你走势 sparkline ===== */

/** ===== 累计净入金曲线（月度 → 累计） ===== */

type CurveMode = 'cumIn' | 'cumNet' | 'cumOut';
const curveMode = ref<CurveMode>('cumNet');

const monthlyData = ref<
  Array<{
    inAmount: number;
    month: string;
    netAmount: number;
    outAmount: number;
  }>
>([]);

const curveChartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(curveChartRef);

/** 涨红跌绿：累计转入红 / 累计转出绿 / 净入金主色蓝 */
const COLOR_UP = '#dc2626';
const COLOR_DOWN = '#16a34a';
const COLOR_PRIMARY = '#3b6ef5';

const CURVE_MODES: Array<{ label: string; value: CurveMode }> = [
  { label: '净入金', value: 'cumNet' },
  { label: '累计转入', value: 'cumIn' },
  { label: '累计转出', value: 'cumOut' },
];

async function loadCharts() {
  const endMonth = dayjs().format('YYYY-MM');
  const beginMonth = dayjs().subtract(11, 'month').format('YYYY-MM');
  // 后端 BigDecimal 序列化为字符串，统一转数字（否则 SVG 计算产生 NaN）
  const monthly =
    (await bankTransferMonthlyChart(
      beginMonth,
      endMonth,
      currentAccount.value,
    )) ?? [];
  monthlyData.value = monthly.map((p) => ({
    ...p,
    inAmount: Number(p.inAmount),
    outAmount: Number(p.outAmount),
    netAmount: Number(p.netAmount),
  }));
}

/** 月度累计序列（Number 兜底：后端金额可能为字符串） */
function cumulative(values: Array<number | string>): number[] {
  let acc = 0;
  return values.map((v) => (acc += Number(v) || 0));
}

/** 迷你 sparkline（96×36，累计净入金缩略走势，设计稿口径） */
const sparkPath = computed(() => {
  const values = cumulative(monthlyData.value.map((p) => p.netAmount));
  if (values.length === 0) {
    return { area: '', line: '' };
  }
  const w = 96;
  const h = 36;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    area: `0,${h} ${pts.join(' ')} ${w},${h}`,
    line: pts.join(' '),
  };
});

const curveData = computed(() => {
  const points = monthlyData.value;
  return {
    labels: points.map((p) => `${p.month.slice(5)}月`),
    values: cumulative(
      points.map((p) =>
        curveMode.value === 'cumIn'
          ? p.inAmount
          : (curveMode.value === 'cumOut'
            ? p.outAmount
            : p.netAmount),
      ),
    ),
  };
});

const curveColor = computed(() => {
  if (curveMode.value === 'cumIn') return COLOR_UP;
  if (curveMode.value === 'cumOut') return COLOR_DOWN;
  return COLOR_PRIMARY;
});

const curveOption = computed<EChartsOption>(() => {
  const { labels, values } = curveData.value;
  return {
    grid: { bottom: 24, left: 8, right: 16, top: 24, containLabel: true },
    series: [
      {
        areaStyle: { opacity: 0.12 },
        data: values,
        itemStyle: { color: curveColor.value },
        lineStyle: { width: 2 },
        name: CURVE_MODES.find((m) => m.value === curveMode.value)?.label,
        showSymbol: false,
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      valueFormatter: (v: unknown) => `${(Number(v) / 10_000).toFixed(2)} 万`,
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { color: '#98a3b5', fontSize: 12 },
      axisLine: { lineStyle: { color: '#cfd7e3' } },
      data: labels,
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        color: '#98a3b5',
        fontSize: 12,
        formatter: (v: number) => `${(v / 10_000).toFixed(1)}万`,
      },
      splitLine: { lineStyle: { color: '#eef1f6' } },
      type: 'value',
    },
  };
});

function switchCurve(mode: CurveMode) {
  curveMode.value = mode;
}

watch(
  [monthlyData, curveMode],
  () => {
    if (monthlyData.value.length > 0) renderEcharts(curveOption.value);
  },
  { immediate: true },
);

/** 金额格式：千分位 + 2 位小数 */
function money(value: null | number | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 净入金格式：带 +/- 符号（正数前加 +，负数前加 -） */
function signedMoney(value: null | number | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  const num = Number(value);
  return `${num >= 0 ? '+' : '-'}${money(Math.abs(num))}`;
}

/** 净入金颜色：正数红 / 负数绿（A股涨跌配色惯例） */
function netColorClass(value: null | number | undefined): string {
  const num = Number(value ?? 0);
  return num > 0 ? 'text-red-600' : (num < 0 ? 'text-green-600' : '');
}
</script>

<template>
  <Page>
    <!-- 页头：标题 + 描述 + 主操作（设计稿口径） -->
    <div class="mb-3 flex items-start justify-between gap-4">
      <div>
        <div class="text-lg font-semibold">银证转账</div>
        <div class="mt-0.5 text-xs text-muted-foreground">
          转账记录、累计净入金（算真实收益率的前提）与定投入金计划；整页数据随所选
          券商账户联动，转账窗口按 2026-07-06 新规 07:35–16:00。
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <!-- 券商账户切换：整页唯一筛选维度 -->
        <div
          class="flex items-center overflow-hidden rounded-md border border-border bg-card"
        >
          <span
            class="h-8 border-r border-border bg-muted px-2.5 text-xs leading-8 text-muted-foreground"
          >
            券商账户
          </span>
          <button
            v-for="acc in accountOptions"
            :key="acc.accountCode"
            type="button"
            class="h-8 border-r border-border px-3 text-xs transition-colors last:border-r-0"
            :class="
              acc.accountCode === currentAccount
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted'
            "
            @click="switchAccount(acc.accountCode)"
          >
            {{ acc.displayName }}
          </button>
          <span
            v-if="accountOptions.length === 0"
            class="px-3 text-xs text-muted-foreground"
          >
            暂无启用账户
          </span>
        </div>
        <a-button
          v-access:code="['acc:bankBrokerTransfer:add']"
          @click="handleAdd"
        >
          登记转账
        </a-button>
        <a-button
          type="primary"
          v-access:code="['acc:bankBrokerTransfer:add']"
          @click="plan ? handleEditPlan() : handleAddPlan()"
        >
          {{ plan ? '修改入金计划' : '＋ 新建入金计划' }}
        </a-button>
      </div>
    </div>

    <!-- 账户上下文条：说明整页数据范围 -->
    <div
      class="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3.5 py-2 text-xs"
    >
      <span class="rounded bg-muted px-2 py-0.5 text-muted-foreground">
        {{ currentAccountInfo?.brokerName || '券商' }}
      </span>
      <b>
        {{ currentAccountInfo?.accountName || '未选择账户' }}
        <template v-if="currentAccountInfo?.accountNo">
          · {{ currentAccountInfo.accountNo }}
        </template>
      </b>
      <span v-if="accountCards.length > 0" class="text-muted-foreground">
        关联银行卡：{{
          accountCards
            .map((c) => `${c.bankName} ${c.bankCardNo?.slice(-4) ?? ''}`)
            .join(' · ')
        }}
      </span>
      <span class="rounded bg-muted px-2 py-0.5 text-muted-foreground">
        状态
        {{
          currentAccountInfo?.accountStatus === 'ACTIVE'
            ? '正常'
            : (currentAccountInfo?.accountStatus ?? '—')
        }}
      </span>
      <span
        class="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary"
      >
        <i class="h-1.5 w-1.5 rounded-full bg-primary"></i>
        整页联动：下方记录 / 累计净入金 / 入金计划 / 曲线均为「{{
          currentAccountInfo?.accountName || '—'
        }}」数据
      </span>
    </div>

    <!-- 转账记录 + 右侧累计净入金 / 入金计划 -->
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-12">
      <div class="self-start lg:col-span-9">
        <BasicTable table-title="银证转账记录">
          <template #toolbar-tools>
            <Space>
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                <i class="h-1.5 w-1.5 rounded-full bg-primary"></i>
                已锁定
                {{ currentAccountInfo?.accountName || '—' }}（账户在页头切换）
              </span>
              <a-button
                :disabled="!vxeCheckboxChecked(tableApi)"
                danger
                type="primary"
                v-access:code="['acc:bankBrokerTransfer:remove']"
                @click="handleMultiRemove"
              >
                {{ $t('pages.common.delete') }}
              </a-button>
              <a-button
                :disabled="listTotal === 0"
                v-access:code="['acc:bankBrokerTransfer:export']"
                @click="handleExport"
              >
                导出
              </a-button>
              <a-button
                v-access:code="['acc:bankBrokerTransfer:import']"
                @click="handleImport"
              >
                导入
              </a-button>
            </Space>
          </template>
          <template #transferDate="{ row }">
            <span class="tabular-nums">{{ row.transferDate }}</span>
            <span
              class="ml-1 text-xs tabular-nums"
              :class="
                row.transferTime ? 'text-gray-400' : 'text-gray-300 italic'
              "
            >
              {{ row.transferTime || '--:--' }}
            </span>
          </template>
          <template #transferType="{ row }">
            <Tag :color="row.transferType === 'IN_TRANSFER' ? 'red' : 'green'">
              {{ row.transferType === 'IN_TRANSFER' ? '转入' : '转出' }}
            </Tag>
          </template>
          <template #signedAmount="{ row }">
            <span
              class="font-medium tabular-nums"
              :class="
                row.transferType === 'IN_TRANSFER'
                  ? 'text-red-600'
                  : 'text-green-600'
              "
            >
              {{ row.transferType === 'IN_TRANSFER' ? '+' : '-'
              }}{{ money(row.amount) }}
            </span>
          </template>
          <template #bankCard="{ row }">
            <span v-if="row.bankName" class="tabular-nums">
              {{ row.bankName }}
              <span v-if="row.bankCardNo" class="text-xs text-gray-400">
                {{ row.bankCardNo }}
              </span>
            </span>
            <span v-else class="text-gray-300">-</span>
          </template>
          <template #balanceAfter="{ row }">
            <!-- 手工转账不伪造余额（设计口径：余额由券商同步/对账单导入维护） -->
            <span
              v-if="row.balanceAfter !== null && row.balanceAfter !== undefined"
              class="tabular-nums"
            >
              {{ money(row.balanceAfter) }}
            </span>
            <span v-else class="text-xs text-gray-400">待同步</span>
          </template>
          <template #remark="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else class="text-gray-300">-</span>
          </template>
          <template #sourceType="{ row }">
            <Tag
              :color="
                row.sourceType === 'MANUAL'
                  ? 'processing'
                  : row.sourceType === 'IMPORT'
                    ? 'default'
                    : 'warning'
              "
            >
              {{ SOURCE_TYPE_MAP.get(row.sourceType) ?? row.sourceTypeName }}
            </Tag>
          </template>
          <template #action="{ row }">
            <Space>
              <template v-if="row.editable">
                <action-button
                  v-access:code="['acc:bankBrokerTransfer:edit']"
                  @click="handleEdit(row)"
                >
                  编辑
                </action-button>
                <Popconfirm
                  placement="left"
                  :title="`确认删除这条手工转账（${row.transferDate} ${money(row.amount)}）？`"
                  @confirm="handleRemove(row)"
                >
                  <action-button
                    danger
                    v-access:code="['acc:bankBrokerTransfer:remove']"
                    @click.stop=""
                  >
                    删除
                  </action-button>
                </Popconfirm>
              </template>
              <span v-else class="text-xs text-gray-300">只读</span>
            </Space>
          </template>
        </BasicTable>
        <!-- 表底：累计净入金（建仓至今）—— 设计稿口径 -->
        <div class="mt-1 px-2 text-xs text-muted-foreground">
          累计净入金（建仓至今）
          <span
            class="ml-1 font-semibold tabular-nums"
            :class="netColorClass(summary?.cumulativeNetAmount)"
          >
            {{ signedMoney(summary?.cumulativeNetAmount) }}
          </span>
          — 算真实收益率的前提
        </div>
      </div>

      <div class="flex flex-col gap-3 lg:col-span-3">
        <!-- 累计净入金（建仓至今，影响 XIRR） -->
        <div
          class="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
        >
          <div class="flex items-baseline justify-between">
            <div class="text-sm font-medium">累计净入金</div>
            <div class="text-xs text-muted-foreground">
              {{ summary?.sinceMonth ?? '—' }} 建仓至今 · 影响 XIRR
            </div>
          </div>
          <div class="mt-2 flex items-end justify-between gap-2">
            <div class="min-w-0">
              <div
                class="text-2xl font-semibold tabular-nums"
                :class="netColorClass(summary?.cumulativeNetAmount)"
              >
                {{ signedMoney(summary?.cumulativeNetAmount) }}
              </div>
              <div
                class="mt-1 truncate text-xs text-muted-foreground tabular-nums"
              >
                累计转入
                <span class="text-red-600">{{
                  money(summary?.cumulativeInAmount)
                }}</span>
                · 转出
                <span class="text-green-600">{{
                  money(summary?.cumulativeOutAmount)
                }}</span>
              </div>
            </div>
            <!-- 迷你走势：近 12 个月累计净入金缩略（96×36） -->
            <svg
              v-if="sparkPath.line"
              width="96"
              height="36"
              class="shrink-0"
              viewBox="0 0 96 36"
            >
              <polygon :points="sparkPath.area" fill="#3b6ef5" opacity="0.1" />
              <polyline
                :points="sparkPath.line"
                fill="none"
                stroke="#3b6ef5"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="mt-2 space-y-1 border-t border-border pt-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ new Date().getFullYear() }} 年净入金
              </span>
              <span
                class="font-medium tabular-nums"
                :class="netColorClass(summary?.yearNetInflow)"
              >
                {{ signedMoney(summary?.yearNetInflow) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">月均净入金</span>
              <span class="font-medium tabular-nums">
                {{ money(summary?.avgMonthlyInflow) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">出入金次数</span>
              <span class="font-medium tabular-nums">
                {{ summary?.transferCount ?? 0 }} 次
              </span>
            </div>
          </div>
        </div>

        <!-- 入金计划（定投执行进度，设计稿口径） -->
        <div
          class="flex-1 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
        >
          <div class="flex items-baseline justify-between">
            <div class="text-sm font-medium">入金计划</div>
            <div class="text-xs text-muted-foreground">
              <template v-if="plan">
                定投执行 · 下一笔 {{ plan.nextExecutionDate.slice(5) }} 08:00
              </template>
              <template v-else>
                转账窗口按 2026-07-06 新规 07:35–16:00
              </template>
            </div>
          </div>

          <template v-if="plan">
            <!-- 计划概要：每月定投 ¥5,000 · 每月1日 · 工商银行 8821 -->
            <div class="mt-2 flex items-center gap-1.5 text-xs">
              <Tag color="processing">{{ plan.planName || '每月定投' }}</Tag>
              <span class="font-semibold tabular-nums">
                ¥ {{ money(plan.amount) }}
              </span>
              <span class="truncate text-muted-foreground">
                · 每月{{ plan.executeDay }}日
                <template v-if="plan.bankName">
                  · {{ plan.bankName }}
                  {{ plan.bankCardNo?.slice(-4) }}
                </template>
              </span>
              <span class="ml-auto flex shrink-0 items-center">
                <!-- 编辑入口统一走页头「修改入金计划」，卡片内只保留删除 -->
                <Popconfirm
                  placement="left"
                  title="确认删除该入金计划？"
                  @confirm="handleRemovePlan"
                >
                  <a-button
                    type="link"
                    size="small"
                    danger
                    class="px-1!"
                    v-access:code="['acc:bankBrokerTransfer:remove']"
                  >
                    删除
                  </a-button>
                </Popconfirm>
              </span>
            </div>

            <!-- 近两期执行进度（上一月 / 当月） -->
            <div class="mt-2 space-y-2.5">
              <div v-for="p in plan.periods" :key="p.month">
                <div class="flex items-center justify-between text-xs">
                  <span>{{ Number(p.month.slice(5)) }} 月定投</span>
                  <span
                    class="text-muted-foreground tabular-nums"
                    :class="p.status === 'COMPLETED' ? 'text-green-600' : ''"
                  >
                    <template v-if="p.status === 'COMPLETED'">
                      已完成 {{ p.completedDate?.slice(5) }}
                    </template>
                    <template v-else-if="Number(p.depositedAmount ?? 0) > 0">
                      已入金 ¥ {{ money(p.depositedAmount) }} / ¥
                      {{ money(plan.amount) }} ·
                      {{ p.status === 'OVERDUE' ? '计划' : '' }}
                      {{ p.expectedDate.slice(5) }}
                    </template>
                    <template v-else-if="p.status === 'OVERDUE'">
                      未执行 · 计划 {{ p.expectedDate.slice(5) }}
                    </template>
                    <template v-else>
                      待执行 · {{ p.expectedDate.slice(5) }}
                    </template>
                  </span>
                </div>
                <div class="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width:
                        p.status === 'COMPLETED'
                          ? '100%'
                          : `${Math.min(
                              100,
                              Math.round(
                                (Number(p.depositedAmount ?? 0) /
                                  (Number(plan.amount) || 1)) *
                                  100,
                              ),
                            )}%`,
                      background:
                        p.status === 'COMPLETED' ? '#16a34a' : '#3b6ef5',
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <ul
              class="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground/40"
            >
              <li>实时类转账窗口内即时到账</li>
              <li>窗口外提交按普通转账处理，可能延迟到账</li>
              <li>点击页头「新建入金计划」建立定投后，此处自动展示执行进度</li>
            </ul>
          </template>
        </div>
      </div>
    </div>

    <!-- 累计净入金曲线 -->
    <div
      class="mt-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
    >
      <div class="flex items-start justify-between">
        <div>
          <div class="text-sm font-medium">累计净入金曲线</div>
          <div class="mt-0.5 text-xs text-muted-foreground">
            单位：万元 · 用于计算资金加权收益率 XIRR · 近 12 个月
          </div>
        </div>
        <div
          class="flex overflow-hidden rounded-md border border-border text-xs"
        >
          <button
            v-for="m in CURVE_MODES"
            :key="m.value"
            class="px-3 py-1 transition-colors"
            :class="
              curveMode === m.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            type="button"
            @click="switchCurve(m.value)"
          >
            {{ m.label }}
          </button>
        </div>
      </div>
      <EchartsUI ref="curveChartRef" class="mt-2 h-56 w-full" />
    </div>

    <TransferModal @reload="reload" />
    <TransferImportModal @reload="reload" />
    <PlanModal @reload="reload" />
  </Page>
</template>
