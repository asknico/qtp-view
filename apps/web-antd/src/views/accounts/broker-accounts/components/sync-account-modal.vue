<script lang="ts" setup>
import type { AccSyncAccountResult, AccSyncTask } from '../api/broker-accounts';

import { computed, onUnmounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button } from 'antdv-next';

import {
  cancelSync,
  fetchSyncTask,
  startSync,
  SYNC_DATA_TYPES,
  SYNC_STEPS,
} from '../api/broker-accounts';

/**
 * 同步账户弹窗（对齐设计稿 SYNC · 2.1-B）
 * ---------------------------------------------------------------------------
 * 交互契约完全对齐后端：
 *   POST /acc/sync/start  → 返回 taskCode（后端约 8 秒走完 7 步）
 *   GET  /acc/sync/task   → 500ms 轮询，progress + currentStep
 *   POST /acc/sync/cancel → RUNNING 中可取消，已写入批次回滚
 * 三态：准备（选范围）→ 执行（进度/取消/后台运行）→ 完成（单账户结果）。
 * 「后台运行」关闭弹窗后轮询继续，任务完成时 toast + 通知页面刷新。
 */
defineOptions({ name: 'SyncAccountModal' });

const emit = defineEmits<{ reload: [] }>();

/** 父组件传入的账户概要（仅启用账户参与同步） */
interface SyncAccountItem {
  alias: string;
  broker: string;
  id: string;
}

const accounts = ref<SyncAccountItem[]>([]);
const selectedCodes = ref<string[]>([]);
const selectedTypes = ref<string[]>([...SYNC_DATA_TYPES.map((t) => t.value)]);

/** 阶段：prep 选择范围 → running 执行进度 → done 终态 */
const phase = ref<'done' | 'prep' | 'running'>('prep');
const task = ref<AccSyncTask | null>(null);
const startError = ref('');

let pollTimer: null | ReturnType<typeof setInterval> = null;

const progress = computed(() => task.value?.progress ?? 0);
const stepIndex = computed(() =>
  Math.min(
    Math.floor((progress.value * SYNC_STEPS.length) / 100),
    SYNC_STEPS.length - 1,
  ),
);
const isRunning = computed(() => task.value?.status === 'RUNNING');

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[620px]',
  closeOnClickModal: false,
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      init();
    }
    // 关闭（含后台运行场景）不停止轮询，由终态或组件卸载兜底
  },
  title: '同步账户',
});

function init() {
  const data = modalApi.getData() as { accounts?: SyncAccountItem[] };
  accounts.value = data.accounts ?? [];
  selectedCodes.value = accounts.value.map((a) => a.id);
  selectedTypes.value = [...SYNC_DATA_TYPES.map((t) => t.value)];
  phase.value = 'prep';
  task.value = null;
  startError.value = '';
}

function toggleAccount(code: string) {
  const i = selectedCodes.value.indexOf(code);
  if (i === -1) {
    selectedCodes.value.push(code);
  } else {
    selectedCodes.value.splice(i, 1);
  }
}

function toggleType(value: string) {
  const i = selectedTypes.value.indexOf(value);
  if (i === -1) {
    selectedTypes.value.push(value);
  } else {
    selectedTypes.value.splice(i, 1);
  }
}

async function handleStart() {
  if (selectedCodes.value.length === 0) {
    window.message?.warning('请至少选择一个同步账户');
    return;
  }
  if (selectedTypes.value.length === 0) {
    window.message?.warning('请至少选择一种数据类型');
    return;
  }
  startError.value = '';
  try {
    const taskCode = await startSync({
      accountCodes: selectedCodes.value,
      dataTypes: selectedTypes.value,
      syncMode: 'MANUAL',
    });
    phase.value = 'running';
    pollTask(taskCode);
  } catch {
    startError.value = '同步任务启动失败，请稍后重试';
  }
}

