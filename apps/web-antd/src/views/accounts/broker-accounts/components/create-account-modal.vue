<script lang="ts" setup>
import type {
  AccAccountCreatePayload,
  BrokerOption,
} from '../api/broker-accounts';

import { computed, onMounted, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Select } from 'antdv-next';

import { createAccount, fetchBrokerOptions } from '../api/broker-accounts';

/**
 * 新建券商账户弹窗（对齐设计稿 FORM · 2.1-A）
 * ---------------------------------------------------------------------------
 * 字段一一对应后端 AccAccountCreateBo；佣金费率/最低佣金/口径留空时，
 * 后端自动带出 t_acc_broker.default_* 券商默认值——前端只做提示，不做假默认。
 * 费率输入用「万 X.X」口径（与设计稿一致），提交前换算为小数。
 */
defineOptions({ name: 'CreateAccountModal' });

const emit = defineEmits<{ reload: [] }>();

const submitting = ref(false);

/** 表单状态（万 = 万分之几，如 1.2 → 万 1.2 → 0.00012） */
const form = reactive({
  accountName: '',
  accountNo: '',
  accountType: 'NORMAL' as 'MARGIN' | 'NORMAL' | 'OPTION',
  brokerCode: 'HTZQ',
  currency: 'CNY' as 'CNY' | 'HKD' | 'USD',
  isAllIn: 1 as 0 | 1,
  minCommissionWan: null as null | number,
  purpose: '',
  rateWan: null as null | number,
  remark: '',
});

/** 券商选项：API 拉取 t_acc_broker 券商档案（GET /acc/brokerAccount/getBrokerOptions），
 * 含默认费率，用于下拉展示与费率提示；请求失败回落前端预设兜底 */
const brokerOptions = ref<BrokerOption[]>([]);

/** 下拉框选项（label=简称，value=券商编码） */
const brokerSelectOptions = computed(() =>
  brokerOptions.value.map((b) => ({ label: b.name, value: b.code })),
);

/** 当前选中券商的默认费率预设（来自 t_acc_broker.default_* 字段） */
const brokerPreset = computed(() =>
  brokerOptions.value.find((b) => b.code === form.brokerCode),
);

/** 拉取券商选项；当前默认编码不在档案中时回落到第一个 */
async function loadBrokerOptions() {
  brokerOptions.value = await fetchBrokerOptions();
  if (
    brokerOptions.value.length > 0 &&
    !brokerOptions.value.some((b) => b.code === form.brokerCode)
  ) {
    form.brokerCode = brokerOptions.value[0]?.code ?? '';
  }
}

onMounted(loadBrokerOptions);

const ACCOUNT_TYPES = [
  { label: '普通', value: 'NORMAL' },
  { label: '两融', value: 'MARGIN' },
  { label: '期权', value: 'OPTION' },
] as const;

const CURRENCIES = [
  { label: 'CNY 人民币', value: 'CNY' },
  { label: 'HKD 港币', value: 'HKD' },
  { label: 'USD 美元', value: 'USD' },
] as const;

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[680px]',
  closeOnClickModal: false,
  confirmText: '创建账户',
  onOpenChange(isOpen) {
    if (isOpen) {
      resetForm();
      // 每次打开重新拉取，保证券商档案变更后下拉即时生效
      loadBrokerOptions();
    }
  },
  title: '新建券商账户',
});

function resetForm() {
  form.accountName = '';
  form.accountNo = '';
  form.accountType = 'NORMAL';
  form.brokerCode = 'HTZQ';
  form.currency = 'CNY';
  form.isAllIn = 1;
  form.minCommissionWan = null;
  form.purpose = '';
  form.rateWan = null;
  form.remark = '';
  submitting.value = false;
}

function handleReset() {
  resetForm();
  window.message?.info('已重置为券商默认预设');
}

