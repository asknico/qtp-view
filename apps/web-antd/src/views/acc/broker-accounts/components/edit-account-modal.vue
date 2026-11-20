<script lang="ts" setup>
import type {
  AccAccountUpdatePayload,
  AccFeePayload,
  AccPermPayload,
} from '../api/broker-accounts';
import type { BrokerAccount } from '../data/types';

import { computed, reactive, ref, shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button } from 'antdv-next';

import {
  setAccountFee,
  setBoardPerm,
  switchAccountStatus,
  updateAccount,
} from '../api/broker-accounts';

/**
 * 编辑券商账户弹窗（对齐设计稿 EDIT · 2.1-C）
 * ---------------------------------------------------------------------------
 * 三段结构：账户档案 / 板块权限 / 费率与口径，分别对应三个后端接口：
 *   档案   → POST /acc/brokerAccount/update       （别名 / 用途 / 备注）
 *   状态   → POST /acc/brokerAccount/switchStatus （正常 / 休眠 / 销户）
 *   板块权限 → POST /acc/brokerAccount/setPerm      （一次一个板块，后端写权限日志）
 *   费率   → POST /acc/brokerAccount/setFee       （后端写费率变更记录）
 * 底部实时显示「已修改 N 项」；有改动时关闭弹窗会先出「放弃修改」二次确认。
 * 券商 / 资金账号 / 开户日期 / 风险等级为只读项：编码与日期不可改，风险等级由后端推导。
 */
defineOptions({ name: 'EditAccountModal' });

const emit = defineEmits<{ reload: [] }>();

const submitting = ref(false);

/** 有未保存改动时关闭弹窗 → 先出二次确认条 */
const showLeaveConfirm = ref(false);
let forceClose = false;

interface EditForm {
  alias: string;
  boards: Record<string, boolean>;
  isAllIn: 0 | 1;
  minCommission: null | number;
  purpose: string;
  rateWan: null | number;
  remark: string;
  status: 'ACTIVE' | 'CLOSED' | 'DORMANT';
}

const EMPTY_FORM: EditForm = {
  alias: '',
  boards: {},
  isAllIn: 1,
  minCommission: null,
  purpose: '',
  rateWan: null,
  remark: '',
  status: 'ACTIVE',
};

const form = reactive<EditForm>({ ...EMPTY_FORM, boards: {} });

/** 当前编辑的账户（弹窗打开时从 modalApi.getData 取）
 *  必须是响应式：板块行、费率规费、脏状态清单都由它派生，切账户要整体刷新
 */
const account = shallowRef<BrokerAccount | null>(null);

const STATUS_OPTIONS = [
  { label: '正常', value: 'ACTIVE' },
  { label: '休眠', value: 'DORMANT' },
  { label: '销户', value: 'CLOSED' },
] as const;

const boardRows = computed(() => account.value?.boards ?? []);

/** 综合费率（实时）：全佣即佣金率，净佣需叠加规费 */
const effectiveRateText = computed(() => {
  const rateWan = form.rateWan ?? 0;
  const regWan = (account.value?.fee.regulatoryFeeRate ?? 0) * 10_000;
  const total = form.isAllIn === 1 ? rateWan : rateWan + regWan;
  return `万 ${total.toFixed(2)}`;
});

/** 底部「已修改 N 项」清单（顺序对齐设计稿：别名、用途、备注、状态、板块权限、费率） */
const changedLabels = computed(() => {
  if (!account.value) return [];
  const labels: string[] = [];
  if (form.alias !== account.value.alias) labels.push('别名');
  if (form.purpose !== account.value.purpose) labels.push('用途');
  if (form.remark !== account.value.remark) labels.push('备注');
  if (form.status !== account.value.status) labels.push('账户状态');
  if (boardChanged()) labels.push('板块权限');
  if (form.rateWan !== null && rateChanged()) labels.push('佣金费率');
  if (
    form.minCommission !== null &&
    form.minCommission !== account.value.fee.minCommission
  )
    labels.push('最低佣金');
  if (form.isAllIn !== (account.value.fee.mode === 'ALL_IN' ? 1 : 0))
    labels.push('佣金口径');
  return labels;
});

const dirty = computed(() => changedLabels.value.length > 0);

/** 板块权限是否有变更（含值未变但顺序无关的全量比对） */
function boardChanged(): boolean {
  if (!account.value) return false;
  return account.value.boards.some(
    (board) => form.boards[board.code] !== board.granted,
  );
}