function pollTask(taskCode: string) {
  stopPoll();
  pollTimer = setInterval(async () => {
    try {
      const t = await fetchSyncTask(taskCode);
      task.value = t;
      if (t.status !== 'RUNNING') {
        stopPoll();
        phase.value = 'done';
        onTaskFinished(t);
      }
    } catch {
      // 任务不存在（后端重启等）：停止轮询并提示
      stopPoll();
      phase.value = 'done';
      task.value = null;
      startError.value = '同步任务状态丢失（可能服务已重启），请重新发起';
    }
  }, 500);
}

function onTaskFinished(t: AccSyncTask) {
  if (t.status === 'SUCCESS') {
    window.message?.success(`同步完成：${t.results?.length ?? 0} 个账户已更新`);
    emit('reload');
  } else if (t.status === 'CANCELLED') {
    window.message?.info('同步已取消，未写入本次数据');
  } else {
    window.message?.error(t.errMsg || '同步失败，详见单账户结果');
    emit('reload');
  }
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** 执行中取消：立即调取消接口，下一次轮询拿到 CANCELLED 终态 */
async function handleCancel() {
  if (!task.value) return;
  try {
    await cancelSync(task.value.taskCode);
  } catch {
    window.message?.error('取消失败，任务可能已完成');
  }
}

/** 后台运行：关弹窗、轮询继续，完成后 toast + 刷新（轮询不随弹窗关闭停止） */
function handleBackground() {
  modalApi.close();
}

function handleClose() {
  modalApi.close();
}

function fmtWan(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n === 0) return '—';
  return n >= 10_000 ? `${(n / 10_000).toFixed(2)} 万` : n.toFixed(2);
}

function fmtCount(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '—';
}

function accountNameOf(code: string): string {
  const a = accounts.value.find((item) => item.id === code);
  return a ? `${a.broker} · ${a.alias}` : code;
}

function resultLine(r: AccSyncAccountResult): string {
  if (r.status !== 'SUCCESS') {
    return r.failReason || '失败';
  }
  return `总资产 ${fmtWan(r.totalAsset)} · 可用 ${fmtWan(r.cashAvailable)} · 持仓 ${fmtCount(r.positionCount)} 笔`;
}

onUnmounted(stopPoll);
</script>