async function handleSubmit() {
  if (!form.accountName.trim()) {
    window.message?.error('请填写账户别名');
    return;
  }
  submitting.value = true;
  try {
    const payload: AccAccountCreatePayload = {
      accountName: form.accountName.trim(),
      brokerCode: form.brokerCode,
      accountType: form.accountType,
      currency: form.currency,
      isAllInCommission: form.isAllIn,
    };
    if (form.accountNo.trim()) {
      payload.accountNo = form.accountNo.trim();
    }
    if (form.rateWan !== null && form.rateWan !== undefined) {
      // 万 X.X → 小数（如 1.2 → 0.00012），保留 8 位避免浮点尾差
      payload.commissionRate = Number((form.rateWan / 10_000).toFixed(8));
    }
    if (form.minCommissionWan !== null && form.minCommissionWan !== undefined) {
      payload.minCommission = form.minCommissionWan;
    }
    if (form.purpose.trim()) {
      payload.purpose = form.purpose.trim();
    }
    if (form.remark.trim()) {
      payload.remark = form.remark.trim();
    }
    const accountCode = await createAccount(payload);
    window.message?.success(
      `账户创建成功：${accountCode ?? ''}（资产与板块权限初始为空，可点「同步账户」拉取）`,
    );
    emit('reload');
    modalApi.close();
  } catch {
    // 错误提示已由 http 层统一弹出（含 traceId）
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BasicModal :close-on-click-modal="false" title="新建券商账户">
    <div class="cam">
      <!-- 基础信息 -->
      <div class="cam__group">基础信息</div>
      <div class="cam__row">
        <label class="cam__label">账户别名<i>*</i></label>
        <input
          v-model="form.accountName"
          class="cam__inp"
          maxlength="20"
          placeholder="如：主账户 / 打新仓"
          type="text"
        />
      </div>
      <div class="cam__row">
        <label class="cam__label">券商<i>*</i></label>
        <Select
          v-model:value="form.brokerCode"
          class="cam__select"
          :options="brokerSelectOptions"
          option-filter-prop="label"
          placeholder="请选择券商"
          show-search
        />
        <span v-if="brokerPreset" class="cam__tip">
          默认费率 万{{ brokerPreset.rateWan }} ·
          {{ brokerPreset.isAllIn === 1 ? '全佣' : '净佣' }}
        </span>
        <span v-else class="cam__tip">留空带出券商档案默认值</span>
      </div>
      <div class="cam__row">
        <label class="cam__label">资金账号</label>
        <input
          v-model="form.accountNo"
          class="cam__inp"
          placeholder="开户后自动生成 · 可后补"
          type="text"
        />
        <span class="cam__tip">列表导出时自动脱敏</span>
      </div>
      <div class="cam__row">
        <label class="cam__label">账户类型</label>
        <div class="cam__chips">
          <button
            v-for="t in ACCOUNT_TYPES"
            :key="t.value"
            :class="{ on: form.accountType === t.value }"
            class="cam__chip"
            type="button"
            @click="form.accountType = t.value"
          >
            {{ t.label }}
          </button>
        </div>
      </div>
      <div class="cam__row">
        <label class="cam__label">币种</label>
        <div class="cam__chips">
          <button
            v-for="c in CURRENCIES"
            :key="c.value"
            :class="{ on: form.currency === c.value }"
            class="cam__chip"
            type="button"
            @click="form.currency = c.value"
          >
            {{ c.label }}
          </button>
        </div>
      </div>

      <!-- 费率预设 -->
      <div class="cam__group">
        费率预设<span>选填 · 留空带出券商默认值</span>
      </div>
      <div class="cam__row">
        <label class="cam__label">佣金费率</label>
        <div class="cam__suffix">
          <input
            v-model.number="form.rateWan"
            class="cam__inp"
            min="0"
            :placeholder="
              brokerPreset
                ? `默认 万${brokerPreset.rateWan}`
                : '默认取券商档案值'
            "
            step="0.1"
            type="number"
          />
          <span>万</span>
        </div>
        <span class="cam__tip">净佣需另叠加规费 0.00541%</span>
      </div>
      <div class="cam__row">
        <label class="cam__label">最低佣金</label>
        <div class="cam__suffix">
          <input
            v-model.number="form.minCommissionWan"
            class="cam__inp"
            min="0"
            placeholder="默认 5"
            step="0.5"
            type="number"
          />
          <span>元/笔</span>
        </div>
      </div>
      <div class="cam__row">
        <label class="cam__label">佣金口径</label>
        <div class="cam__chips">
          <button
            :class="{ on: form.isAllIn === 1 }"
            class="cam__chip"
            type="button"
            @click="form.isAllIn = 1"
          >
            全佣（已含规费）
          </button>
          <button
            :class="{ on: form.isAllIn === 0 }"
            class="cam__chip"
            type="button"
            @click="form.isAllIn = 0"
          >
            净佣（另加规费）
          </button>
        </div>
      </div>

      <!-- 其他 -->
      <div class="cam__group">其他</div>
      <div class="cam__row">
        <label class="cam__label">用途</label>
        <input
          v-model="form.purpose"
          class="cam__inp"
          maxlength="30"
          placeholder="如：长线底仓 / 网格交易"
          type="text"
        />
      </div>
      <div class="cam__row cam__row--top">
        <label class="cam__label">备注</label>
        <textarea
          v-model="form.remark"
          class="cam__area"
          maxlength="200"
          placeholder="选填"
          rows="2"
        ></textarea>
      </div>

      <div class="cam__note">
        创建后账户资产与板块权限初始为空：点右上角「⟳ 同步账户」拉取资产，
        在「账户详情 ·
        权限台账」维护板块权限。资金账号开户后自动生成，列表导出自动脱敏。
      </div>
    </div>

    <template #footer>
      <div class="cam-footer">
        <span class="cam-footer__note">权限码 acc:brokerAccount:add · 创建将记录操作日志</span>
        <div class="cam-footer__btns">
          <Button @click="modalApi.close()">取消</Button>
          <Button @click="handleReset">清空重填</Button>
          <Button :loading="submitting" type="primary" @click="handleSubmit">
            创建账户
          </Button>
        </div>
      </div>
    </template>
  </BasicModal>
</template>

<style scoped>
.cam {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px;
}

.cam__group {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-top: 6px;
  font-size: var(--font-body);
  font-weight: var(--font-weight-strong);
  color: hsl(var(--foreground));
}

.cam__group:first-child {
  margin-top: 0;
}

.cam__group span {
  font-size: var(--font-small);
  font-weight: var(--font-weight-normal);
  color: hsl(var(--muted-foreground));
}

.cam__row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.cam__row--top {
  align-items: flex-start;
}

.cam__label {
  flex: 0 0 72px;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  text-align: right;
}

.cam__label i {
  margin-left: 2px;
  font-style: normal;
  color: hsl(0deg 72% 56%);
}

.cam__inp {
  width: 220px;
  height: 32px;
  padding: 0 10px;
  font-size: var(--font-body);
  color: hsl(var(--foreground));
  outline: none;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.cam__inp:focus {
  border-color: hsl(var(--primary));
}

.cam__inp::placeholder {
  color: hsl(var(--muted-foreground) / 70%);
}

.cam__suffix {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.cam__suffix span {
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
}

.cam__area {
  width: 100%;
  padding: 7px 10px;
  font-size: var(--font-body);
  color: hsl(var(--foreground));
  resize: vertical;
  outline: none;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.cam__area:focus {
  border-color: hsl(var(--primary));
}

.cam__chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 券商下拉框：宽度与文本输入框一致，字号对齐 13px 排版阶梯 */
.cam__select {
  width: 220px;
}

.cam__select :deep(.ant-select-selector) {
  font-size: var(--font-body);
}

.cam__chip {
  padding: 5px 12px;
  font-size: var(--font-body);
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: hsl(var(--muted) / 50%);
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
}

.cam__chip:hover {
  color: hsl(var(--foreground));
}

.cam__chip.on {
  font-weight: var(--font-weight-strong);
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.cam__tip {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.cam__note {
  padding: 8px 12px;
  margin-top: 4px;
  font-size: var(--font-small);
  line-height: 1.7;
  color: hsl(213deg 60% 45%);
  background: hsl(213deg 80% 96%);
  border-radius: 8px;
}

.cam-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.cam-footer__note {
  font-size: var(--font-small);
  color: hsl(var(--muted-foreground));
}

.cam-footer__btns {
  display: inline-flex;
  gap: 8px;
  margin-left: auto;
}
</style>
