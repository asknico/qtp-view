<script setup lang="ts">
import type { EChartsOption } from 'echarts';

import type { VbenFormProps } from '@vben/common-ui';
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { VxeGridProps } from '#/adapter/vxe-table';
import type {
  CashFlow,
  CashFlowMonthlyPoint,
  CashFlowSummary,
  CashFlowTypeDistItem,
} from '#/api/acc/cash-flow/model';

import { computed, onMounted, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { Popconfirm, Space, Tag } from 'antdv-next';
import dayjs from 'dayjs';

import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import {
  cashFlowExport,
  cashFlowList,
  cashFlowMonthlyChart,
  cashFlowRemove,
  cashFlowSummary,
  cashFlowTypeDistribution,
} from '#/api/acc/cash-flow';
import { downloadByData } from '#/utils/file/download';

import cashFlowImportModal from './cash-flow-import-modal.vue';
import cashFlowModal from './cash-flow-modal.vue';
import { columns, FLOW_TYPE_MAP, querySchema, SOURCE_TYPE_MAP } from './data';

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
        const { flowDateRange, ...rest } = formValues as Record<string, any>;
        return await cashFlowList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          beginDate: flowDateRange?.[0],
          endDate: flowDateRange?.[1],
          ...rest,
        });
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'acc-cash-flow-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const [CashFlowModal, flowModalApi] = useVbenModal({
  connectedComponent: cashFlowModal,
});

const [CashFlowImportModal, importModalApi] = useVbenModal({
  connectedComponent: cashFlowImportModal,
});

/** 顶部四张统计卡数据 */
const summary = ref<CashFlowSummary>();

/** 汇总统计月份：默认当月 */
const statMonth = ref(dayjs().format('YYYY-MM'));

/** 期末余额副行：无余额数据显示「余额待同步」 */
const balanceHint = computed(() => {
  if (
    summary.value?.periodEndBalance === undefined ||
    summary.value?.periodEndBalance === null
  ) {
    return '余额待同步（导入对账单后可核对）';
  }
  return `截止 ${summary.value?.balanceAsOfDate ?? '月末'} · 含各账户最后一笔有效余额`;
});

async function loadSummary() {
  summary.value = await cashFlowSummary(statMonth.value);
}

function reload() {
  tableApi.query();
  loadSummary();
  loadCharts();
}

onMounted(() => {
  loadSummary();
  loadCharts();
});

/** ===== 月度净入金 / 资金类型占比（设计稿 2.2 下部两卡） ===== */

/** 指标切换：净入金 / 流入 / 流出 */
type ChartMode = 'in' | 'net' | 'out';
const chartMode = ref<ChartMode>('net');

const monthlyData = ref<CashFlowMonthlyPoint[]>([]);
const typeDistData = ref<CashFlowTypeDistItem[]>([]);

const barChartRef = ref<EchartsUIType>();
const { renderEcharts: renderBar } = useEcharts(barChartRef);
const donutChartRef = ref<EchartsUIType>();
const { renderEcharts: renderDonut } = useEcharts(donutChartRef);

/** 主题：环形图中心文字色随明暗 */
const { isDark } = usePreferences();

/** 涨红跌绿：流入/净入金为正红、流出及净入金为负绿 */
const COLOR_UP = '#dc2626';
const COLOR_DOWN = '#16a34a';

const CHART_MODES: Array<{ label: string; value: ChartMode }> = [
  { label: '净入金', value: 'net' },
  { label: '流入', value: 'in' },
  { label: '流出', value: 'out' },
];

function modeValue(p: CashFlowMonthlyPoint, mode: ChartMode): number {
  if (mode === 'in') return p.inAmount ?? 0;
  if (mode === 'out') return p.outAmount ?? 0;
  return p.netAmount ?? 0;
}

/** 最近 6 个月起止（含当月） */
function recentMonthRange(): { beginMonth: string; endMonth: string } {
  return {
    beginMonth: dayjs().subtract(5, 'month').format('YYYY-MM'),
    endMonth: dayjs().format('YYYY-MM'),
  };
}