<template>
  <BasicModal :close-on-click-modal="false" title="同步账户">
    <!-- ============ 阶段一：选择范围 ============ -->
    <div v-if="phase === 'prep'" class="sam">
      <div class="sam__group">
        同步范围<span>{{ selectedCodes.length }}/{{ accounts.length }} 个启用账户</span>
      </div>
      <div class="sam__list">
        <label
          v-for="a in accounts"
          :key="a.id"
          :class="{ on: selectedCodes.includes(a.id) }"
          class="sam__row"
          @click="toggleAccount(a.id)"
        >
          <span class="sam__check">{{
            selectedCodes.includes(a.id) ? '✓' : ''
          }}</span>
          <span class="sam__name">{{ a.broker }} · {{ a.alias }}</span>
          <span class="sam__code">{{ a.id }}</span>
        </label>
        <div v-if="accounts.length === 0" class="sam__empty">暂无启用账户</div>
      </div>

      <div class="sam__group">数据类型</div>
      <div class="sam__chips">
        <button
          v-for="t in SYNC_DATA_TYPES"
          :key="t.value"
          :class="{ on: selectedTypes.includes(t.value) }"
          class="sam__chip"
          type="button"
          @click="toggleType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="sam__note">
        只读拉取券商数据，不触发任何交易指令；同步期间账户级加锁，
        可随时取消（已写入批次自动回滚）。权限码 acc:sync:exec。
      </div>
      <div v-if="startError" class="sam__error">{{ startError }}</div>
    </div>

    <!-- ============ 阶段二：执行进度 ============ -->
    <div v-else-if="phase === 'running'" class="sam">
      <div class="sam__run-head">
        <div>
          <div class="sam__task">TASK {{ task?.taskCode ?? '—' }}</div>
          <div class="sam__step">当前步骤：{{ task?.currentStep ?? '—' }}</div>
        </div>
        <div class="sam__pct">{{ progress }}%</div>
      </div>
      <div class="sam__bar">
        <i :style="{ width: `${progress}%` }"></i>
      </div>
      <div class="sam__steps">
        <div
          v-for="(step, i) in SYNC_STEPS"
          :key="step"
          :class="{
            done:
              i < stepIndex || (task?.status === 'RUNNING' && progress >= 100),
            now: i === stepIndex && isRunning,
          }"
          class="sam__step-item"
        >
          <span class="sam__step-ico">{{
            i < stepIndex ? '✓' : i === stepIndex && isRunning ? '◌' : ''
          }}</span>
          {{ step }}
        </div>
      </div>
      <div class="sam__note">只读拉取、可取消回滚；关闭弹窗任务不会中断。</div>
    </div>

    <!-- ============ 阶段三：终态 ============ -->
    <div v-else class="sam">
      <div class="sam__run-head">
        <div>
          <div class="sam__task">TASK {{ task?.taskCode ?? '—' }}</div>
          <div class="sam__step">
            {{
              task?.status === 'SUCCESS'
                ? `同步完成 · ${task?.results?.length ?? 0} 个账户`
                : task?.status === 'CANCELLED'
                  ? '已取消'
                  : startError || task?.errMsg || '同步失败'
            }}
          </div>
        </div>
        <span
          :class="`sam__pill sam__pill--${(task?.status ?? 'FAILED').toLowerCase()}`"
        >
          {{
            task?.status === 'SUCCESS'
              ? '成功'
              : task?.status === 'CANCELLED'
                ? '已取消'
                : '失败'
          }}
        </span>
      </div>
      <div
        class="sam__bar"
        :class="{ 'sam__bar--cancel': task?.status === 'CANCELLED' }"
      >
        <i :style="{ width: task?.status === 'SUCCESS' ? '100%' : '0%' }"></i>
      </div>

      <!-- 单账户结果：成功/部分失败都渲染，失败行显示原因 -->
      <div v-if="task?.results?.length" class="sam__results">
        <div v-for="r in task.results" :key="r.accountCode" class="sam__result">
          <span
            :class="
              r.status === 'SUCCESS' ? 'sam__check--ok' : 'sam__check--fail'
            "
            class="sam__check"
            >{{ r.status === 'SUCCESS' ? '✓' : '✗' }}</span>
          <span class="sam__name">{{
            r.accountName || accountNameOf(r.accountCode)
          }}</span>
          <span class="sam__code">{{ resultLine(r) }}</span>
        </div>
      </div>
      <div v-else-if="task?.status === 'CANCELLED'" class="sam__note">
        未写入本次数据 · 已写入批次已回滚。可重新发起同步。
      </div>
      <div v-else-if="task?.status !== 'SUCCESS'" class="sam__error">
        {{ task?.errMsg || startError || '同步失败，请稍后重试' }}
      </div>
    </div>

    <template #footer>
      <div class="sam-footer">
        <!-- 准备态 -->
        <template v-if="phase === 'prep'">
          <span class="sam-footer__note">触发方式 MANUAL · 同步锁账户级串行</span>
          <div class="sam-footer__btns">
            <Button @click="handleClose">取消</Button>
            <Button type="primary" @click="handleStart">开始同步</Button>
          </div>
        </template>
        <!-- 执行态 -->
        <template v-else-if="phase === 'running'">
          <span class="sam-footer__note">约 8 秒完成 · 期间数据只读</span>
          <div class="sam-footer__btns">
            <Button class="sam-footer__danger" danger @click="handleCancel">
              取消同步
            </Button>
            <Button type="primary" @click="handleBackground">后台运行</Button>
          </div>
        </template>
        <!-- 终态 -->
        <template v-else>
          <span class="sam-footer__note">同步结果已写入账户台账</span>
          <div class="sam-footer__btns">
            <Button type="primary" @click="handleClose">关闭</Button>
          </div>
        </template>
      </div>
    </template>
  </BasicModal>
