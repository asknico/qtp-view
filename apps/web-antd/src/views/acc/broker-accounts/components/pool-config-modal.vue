<script lang="ts" setup>
import type { AccBrokerPoolConfig } from '../api/broker-accounts';

import { computed, reactive, ref, shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button } from 'antdv-next';

import { formatThousand } from '../../_shared/format';
import { fetchPoolConfig, savePoolConfig } from '../api/broker-accounts';

/**
 * 券商资金池配置弹窗（预算分配 2.4 · 券商级一对一体系）
 * ---------------------------------------------------------------------------
 * 数据：GET  /acc/budgetPool/getByBroker?brokerCode=xxx（打开时拉取现有配置）
 * 保存：POST /acc/budgetPool/saveByBroker（整券商覆盖式：未提交的类别视为清除）
 * 体系：券商(1) ↔ 资金池(1) ↔ 池内类别(N，可自定义增删)；银行卡为券商级多张；
 *       旗下交易账户共用券商资金池。
 * 口径：池总额 ≤ 券商资产合计 × 池总额上限%；Σ类别额度 ≤ 池总额；
 *       券商资产合计 = 资金池(Σ类别) + 池外未配置；类别改数即生效，无需资金划转。
 * 券商上下文锁定：弹窗内券商为打开时传入的券商，不可切换。
 */
defineOptions({ name: 'PoolConfigModal' });

const emit = defineEmits<{ reload: [] }>();

const submitting = ref(false);
const loading = ref(false);

/** 有未保存改动时关闭弹窗 → 先出二次确认条 */
const showLeaveConfirm = ref(false);
let forceClose = false;

interface PoolFormRow {
  amount: null | number;
  capPct: null | number;
  enabled: boolean;
  /** 类别编码（自定义，如 LONG / STABLE） */
  poolType: string;
  /** 类别名称（如 长线池） */
  poolName: string;
  singleLimit: null | number;
}

function mkRow(poolType = '', poolName = ''): PoolFormRow {
  return {
    amount: null,
    capPct: null,
    enabled: true,
    poolName,
    poolType,
    singleLimit: null,
  };
}

const form = reactive({
  /** 池总额上限（券商资产合计占比%，空=不设上限） */
  poolCapPct: null as null | number,
  /** 池内类别行（动态） */
  rows: [] as PoolFormRow[],
});

const broker = shallowRef<null | { code: string; name: string }>(null);
const config = shallowRef<AccBrokerPoolConfig | null>(null);

/** 基线快照（打开加载完成后的序列化状态），用于脏检测 */
const baseline = ref<null | string>(null);

const totalAssets = computed(() => Number(config.value?.totalAssets ?? 0));
const accountCount = computed(() =>
  Math.round(Number(config.value?.accountCount ?? 0)),
);
const bankCount = computed(() =>
  Math.round(Number(config.value?.bankCount ?? 0)),
);

/** 池总额上限金额（元）= 券商资产合计 × poolCapPct% */
const capAmount = computed(() => {
  if (form.poolCapPct === null) return null;
  return (totalAssets.value * form.poolCapPct) / 100;
});

/** 校验基准：设了池总额上限用 capAmount，否则用券商资产合计 */
const capBase = computed(() => capAmount.value ?? totalAssets.value);

const allocated = computed(() => {
  let sum = 0;
  for (const row of form.rows) {
    if (row.enabled) sum += row.amount ?? 0;
  }
  return sum;
});

const freeAmount = computed(() =>
  Math.max(0, (totalAssets.value ?? 0) - allocated.value),
);

const dirty = computed(
  () => baseline.value !== null && snapshot() !== baseline.value,
);