function boardChanges(): Array<{ code: string; granted: boolean }> {
  if (!account.value) return [];
  return account.value.boards
    .filter((board) => form.boards[board.code] !== board.granted)
    .map((board) => ({
      code: board.code,
      granted: Boolean(form.boards[board.code]),
    }));
}

/** 待生效板块文案：写进分组副标题，避免多占一行高度 */
const pendingBoardText = computed(() => {
  return boardChanges()
    .map((change) => {
      const board = boardRows.value.find((item) => item.code === change.code);
      return `${board?.name ?? change.code} ${change.granted ? '开通' : '关闭'}`;
    })
    .join(' · ');
});

/** 佣金费率是否有变更（万口径比较，规避浮点误差） */
function rateChanged(): boolean {
  if (!account.value) return false;
  if (form.rateWan === null || form.rateWan === undefined) return false;
  return (
    Math.abs(form.rateWan - account.value.fee.commissionRate * 10_000) > 1e-9
  );
}

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[760px]',
  closeOnClickModal: false,
  confirmText: '保存修改',
  onBeforeClose() {
    if (submitting.value || !dirty.value || forceClose) {
      showLeaveConfirm.value = false;
      forceClose = false;
      return true;
    }
    showLeaveConfirm.value = true;
    return false;
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData() as { account?: BrokerAccount };
      account.value = data.account ?? null;
      showLeaveConfirm.value = false;
      forceClose = false;
      fill();
    }
  },
  title: '编辑券商账户',
});

/** 用当前账户回填表单，并记录基线快照 */
function fill() {
  if (!account.value) return;
  form.alias = account.value.alias;
  form.purpose = account.value.purpose;
  form.remark = account.value.remark;
  form.status = account.value.status;
  form.rateWan = Number((account.value.fee.commissionRate * 10_000).toFixed(2));
  form.minCommission = account.value.fee.minCommission;
  form.isAllIn = account.value.fee.mode === 'ALL_IN' ? 1 : 0;
  form.boards = Object.fromEntries(
    account.value.boards.map((board) => [board.code, board.granted]),
  );
}

function handleReset() {
  fill();
  showLeaveConfirm.value = false;
  window.message?.info('已还原为打开时的状态');
}

function handleCancel() {
  modalApi.close();
}

/** 二次确认条：放弃修改 */
function handleDiscard() {
  forceClose = true;
  showLeaveConfirm.value = false;
  modalApi.close();
}

/** 二次确认条：继续编辑 */
function handleKeepEditing() {
  showLeaveConfirm.value = false;
}

/** 板块行状态文案：已开通 / 未开通 / 待开通 / 待关闭 */
function boardStateText(granted: boolean, changed: boolean): string {
  if (!changed) return granted ? '已开通' : '未开通';
  return granted ? '待关闭' : '待开通';
}