async function loadCharts() {
  const { beginMonth, endMonth } = recentMonthRange();
  const [monthly, dist] = await Promise.all([
    cashFlowMonthlyChart(beginMonth, endMonth),
    cashFlowTypeDistribution(
      dayjs().startOf('month').format('YYYY-MM-DD'),
      dayjs().endOf('month').format('YYYY-MM-DD'),
    ),
  ]);
  monthlyData.value = monthly ?? [];
  typeDistData.value = dist ?? [];
}

/** 月度柱图 option：单位万元（轴），tooltip 元全量 */
const barOption = computed<EChartsOption>(() => {
  const points = monthlyData.value;
  const labels = points.map((p) => `${p.month.slice(5)}月`);
  const values = points.map((p) => modeValue(p, chartMode.value));
  const barColor =
    chartMode.value === 'out'
      ? COLOR_DOWN
      : (v: number) => (v >= 0 ? COLOR_UP : COLOR_DOWN);
  return {
    grid: { bottom: 24, left: 8, right: 8, top: 16, containLabel: true },
    tooltip: {
      formatter: (params: any) => {
        const p = points[params[0]?.dataIndex];
        if (!p) return '';
        return `${p.month}<br/>转入 ${money(p.inAmount)} · 转出 ${money(p.outAmount)}<br/>净入金 ${money(p.netAmount)}`;
      },
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
        formatter: (v: number) => (v / 10_000).toFixed(1).replace(/\.0$/, ''),
      },
      splitLine: { lineStyle: { color: '#eef1f6' } },
      type: 'value',
    },
    series: [
      {
        barMaxWidth: 36,
        data: values.map((v) => ({
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: typeof barColor === 'function' ? barColor(v) : barColor,
          },
          value: v,
        })),
        name: CHART_MODES.find((m) => m.value === chartMode.value)?.label,
        type: 'bar',
      },
    ],
  };
});

/** 占比环形图：Top5 + 其他 */
const DONUT_PALETTE = ['#3b6ef5', '#8b5cf6', '#e0a13b', '#0f9d58', '#f5222d'];

const donutSlices = computed(() => {
  const items = typeDistData.value;
  const top = items.slice(0, 5);
  const rest = items.slice(5);
  const slices = top.map((item, i) => ({
    color: DONUT_PALETTE[i % DONUT_PALETTE.length] ?? '#c3ccda',
    count: item.count,
    name: item.flowTypeName,
  }));
  if (rest.length > 0) {
    slices.push({
      color: '#c3ccda',
      count: rest.reduce((sum, item) => sum + item.count, 0),
      name: '其他',
    });
  }
  return slices;
});

const donutTotal = computed(() =>
  typeDistData.value.reduce((sum, item) => sum + item.count, 0),
);

const donutOption = computed<EChartsOption>(() => ({
  series: [
    {
      avoidLabelOverlap: true,
      data: donutSlices.value.map((s) => ({
        itemStyle: { color: s.color },
        name: s.name,
        value: s.count,
      })),
      label: { show: false },
      center: ['50%', '50%'],
      radius: ['62%', '86%'],
      type: 'pie',
    },
  ],
  title: {
    left: 'center',
    subtext: `${donutTotal.value} 笔`,
    subtextStyle: {
      color: isDark.value ? '#e5e7eb' : '#1a2130',
      fontSize: 14,
      fontWeight: 600,
      y: 8,
    },
    text: '本月',
    textStyle: { color: '#8d97a8', fontSize: 11, y: -8 },
    top: 'center',
  },
  tooltip: {
    formatter: (p: any) => `${p.name}：${p.value} 笔（${p.percent}%）`,
    trigger: 'item',
  },
}));

function switchMode(mode: ChartMode) {
  chartMode.value = mode;
}

watch(
  [monthlyData, chartMode],
  () => {
    if (monthlyData.value.length > 0) renderBar(barOption.value);
  },
  { immediate: true },
);

watch(
  typeDistData,
  () => {
    if (typeDistData.value.length > 0) renderDonut(donutOption.value);
  },
  { immediate: true },
);

function handleAdd() {
  flowModalApi.setData({});
  flowModalApi.open();
}

function handleImport() {
  importModalApi.open();
}

function handleEdit(row: CashFlow) {
  flowModalApi.setData({ id: row.id });
  flowModalApi.open();
}

async function handleRemove(row: CashFlow) {
  await cashFlowRemove([row.id]);
  reload();
}