function snapshot(): string {
  return JSON.stringify({
    cap: form.poolCapPct,
    rows: form.rows.map((r) => ({
      a: r.enabled ? (r.amount ?? null) : null,
      c: r.enabled ? (r.capPct ?? null) : null,
      e: r.enabled,
      n: r.poolName,
      s: r.enabled ? (r.singleLimit ?? null) : null,
      t: r.poolType,
    })),
  });
}

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[760px]',
  closeOnClickModal: false,
  confirmText: '保存配置',
  onBeforeClose() {
    if (submitting.value || !dirty.value || forceClose) {
      showLeaveConfirm.value = false;
      forceClose = false;
      return true;
    }
    showLeaveConfirm.value = true;
    return false;
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData() as {
      broker?: { code: string; name: string };
    };
    broker.value = data.broker ?? null;
    config.value = null;
    baseline.value = null;
    showLeaveConfirm.value = false;
    forceClose = false;
    if (!broker.value) return;
    loading.value = true;
    try {
      const conf = await fetchPoolConfig(broker.value.code);
      config.value = conf;
      fill(conf);
    } catch {
      window.message?.error('资金池配置加载失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  },
  title: '券商资金池配置',
});

/** 用后端配置回填表单并记录基线 */
function fill(conf: AccBrokerPoolConfig | null) {
  form.poolCapPct =
    conf?.poolCapPct !== null && conf?.poolCapPct !== undefined
      ? Number(conf.poolCapPct)
      : null;
  form.rows = (conf?.rows ?? []).map((r) => ({
    amount: Number(r.amount) || 0,
    capPct:
      r.capPct !== null && r.capPct !== undefined ? Number(r.capPct) : null,
    enabled: true,
    poolName: r.poolName,
    poolType: r.poolType,
    singleLimit:
      r.singleLimit !== null && r.singleLimit !== undefined
        ? Number(r.singleLimit)
        : null,
  }));
  baseline.value = snapshot();
}

/** 复制默认模板：长线池 40% + 稳定池 25%（按券商资产合计取整到百元） */
function applyTemplate() {
  const total = totalAssets.value ?? 0;
  if (total <= 0) {
    window.message?.warning('该券商暂无资产快照，请直接填写金额');
    return;
  }
  form.poolCapPct = 90;
  form.rows = [
    {
      ...mkRow('LONG', '长线池'),
      amount: Math.round((total * 0.4) / 100) * 100,
    },
    {
      ...mkRow('STABLE', '稳定池'),
      amount: Math.round((total * 0.25) / 100) * 100,
    },
  ];
  window.message?.success(
    '已按默认模板填充（长线 40% + 稳定 25%），可继续调整',
  );
}

function addRow() {
  form.rows.push(mkRow());
}

function removeRow(index: number) {
  form.rows.splice(index, 1);
}

function handleCancel() {
  modalApi.close();
}

function handleDiscard() {
  forceClose = true;
  showLeaveConfirm.value = false;
  modalApi.close();
}

function handleKeepEditing() {
  showLeaveConfirm.value = false;
}

async function handleSubmit() {
  if (!broker.value) return;
  // 类别编码必填且不重复（覆盖式保存：停用/删除的行不提交即清除）
  const enabled = form.rows.filter((r) => r.enabled);
  const codes = new Set<string>();
  for (const row of enabled) {
    if (!/^[A-Za-z0-9_]{1,20}$/.test(row.poolType)) {
      window.message?.error('类别编码仅支持字母/数字/下划线，长度 1-20');
      return;
    }
    if (codes.has(row.poolType)) {
      window.message?.error(`类别编码重复：${row.poolType}`);
      return;
    }
    codes.add(row.poolType);
    if (!row.poolName.trim()) {
      window.message?.error('类别名称不能为空');
      return;
    }
    if (row.amount === null || row.amount < 0) {
      window.message?.error(`「${row.poolName}」配置金额不能为空`);
      return;
    }
  }
  if (
    totalAssets.value > 0 &&
    capBase.value > 0 &&
    allocated.value > capBase.value
  ) {
    window.message?.error(
      `Σ类别额度 ${formatThousand(allocated.value, 2)} 超过池总额 ${formatThousand(capBase.value, 2)}`,
    );
    return;
  }

  submitting.value = true;
  try {
    await savePoolConfig({
      brokerCode: broker.value.code,
      poolCapPct: form.poolCapPct ?? undefined,
      pools: enabled.map((row) => {
        const item: {
          amount: number;
          capPct?: number;
          poolName: string;
          poolType: string;
          remark?: string;
          singleLimit?: number;
        } = {
          amount: row.amount ?? 0,
          poolName: row.poolName.trim(),
          poolType: row.poolType,
        };
        if (row.capPct !== null && row.capPct !== undefined) {
          item.capPct = row.capPct;
        }
        if (row.singleLimit !== null && row.singleLimit !== undefined) {
          item.singleLimit = row.singleLimit;
        }
        return item;
      }),
    });
    window.message?.success('券商资金池配置已保存，改数即生效');
    emit('reload');
    forceClose = true;
    modalApi.close();
  } catch {
    // 错误提示已由 http 层统一弹出（含 traceId）；保持弹窗打开
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BasicModal :close-on-click-modal="false" title="券商资金池配置">
    <div class="pcm">
      <div v-if="broker" class="pcm__sub">
        {{ broker.code }} · {{ broker.name }} —
        券商级一对一：一个券商绑定一个资金池（池内类别可自定义），旗下交易账户共用；类别改数即生效，无需资金划转
      </div>

      <!-- 券商上下文（锁定） + 汇总 -->
      <div class="pcm__ctx">
        <div class="pcm__ctx-item is-ro">
          <span class="pcm__ctx-label">券商（锁定）</span>
          <b>{{ broker?.name }}</b>
        </div>
        <div class="pcm__ctx-item">
          <span class="pcm__ctx-label">旗下账户</span>
          <b class="pcm__num">{{ accountCount }} 个</b>
        </div>
        <div class="pcm__ctx-item">
          <span class="pcm__ctx-label">资产合计</span>
          <b class="pcm__num">{{ formatThousand(totalAssets, 2) }}</b>
        </div>
        <div class="pcm__ctx-item">
          <span class="pcm__ctx-label">资金池</span>
          <b class="pcm__num">{{ formatThousand(allocated, 2) }}</b>
        </div>
        <div class="pcm__ctx-item">
          <span class="pcm__ctx-label">池外未配置</span>
          <b class="pcm__num">{{ formatThousand(freeAmount, 2) }}</b>
        </div>
        <div class="pcm__ctx-item">
          <span class="pcm__ctx-label">绑定银行卡</span>
          <b class="pcm__num">{{ bankCount }} 张</b>
        </div>
        <Button
          class="pcm__tpl"
          size="small"
          type="primary"
          @click="applyTemplate"
        >
          复制默认模板
        </Button>
      </div>

      <!-- 池总额上限 -->
      <div class="pcm__cap">
        <span class="pcm__cap-label">池总额上限（券商资产合计占比 %）</span>
        <input
          v-model.number="form.poolCapPct"
          aria-label="池总额上限占比"
          class="pcm__inp pcm__inp--cap"
          max="100"
          min="0"
          placeholder="选填，空=不设上限"
          step="1"
          type="number"
        />
        <span class="pcm__cap-hint">
          上限金额
          <b>{{ capAmount == null ? '不限' : formatThousand(capAmount, 2) }}</b>
          · 恒等式：资产合计 = 资金池 + 池外未配置
        </span>
      </div>

      <!-- 池内类别（动态） -->
      <div class="pcm__table">
        <div class="pcm__thead">
          <span class="pcm__col pcm__col--chk">启用</span>
          <span class="pcm__col">类别编码</span>
          <span class="pcm__col">类别名称</span>
          <span class="pcm__col">配置金额（元）</span>
          <span class="pcm__col">占池上限（%）</span>
          <span class="pcm__col">单笔上限（元）</span>
          <span class="pcm__col pcm__col--op">操作</span>
        </div>
        <div
          v-for="(row, index) in form.rows"
          :key="`${row.poolType}-${index}`"
          :class="{ 'is-off': !row.enabled }"
          class="pcm__row"
        >
          <span class="pcm__col pcm__col--chk">
            <input
              v-model="row.enabled"
              :aria-label="`${row.poolName}启用`"
              type="checkbox"
            />
          </span>
          <span class="pcm__col">
            <input
              v-model.trim="row.poolType"
              :aria-label="`${row.poolName}类别编码`"
              :disabled="!row.enabled"
              class="pcm__inp"
              maxlength="20"
              placeholder="如 LONG"
            />
          </span>
          <span class="pcm__col">
            <input
              v-model.trim="row.poolName"
              :aria-label="`${row.poolName}类别名称`"
              :disabled="!row.enabled"
              class="pcm__inp"
              maxlength="64"
              placeholder="如 长线池"
            />
          </span>
          <span class="pcm__col">
            <input
              v-model.number="row.amount"
              :aria-label="`${row.poolName}配置金额`"
              :disabled="!row.enabled"
              class="pcm__inp"
              min="0"
              placeholder="0.00"
              step="100"
              type="number"
            />
          </span>
          <span class="pcm__col">
            <input
              v-model.number="row.capPct"
              :aria-label="`${row.poolName}占池上限`"
              :disabled="!row.enabled"
              class="pcm__inp"
              max="100"
              min="0"
              placeholder="选填"
              step="1"
              type="number"
            />
          </span>
          <span class="pcm__col">
            <input
              v-model.number="row.singleLimit"
              :aria-label="`${row.poolName}单笔上限`"
              :disabled="!row.enabled"
              class="pcm__inp"
              min="0"
              placeholder="选填"
              step="100"
              type="number"
            />
          </span>
          <span class="pcm__col pcm__col--op">
            <button
              aria-label="删除类别"
              class="pcm__del"
              type="button"
              @click="removeRow(index)"
            >
              删除
            </button>
          </span>
        </div>
        <div v-if="form.rows.length === 0" class="pcm__empty">
          暂无类别：可「复制默认模板」或「新增类别」（保存后池未绑定 → 已绑定）
        </div>
      </div>

      <div class="pcm__actions">
        <Button size="small" @click="addRow">＋ 新增类别</Button>
        <span class="pcm__actions-note">
          类别可自定义（长线池 / 稳定池…）；删除或停用的类别保存后即清除
        </span>
      </div>

      <div v-if="loading" class="pcm__loading">配置加载中…</div>
      <div class="pcm__note">
        校验规则：Σ类别额度 ≤ 池总额（券商资产合计 ×
        上限%）；单笔上限用于下单拦截（7.x 执行校验）；跨券商资金调整走 2.3
        银证转账真实划转，本页不做调拨。
      </div>
    </div>

    <template #footer>
      <div class="pcm-footer">
        <template v-if="showLeaveConfirm">
          <span class="pcm-footer__warn">有未保存的资金池修改</span>
          <div class="pcm-footer__btns">
            <Button type="primary" @click="handleKeepEditing">继续编辑</Button>
            <Button danger @click="handleDiscard">放弃修改</Button>
          </div>
        </template>
        <template v-else>
          <span class="pcm-footer__note">
            {{
              dirty
                ? '配置已修改，保存后整券商覆盖生效'
                : '未做修改 · 权限码 acc:brokerAccount:edit'
            }}
          </span>
          <div class="pcm-footer__btns">
            <Button @click="handleCancel">取消</Button>
            <Button :loading="submitting" type="primary" @click="handleSubmit">
              保存配置
            </Button>
          </div>
        </template>
      </div>
    </template>
  </BasicModal>
</template>

<style scoped>
.pcm {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pcm__sub {
  font-size: var(--font-small);
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

/* ---- 券商上下文条 ---- */
.pcm__ctx {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--muted) / 45%);
  border-radius: 8px;
}

.pcm__ctx-item {
  display: flex;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
}

.pcm__ctx-item.is-ro {
  flex: 1;
}

.pcm__ctx-label {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.pcm__ctx-item b {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-body);
  white-space: nowrap;
}

.pcm__num {
  font-variant-numeric: tabular-nums;
}

.pcm__tpl {
  flex: 0 0 auto;
  margin-left: auto;
}

/* ---- 池总额上限 ---- */
.pcm__cap {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pcm__cap-label {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.pcm__inp--cap {
  flex: 0 0 160px;
  width: 160px;
}

.pcm__cap-hint {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.pcm__cap-hint b {
  font-variant-numeric: tabular-nums;
  color: hsl(var(--foreground));
}

/* ---- 类别表格 ---- */
.pcm__table {
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.pcm__thead,
.pcm__row {
  display: grid;
  grid-template-columns:
    40px minmax(90px, 1fr) minmax(100px, 1.2fr) minmax(100px, 1fr)
    minmax(90px, 0.9fr) minmax(100px, 1fr) 52px;
  gap: 8px;
  align-items: center;
  padding: 0 12px;
}

.pcm__thead {
  height: 30px;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 45%);
}

.pcm__row {
  min-height: 42px;
  font-size: var(--font-body);
  box-shadow: 0 1px 0 0 hsl(var(--border) / 60%);
}

.pcm__row.is-off .pcm__inp {
  color: hsl(var(--muted-foreground) / 60%);
}

.pcm__col {
  display: flex;
  min-width: 0;
}

.pcm__col--chk {
  justify-content: center;
}

.pcm__col--chk input {
  width: 14px;
  height: 14px;
  accent-color: hsl(var(--primary));
  cursor: pointer;
}

.pcm__col--op {
  justify-content: center;
}

.pcm__inp {
  width: 100%;
  height: 26px;
  padding: 0 8px;
  font-size: var(--font-body);
  font-variant-numeric: tabular-nums;
  color: hsl(var(--foreground));
  outline: none;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 70%);
  border-radius: 6px;
}

.pcm__inp:focus {
  border-color: hsl(var(--primary));
}

.pcm__inp:disabled {
  color: hsl(var(--muted-foreground) / 60%);
  background: hsl(var(--muted) / 45%);
}

.pcm__inp::-webkit-inner-spin-button,
.pcm__inp::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.pcm__del {
  height: 24px;
  padding: 0 8px;
  font-size: var(--font-small);
  color: hsl(0deg 72% 51%);
  cursor: pointer;
  background: transparent;
  border: 1px solid hsl(0deg 72% 51% / 35%);
  border-radius: 6px;
}

.pcm__del:hover {
  background: hsl(0deg 72% 51% / 10%);
}

.pcm__empty {
  padding: 14px 12px;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.pcm__actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pcm__actions-note {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.pcm__loading {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.pcm__note {
  font-size: var(--font-small);
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

/* ---- 底部 ---- */
.pcm-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.pcm-footer__note {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.pcm-footer__warn {
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  color: hsl(32deg 88% 38%);
}

.pcm-footer__btns {
  display: inline-flex;
  gap: 8px;
  margin-left: auto;
}
</style>