async function handleSubmit() {
  if (!account.value) return;
  if (!form.alias.trim()) {
    window.message?.error('请填写账户别名');
    return;
  }
  if (
    form.rateWan !== null &&
    form.rateWan !== undefined &&
    (form.rateWan < 0.5 || form.rateWan > 3)
  ) {
    window.message?.error('佣金费率需在 万 0.5 – 万 3 之间');
    return;
  }
  if (
    form.minCommission !== null &&
    form.minCommission !== undefined &&
    (form.minCommission < 0 || form.minCommission > 50)
  ) {
    window.message?.error('最低佣金需在 0 – 50 元之间');
    return;
  }

  const changes = changedLabels.value;
  if (changes.length === 0) {
    window.message?.info('未做修改');
    return;
  }

  submitting.value = true;
  try {
    // 1. 档案（别名 / 用途 / 备注）
    const profilePayload: AccAccountUpdatePayload = {
      accountCode: account.value.id,
    };
    if (form.alias !== account.value.alias)
      profilePayload.accountName = form.alias.trim();
    if (form.purpose !== account.value.purpose)
      profilePayload.purpose = form.purpose.trim();
    if (form.remark !== account.value.remark)
      profilePayload.remark = form.remark.trim();
    if (
      profilePayload.accountName ||
      profilePayload.purpose !== undefined ||
      profilePayload.remark !== undefined
    ) {
      await updateAccount(profilePayload);
    }

    // 2. 账户状态
    if (form.status !== account.value.status) {
      await switchAccountStatus({
        accountCode: account.value.id,
        status: form.status,
      });
    }

    // 3. 费率与口径（后端要求 commissionRate 必填，口径变化但费率未变时也提交当前值）
    const feeChanged =
      rateChanged() ||
      (form.minCommission !== null &&
        form.minCommission !== account.value.fee.minCommission) ||
      form.isAllIn !== (account.value.fee.mode === 'ALL_IN' ? 1 : 0);
    if (feeChanged && form.rateWan !== null && form.rateWan !== undefined) {
      const feePayload: AccFeePayload = {
        accountCode: account.value.id,
        // 万 X.X → 小数，保留 8 位避免浮点尾差
        commissionRate: Number((form.rateWan / 10_000).toFixed(8)),
      };
      if (form.minCommission !== null && form.minCommission !== undefined) {
        feePayload.minCommission = form.minCommission;
      }
      feePayload.isAllInCommission = form.isAllIn;
      await setAccountFee(feePayload);
    }

    // 4. 板块权限：一次一个板块，后端逐条写权限变更日志
    for (const change of boardChanges()) {
      const permPayload: AccPermPayload = {
        accountCode: account.value.id,
        granted: change.granted,
        permCode: change.code,
      };
      await setBoardPerm(permPayload);
    }

    window.message?.success(
      `已保存 ${changes.length} 项：${changes.join('、')}`,
    );
    emit('reload');
    forceClose = true;
    modalApi.close();
  } catch {
    // 错误提示已由 http 层统一弹出（含 traceId）；保持弹窗打开，用户可继续编辑
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BasicModal :close-on-click-modal="false" title="编辑券商账户">
    <div class="eam">
      <div v-if="account" class="eam__sub">
        {{ account.id }} · {{ account.broker }} · {{ account.alias }} —
        修改保存后立即生效，并写入账户台账
      </div>

      <!-- 账户档案 -->
      <div class="eam__group">
        账户档案<span>别名同步账户卡片与费率表；交易经验由开户日期推算</span>
      </div>
      <div class="fm">
        <div class="fm__cell is-ro">
          <span class="fm__label">券商</span>
          <span class="fm__val">{{ account?.broker || '—' }}</span>
        </div>
        <div class="fm__cell is-ro">
          <span class="fm__label">资金账号</span>
          <span class="fm__val">{{ account?.accountNo || '—' }}</span>
        </div>
        <div class="fm__cell is-ro">
          <span class="fm__label">开户日期</span>
          <span class="fm__val">{{ account?.openedAt || '—' }}</span>
        </div>
        <div class="fm__cell is-ro">
          <span class="fm__label">风险等级</span>
          <span class="fm__val">{{ account?.riskLevel || '—' }}</span>
        </div>
        <div class="fm__cell">
          <span class="fm__label">账户别名<i>*</i></span>
          <input
            v-model="form.alias"
            aria-label="账户别名"
            class="fm__inp"
            maxlength="20"
            placeholder="如：主账户 / 打新仓"
            type="text"
          />
        </div>
        <div class="fm__cell">
          <span class="fm__label">账户用途</span>
          <input
            v-model="form.purpose"
            aria-label="账户用途"
            class="fm__inp"
            maxlength="30"
            placeholder="如：长线底仓 / 网格交易"
            type="text"
          />
        </div>
        <div class="fm__cell fm__cell--chips">
          <span class="fm__label">账户状态</span>
          <div class="fm__chips">
            <button
              v-for="s in STATUS_OPTIONS"
              :key="s.value"
              :class="{ on: form.status === s.value }"
              class="fm__chip"
              type="button"
              @click="form.status = s.value"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
        <div class="fm__cell">
          <span class="fm__label">备注</span>
          <textarea
            v-model="form.remark"
            aria-label="备注"
            class="fm__area"
            maxlength="200"
            placeholder="选填，≤200 字"
            rows="2"
          ></textarea>
        </div>
      </div>

      <!-- 板块权限 -->
      <div class="eam__group">
        板块权限<span :class="{ 'is-pend': boardChanged() }">{{
          boardChanged()
            ? `待生效：${pendingBoardText}`
            : '保存后生效；关闭板块不影响已有持仓卖出'
        }}</span>
      </div>
      <ul class="fm fm--board">
        <li
          v-for="board in boardRows"
          :key="board.code"
          :class="{ pend: form.boards[board.code] !== board.granted }"
          class="fm__cell fm__board"
          @click="form.boards[board.code] = !form.boards[board.code]"
        >
          <div class="fm__board-top">
            <span
              class="fm__check"
              :class="{ 'is-on': form.boards[board.code] }"
            ></span>
            <span class="fm__board-name">{{ board.name }}</span>
            <span class="fm__board-state">
              {{
                boardStateText(
                  board.granted,
                  form.boards[board.code] !== board.granted,
                )
              }}
            </span>
          </div>
          <div class="fm__board-req">{{ board.requirement }}</div>
        </li>
      </ul>

      <!-- 费率与口径 -->
      <div class="eam__group">
        费率与口径<span>与右侧「分账户费率配置」同源；费率 0.00005 – 0.0003</span>
      </div>
      <div class="fm">
        <div class="fm__cell">
          <span class="fm__label">佣金费率<i>*</i></span>
          <div class="fm__unit">
            <input
              v-model.number="form.rateWan"
              aria-label="佣金费率（万）"
              class="fm__inp"
              max="3"
              min="0.5"
              step="0.1"
              type="number"
            />
            <span>万</span>
          </div>
        </div>
        <div class="fm__cell">
          <span class="fm__label">最低佣金</span>
          <div class="fm__unit">
            <input
              v-model.number="form.minCommission"
              aria-label="最低佣金（元/笔）"
              class="fm__inp"
              max="50"
              min="0"
              step="0.5"
              type="number"
            />
            <span>元/笔</span>
          </div>
        </div>
        <div class="fm__cell is-ro">
          <span class="fm__label">综合费率</span>
          <span class="fm__val fm__val--num">
            {{ effectiveRateText }}
            <em>{{
              form.isAllIn === 1 ? '全佣已含规费' : '已叠加规费 0.00541%'
            }}</em>
          </span>
        </div>
        <div class="fm__cell fm__cell--chips">
          <span class="fm__label">佣金口径</span>
          <div class="fm__chips">
            <button
              :class="{ on: form.isAllIn === 1 }"
              class="fm__chip"
              type="button"
              @click="form.isAllIn = 1"
            >
              全佣（已含规费）
            </button>
            <button
              :class="{ on: form.isAllIn === 0 }"
              class="fm__chip"
              type="button"
              @click="form.isAllIn = 0"
            >
              净佣（另加规费）
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="eam-footer">
        <template v-if="showLeaveConfirm">
          <span class="eam-footer__warn">
            有 {{ changedLabels.length }} 项修改未保存：{{
              changedLabels.join('、')
            }}
          </span>
          <div class="eam-footer__btns">
            <Button type="primary" @click="handleKeepEditing">
              继续编辑
            </Button>
            <Button danger @click="handleDiscard">放弃修改</Button>
          </div>
        </template>
        <template v-else>
          <span class="eam-footer__note">
            {{
              dirty
                ? `已修改 ${changedLabels.length} 项：${changedLabels.join('、')}`
                : '未做修改 · 权限码 acc:brokerAccount:edit'
            }}
          </span>
          <div class="eam-footer__btns">
            <Button @click="handleCancel">取消</Button>
            <Button :disabled="submitting" @click="handleReset">重置</Button>
            <Button :loading="submitting" type="primary" @click="handleSubmit">
              保存修改
            </Button>
          </div>
        </template>
      </div>
    </template>
  </BasicModal>
</template>

<style scoped>
.eam {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.eam__sub {
  font-size: var(--font-small);
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.eam__group {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-top: 2px;
  font-size: var(--font-title);
  font-weight: var(--font-weight-strong);
  line-height: 1.25;
  color: hsl(var(--foreground));
}

.eam__group span {
  font-size: var(--font-small);
  font-weight: var(--font-weight-normal);
  color: hsl(var(--muted-foreground));
}

/* 待生效提示：跟随板块权限副标题，琥珀色，不额外占行 */
.eam__group span.is-pend {
  font-weight: var(--font-weight-medium);
  color: hsl(32deg 88% 38%);
}

/* ==================== 表单单元格 ==================== */
.fm {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

/* 单元格分隔线用外扩阴影画，靠容器 overflow 裁掉最外圈，避免双线 */
.fm__cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: flex-start;
  min-width: 0;
  padding: 5px 12px 6px;
  background: hsl(var(--card));
  box-shadow:
    1px 0 0 0 hsl(var(--border)),
    0 1px 0 0 hsl(var(--border));
}

.fm__cell:focus-within {
  background: hsl(var(--primary) / 6%);
}

.fm__label {
  display: block;
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  line-height: 16px;
  color: hsl(var(--muted-foreground));
}

.fm__cell:focus-within .fm__label {
  color: hsl(var(--primary));
}

.fm__label i {
  margin-left: 2px;
  font-style: normal;
  color: hsl(0deg 72% 56%);
}

/* 只读单元格：灰底 + 灰字，明确不可编辑 */
.fm__cell.is-ro {
  background: hsl(var(--muted) / 45%);
}

.fm__val {
  display: block;
  height: 26px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-body);
  line-height: 26px;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.fm__cell.is-ro .fm__val {
  color: hsl(var(--muted-foreground));
}

.fm__val--num {
  font-variant-numeric: tabular-nums;
}

.fm__val--num em {
  margin-left: 8px;
  font-size: var(--font-small);
  font-style: normal;
  font-weight: var(--font-weight-normal);
  color: hsl(var(--muted-foreground));
}

.fm__inp {
  width: 100%;
  height: 26px;
  padding: 0 8px;
  font-size: var(--font-body);
  color: hsl(var(--foreground));
  outline: none;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 70%);
  border-radius: 6px;
  transition: border-color 0.15s ease;
}

.fm__inp:hover {
  border-color: hsl(var(--border));
}

.fm__inp:focus {
  border-color: hsl(var(--primary));
}

.fm__inp::placeholder {
  color: hsl(var(--muted-foreground) / 65%);
}

/* 数字步进按钮占宽且样式杂，隐藏掉，靠校验兜底 */
.fm__inp::-webkit-inner-spin-button,
.fm__inp::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.fm__inp[type='number'] {
  appearance: textfield;
}

.fm__unit {
  display: flex;
  gap: 5px;
  align-items: center;
  height: 26px;
}

/* 单位紧跟数值：输入框收窄到刚够数字，避免「1.2 …… 万」这种被拉开的读法 */
.fm__unit .fm__inp {
  flex: 0 0 46px;
  width: 46px;
  padding: 0 5px;
}

.fm__unit span {
  flex: 0 0 auto;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.fm__area {
  width: 100%;
  min-height: 40px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: var(--font-body);
  line-height: 1.45;
  color: hsl(var(--foreground));
  resize: none;
  outline: none;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 70%);
  border-radius: 6px;
  transition: border-color 0.15s ease;
}

.fm__area:hover {
  border-color: hsl(var(--border));
}

.fm__area:focus {
  border-color: hsl(var(--primary));
}

.fm__area::placeholder {
  color: hsl(var(--muted-foreground) / 65%);
}

/* ---- 分段选择（账户状态 / 佣金口径） ---- */
.fm__cell--chips .fm__chips {
  height: 26px;
}

.fm__chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.fm__chip {
  flex: 0 0 auto;
  height: 24px;
  padding: 0 11px;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  cursor: pointer;
  background: hsl(var(--muted) / 55%);
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    color 0.15s,
    background 0.15s;
}

.fm__chip:hover {
  color: hsl(var(--foreground));
}

.fm__chip.on {
  font-weight: var(--font-weight-medium);
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 35%);
}

/* ---- 板块权限：同样走单元格，两列网格，奇数个时末位通栏 ---- */
.fm--board {
  padding: 0;
  margin: 0;
  list-style: none;
}

.fm__board {
  gap: 3px;
  cursor: pointer;
  transition: background 0.15s;
}

.fm__board:hover {
  background: hsl(var(--muted) / 40%);
}

.fm__board:nth-child(odd):last-child {
  grid-column: span 2;
}

.fm__board-top {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 18px;
  font-size: var(--font-base);
}

.fm__board-name {
  flex: 0 0 auto;
  font-weight: var(--font-weight-medium);
  color: hsl(var(--foreground));
}

.fm__board-state {
  flex: 0 0 auto;
  margin-left: auto;
  font-size: var(--font-small);
  color: hsl(172deg 66% 30%);
}

.fm__board.pend .fm__board-state {
  font-weight: var(--font-weight-medium);
  color: hsl(32deg 88% 38%);
}

.fm__board-req {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-small);
  line-height: 15px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.fm__check {
  position: relative;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border: 1.2px solid hsl(var(--border));
  border-radius: 3.5px;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.fm__check.is-on {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.fm__check.is-on::after {
  position: absolute;
  top: 2px;
  left: 4.5px;
  width: 3px;
  height: 7px;
  content: '';
  border: solid #fff;
  border-width: 0 1.6px 1.6px 0;
  transform: rotate(42deg);
}

/* ---- 底部 ---- */
.eam-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.eam-footer__note {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.eam-footer__warn {
  font-size: var(--font-small);
  font-weight: var(--font-weight-medium);
  color: hsl(32deg 88% 38%);
}

.eam-footer__btns {
  display: inline-flex;
  gap: 8px;
  margin-left: auto;
}
</style>