</template>

<style scoped>
.sam {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px;
}

.sam__group {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: var(--font-body);
  font-weight: var(--font-weight-strong);
  color: hsl(var(--foreground));
}

.sam__group span {
  font-size: var(--font-small);
  font-weight: var(--font-weight-normal);
  color: hsl(var(--muted-foreground));
}

.sam__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sam__row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  background: hsl(var(--muted) / 40%);
  border: 1px solid transparent;
  border-radius: 8px;
}

.sam__row.on {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary) / 50%);
}

.sam__check {
  display: inline-flex;
  flex: 0 0 16px;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: var(--font-small);
  color: hsl(var(--primary-foreground));
  background: hsl(var(--muted) / 80%);
  border-radius: 4px;
}

.sam__row.on .sam__check {
  background: hsl(var(--primary));
}

.sam__check--ok {
  color: hsl(152deg 60% 38%);
  background: hsl(152deg 60% 92%);
}

.sam__check--fail {
  color: hsl(0deg 60% 42%);
  background: hsl(0deg 72% 95%);
}

.sam__name {
  font-size: var(--font-title);
  font-weight: var(--font-weight-medium);
  color: hsl(var(--foreground));
}

.sam__code {
  margin-left: auto;
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.sam__empty {
  padding: 14px;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.sam__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sam__chip {
  padding: 5px 12px;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: hsl(var(--muted) / 50%);
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
}

.sam__chip.on {
  font-weight: var(--font-weight-strong);
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.sam__note {
  padding: 8px 12px;
  font-size: var(--font-small);
  line-height: 1.7;
  color: hsl(213deg 60% 45%);
  background: hsl(213deg 80% 96%);
  border-radius: 8px;
}

.sam__error {
  padding: 8px 12px;
  font-size: var(--font-body);
  color: hsl(0deg 60% 45%);
  background: hsl(0deg 70% 96%);
  border-radius: 8px;
}

/* ---- 执行进度 ---- */
.sam__run-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.sam__task {
  font-size: var(--font-body);
  font-weight: var(--font-weight-strong);
  color: hsl(var(--foreground));
}

.sam__step {
  margin-top: 2px;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
}

.sam__pct {
  font-size: var(--font-kpi);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  color: hsl(var(--primary));
}

.sam__bar {
  position: relative;
  height: 8px;
  overflow: hidden;
  background: hsl(var(--muted) / 70%);
  border-radius: 999px;
}

.sam__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, hsl(var(--primary)), hsl(250deg 70% 62%));
  border-radius: 999px;
  transition: width 0.4s ease;
}

.sam__bar--cancel i {
  background: hsl(38deg 92% 50%);
}

.sam__steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sam__step-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  border-radius: 7px;
}

.sam__step-item.done {
  color: hsl(152deg 60% 32%);
  background: hsl(152deg 55% 94%);
}

.sam__step-item.now {
  font-weight: var(--font-weight-strong);
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
}

.sam__step-ico {
  width: 16px;
  font-size: var(--font-body);
  text-align: center;
}

.sam__results {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sam__result {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--muted) / 40%);
  border-radius: 8px;
}

.sam__pill {
  padding: 3px 10px;
  font-size: var(--font-small);
  font-weight: var(--font-weight-strong);
  border-radius: 999px;
}

.sam__pill--success {
  color: hsl(152deg 60% 32%);
  background: hsl(152deg 55% 92%);
}

.sam__pill--cancelled {
  color: hsl(38deg 80% 35%);
  background: hsl(38deg 92% 92%);
}

.sam__pill--failed {
  color: hsl(0deg 60% 42%);
  background: hsl(0deg 72% 95%);
}

.sam-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.sam-footer__note {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.sam-footer__btns {
  display: inline-flex;
  gap: 8px;
  margin-left: auto;
}

.sam-footer__danger {
  --ant-danger-color: hsl(0deg 72% 51%);
}
</style>