function handleMultiRemove() {
  const rows = tableApi.grid.getCheckboxRecords() as CashFlow[];
  const editableRows = rows.filter((row) => row.editable);
  if (editableRows.length === 0) {
    window.message.warning('勾选中无可删除的手工流水（导入/系统流水不可删除）');
    return;
  }
  window.modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的 ${editableRows.length} 条手工流水吗？导入/系统流水将自动跳过。`,
    onOk: async () => {
      await cashFlowRemove(editableRows.map((row) => row.id));
      reload();
    },
  });
}

async function handleExport() {
  // 勾选行优先：N条 = 勾选条数；未勾选时按当前筛选条件导出
  const checkedRows = tableApi.grid.getCheckboxRecords() as CashFlow[];
  const checkedIds = checkedRows.map((row) => row.id);
  const formValues = await tableApi.formApi.getValues();
  const { flowDateRange, ...rest } = formValues as Record<string, any>;
  const hide = window.message.loading({
    content: '正在导出资金流水...',
    duration: 9999,
  });
  try {
    // 原生响应：文件名由后端生成（资金流水_{N条}_{yyyyMMddHHmmss}.xlsx），经 download-filename 头下发
    const resp = (await cashFlowExport(
      {
        beginDate: flowDateRange?.[0],
        endDate: flowDateRange?.[1],
        ...rest,
      },
      checkedIds,
    )) as { data: Blob; headers: Record<string, any> };
    const raw = (resp.headers?.['download-filename'] as string) || '';
    const fileName = raw
      ? decodeURIComponent(raw)
      : `资金流水_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    downloadByData(resp.data, fileName);
    window.message.success('导出成功');
  } catch (error) {
    console.error(error);
    window.message.error('导出失败');
  } finally {
    hide();
  }
}

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
</script>

<template>
  <Page :auto-content-height="true">
    <!-- 顶部四张统计卡：本月流入 / 本月流出 / 本月净入金 / 期末资金余额 -->
    <div class="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">本月流入</div>
        <div class="mt-1 text-xl font-semibold tabular-nums text-red-600">
          {{ money(summary?.monthInAmount) }}
        </div>
        <div class="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          银证转入 {{ summary?.inTransferCount ?? 0 }} 笔 · 红利
          {{ money(summary?.dividendAmount) }}
        </div>
      </div>
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">本月流出</div>
        <div class="mt-1 text-xl font-semibold tabular-nums text-green-600">
          {{ money(summary?.monthOutAmount) }}
        </div>
        <div class="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          银证转出 {{ summary?.outTransferCount ?? 0 }} 笔 · 费用
          {{ money(summary?.feeAmount) }}
        </div>
      </div>
      <div
        class="rounded-[var(--radius)] border border-primary/20 border-border bg-primary/5 bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">本月净入金</div>
        <div
          class="mt-1 text-xl font-semibold tabular-nums"
          :class="
            (summary?.monthNetInflow ?? 0) >= 0
              ? 'text-red-600'
              : 'text-green-600'
          "
        >
          {{ (summary?.monthNetInflow ?? 0) >= 0 ? '+' : ''
          }}{{ money(summary?.monthNetInflow) }}
        </div>
        <div class="mt-0.5 text-xs text-muted-foreground">
          银证转入 − 转出（计入 XIRR 计算）
        </div>
      </div>
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm"
      >
        <div class="text-xs text-muted-foreground">期末资金余额</div>
        <div class="mt-1 text-xl font-semibold tabular-nums">
          {{
            summary?.periodEndBalance === null ||
            summary?.periodEndBalance === undefined
              ? '--'
              : money(summary.periodEndBalance)
          }}
        </div>
        <div class="mt-0.5 truncate text-xs text-muted-foreground">
          {{ balanceHint }}
        </div>
      </div>
    </div>

    <BasicTable table-title="资金流水明细">
      <template #toolbar-tools>
        <Space>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['acc:cashFlow:remove']"
            @click="handleMultiRemove"
          >
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            v-access:code="['acc:cashFlow:export']"
            @click="handleExport"
          >
            导出
          </a-button>
          <a-button
            v-access:code="['acc:cashFlow:import']"
            @click="handleImport"
          >
            导入
          </a-button>
          <a-button
            type="primary"
            v-access:code="['acc:cashFlow:add']"
            @click="handleAdd"
          >
            新增
          </a-button>
        </Space>
      </template>
      <template #flowDate="{ row }">
        <span class="tabular-nums">{{ row.flowDate }}</span>
        <span
          v-if="row.flowTime"
          class="ml-1 text-xs text-gray-400 tabular-nums"
        >
          {{ row.flowTime }}
        </span>
      </template>
      <template #flowType="{ row }">
        <Tag
          :color="
            row.direction === 1
              ? 'red'
              : row.direction === 0
                ? 'green'
                : 'default'
          "
        >
          {{ FLOW_TYPE_MAP.get(row.flowType) ?? row.flowTypeName }}
        </Tag>
      </template>
      <template #signedAmount="{ row }">
        <span
          class="font-medium tabular-nums"
          :class="row.direction === 1 ? 'text-red-600' : 'text-green-600'"
        >
          {{ row.direction === 1 ? '+' : '-' }}{{ money(row.amount) }}
        </span>
      </template>
      <template #linkName="{ row }">
        <span v-if="row.linkName" class="tabular-nums">{{ row.linkName }}</span>
        <span v-else class="text-gray-300">-</span>
      </template>
      <template #balanceAfter="{ row }">
        <!-- 手工流水不伪造余额（设计口径：余额由券商同步/交割单导入维护） -->
        <span
          v-if="row.balanceAfter !== null && row.balanceAfter !== undefined"
          class="tabular-nums"
        >
          {{ money(row.balanceAfter) }}
        </span>
        <span v-else class="text-xs text-gray-400">待同步</span>
      </template>
      <template #counterpartyDesc="{ row }">
        <span v-if="row.counterpartyDesc">{{ row.counterpartyDesc }}</span>
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
              v-access:code="['acc:cashFlow:edit']"
              @click="handleEdit(row)"
            >
              编辑
            </action-button>
            <Popconfirm
              placement="left"
              :title="`确认删除这条手工流水（${row.flowDate} ${money(row.amount)}）？`"
              @confirm="handleRemove(row)"
            >
              <action-button
                danger
                v-access:code="['acc:cashFlow:remove']"
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

    <!-- 月度净入金 + 资金类型占比 -->
    <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm lg:col-span-8"
      >
        <div class="flex items-start justify-between">
          <div>
            <div class="text-sm font-medium">月度净入金</div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              单位：万元 · 银证转账口径 · 近 6 个月
            </div>
          </div>
          <div
            class="flex overflow-hidden rounded-md border border-border text-xs"
          >
            <button
              v-for="m in CHART_MODES"
              :key="m.value"
              class="px-3 py-1 transition-colors"
              :class="
                chartMode === m.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              "
              type="button"
              @click="switchMode(m.value)"
            >
              {{ m.label }}
            </button>
          </div>
        </div>
        <div class="mt-2 h-56 w-full">
          <EchartsUI ref="barChartRef" height="100%" width="100%" />
        </div>
      </div>
      <div
        class="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm lg:col-span-4"
      >
        <div>
          <div class="text-sm font-medium">资金类型占比</div>
          <div class="mt-0.5 text-xs text-muted-foreground">按发生笔数</div>
        </div>
        <div class="mt-3 flex items-center gap-4">
          <div class="h-36 w-36 shrink-0">
            <EchartsUI ref="donutChartRef" height="100%" width="100%" />
          </div>
          <div class="flex-1 py-1 text-[13px] leading-relaxed">
            <div
              v-for="s in donutSlices"
              :key="s.name"
              class="flex items-center justify-between py-1"
            >
              <span class="flex items-center gap-2">
                <i
                  class="inline-block size-2.5 shrink-0 rounded-sm"
                  :style="{ background: s.color }"
                ></i>
                {{ s.name }}
              </span>
              <b class="font-semibold tabular-nums">
                {{ ((s.count / (donutTotal || 1)) * 100).toFixed(0) }}%
              </b>
            </div>
            <div
              v-if="donutSlices.length === 0"
              class="py-1 text-muted-foreground"
            >
              本月暂无流水
            </div>
          </div>
        </div>
      </div>
    </div>

    <CashFlowModal @reload="reload" />
    <CashFlowImportModal @reload="reload" />
  </Page>
</template>
