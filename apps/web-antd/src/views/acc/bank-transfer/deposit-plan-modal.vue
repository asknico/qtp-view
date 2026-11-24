<script setup lang="ts">
import type { FormInstance } from 'antdv-next';
import type { Rule } from 'antdv-next/dist/form/types';

import type {
  BankCardOption,
  DepositPlanSave,
} from '#/api/acc/bank-transfer/model';
import type { AccountOption } from '#/api/acc/cash-flow/model';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { cloneDeep } from '@vben/utils';

import { Button, Form, FormItem, Input, InputNumber, Select } from 'antdv-next';

import {
  bankTransferAccountOptions,
  bankTransferBankCardOptions,
  depositPlanAdd,
  depositPlanUpdate,
} from '#/api/acc/bank-transfer';
import { useBeforeCloseDiff } from '#/utils/popup';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() =>
  isUpdate.value ? '修改入金计划' : '新建入金计划',
);

/** 账户是否锁定（跟随页头所选券商账户，不可切换） */
const accountLocked = ref(false);
const accountExtra = computed(() =>
  accountLocked.value
    ? '跟随页头所选券商账户，整页数据与该计划口径一致'
    : '定投入金的目标账户',
);

/**
 * 入金计划表单（字段口径对齐 /acc/bankBrokerTransfer/depositPlan/create、/update）
 */
interface FormData {
  id?: number;
  accountCode?: string;
  bankAccountId?: number;
  planName?: string;
  amount?: number;
  executeDay?: number;
  remark?: string;
}

const defaultValues: FormData = {
  id: undefined,
  accountCode: undefined,
  bankAccountId: undefined,
  planName: '每月定投',
  amount: undefined,
  executeDay: 1,
  remark: '',
};

const formData = ref<FormData>({ ...defaultValues });

/** 打开弹窗时的初始快照，供【重置】恢复 */
const initialSnapshot = ref<FormData>({ ...defaultValues });

/** 账户下拉选项（打开弹窗时加载） */
const accountOptions = ref<AccountOption[]>([]);

/** 出金银行卡选项（随账户联动加载，仅 ACTIVE 且归属当前账户） */
const bankCardOptions = ref<BankCardOption[]>([]);
const bankCardLoading = ref(false);

/** 进行中的卡列表加载任务：打开/重置时需等默认卡回填完成后再拍快照 */
let bankCardTask: null | Promise<void> = null;

async function loadBankCards(accountCode?: string) {
  const task = (async () => {
    bankCardOptions.value = [];
    if (!accountCode) {
      return;
    }
    bankCardLoading.value = true;
    try {
      bankCardOptions.value = await bankTransferBankCardOptions(accountCode);
      if (
        formData.value.bankAccountId &&
        !bankCardOptions.value.some(
          (c) => c.id === formData.value.bankAccountId,
        )
      ) {
        formData.value.bankAccountId = undefined;
      }
      // 仅新建时默认带出主卡；编辑保留用户已清空的选择
      if (!formData.value.bankAccountId && !isUpdate.value) {
        formData.value.bankAccountId = bankCardOptions.value.find(
          (c) => c.isPrimary === 1,
        )?.id;
      }
    } finally {
      bankCardLoading.value = false;
    }
  })();
  bankCardTask = task;
  return task;
}

function cardLabel(card: BankCardOption): string {
  return `${card.bankName}（${card.bankCardNo}）${card.isPrimary === 1 ? ' · 主卡' : ''}`;
}

watch(
  () => formData.value.accountCode,
  (val, old) => {
    if (val && val !== old) {
      loadBankCards(val);
    }
  },
);

type AntdFormRules<T> = Partial<Record<keyof T, Rule[]>> & {
  [key: string]: Rule[];
};

const formRules = ref<AntdFormRules<FormData>>({
  accountCode: [{ required: true, message: '请选择券商账户' }],
  // 常用出金卡为选填：核销按账户维度累计，卡仅作展示
  bankAccountId: [],
  amount: [
    { required: true, message: '请输入每期定投金额' },
    {
      validator: async (_rule: unknown, value: number) => {
        if (value !== undefined && value !== null && value <= 0) {
          throw new Error('定投金额必须大于 0');
        }
      },
    },
  ],
  executeDay: [{ required: true, message: '请设置每月执行日' }],
});

const formInstance = ref<FormInstance>();

function customFormValueGetter() {
  return JSON.stringify(formData.value);
}

const { onBeforeClose, markInitialized, resetInitialized } = useBeforeCloseDiff(
  {
    initializedGetter: customFormValueGetter,
    currentGetter: customFormValueGetter,
  },
);

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[560px]',
  fullscreenButton: false,
  onBeforeClose,
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return null;
    }
    modalApi.modalLoading(true);
    const options = await bankTransferAccountOptions();
    accountOptions.value = options.filter((o) => o.accountStatus === 'ACTIVE');

    // 编辑：整份计划数据由父组件 setData 传入（含账户/卡信息，无需再查详情）
    const plan = modalApi.getData() as null | {
      accountCode?: string;
      amount?: number;
      bankAccountId?: number;
      executeDay?: number;
      id?: number;
      planName?: null | string;
      remark?: null | string;
    };
    isUpdate.value = !!plan?.id; // 新建时 setData({}) 也是 truthy，必须按 id 判断
    // 账户始终锁定为页头所选券商账户（弹窗只从页面上下文发起，不允许切换）
    accountLocked.value = isUpdate.value || !!plan?.accountCode;
    if (plan?.id) {
      formData.value = {
        id: plan.id,
        accountCode: plan.accountCode,
        bankAccountId: plan.bankAccountId ?? undefined,
        planName: plan.planName ?? '每月定投',
        amount: plan.amount,
        executeDay: plan.executeDay,
        remark: plan.remark ?? '',
      };
      loadBankCards(plan.accountCode);
    } else {
      // 从页头「券商账户」带入默认账户
      formData.value = { ...defaultValues, accountCode: plan?.accountCode };
    }
    // 等级联加载与默认卡回填完成后再拍快照，避免关闭时误报"未保存的更改"
    await nextTick();
    await bankCardTask;
    await nextTick();
    initialSnapshot.value = cloneDeep(formData.value);
    await markInitialized();

    modalApi.modalLoading(false);
  },
});

/** 重置：恢复到打开弹窗时的初始值 */
async function handleReset() {
  formData.value = cloneDeep(initialSnapshot.value);
  // 重置可能触发账户级联重新加载（默认卡回填），等它完成再拍快照
  await nextTick();
  await bankCardTask;
  formInstance.value?.clearValidate();
  markInitialized();
}

async function handleConfirm() {
  try {
    modalApi.lock(true);
    await formInstance.value?.validate();
    const data: DepositPlanSave = {
      id: formData.value.id,
      accountCode: formData.value.accountCode ?? '',
      bankAccountId: formData.value.bankAccountId ?? undefined,
      planName: formData.value.planName || undefined,
      amount: formData.value.amount ?? 0,
      executeDay: formData.value.executeDay ?? 1,
      remark: formData.value.remark || undefined,
    };
    await (isUpdate.value ? depositPlanUpdate(data) : depositPlanAdd(data));
    resetInitialized();
    emit('reload');
    modalApi.close();
  } catch (error) {
    console.error(error);
  } finally {
    modalApi.lock(false);
  }
}

async function handleClosed() {
  formData.value = { ...defaultValues };
  bankCardOptions.value = [];
  formInstance.value?.resetFields();
  resetInitialized();
}
</script>

<template>
  <BasicModal :title="title">
    <Form layout="vertical" ref="formInstance" :model="formData">
      <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
        <FormItem
          label="券商账户"
          name="accountCode"
          :rules="formRules.accountCode"
          :extra="accountExtra"
        >
          <Select
            v-model:value="formData.accountCode"
            :disabled="accountLocked"
            :options="
              accountOptions.map((o) => ({
                label: `${o.accountName}（${o.accountCode}）`,
                value: o.accountCode,
              }))
            "
            show-search
            option-filter-prop="label"
            placeholder="选择券商账户"
          />
        </FormItem>
        <FormItem
          label="常用出金卡"
          name="bankAccountId"
          extra="选填，仅用于展示；核销按账户维度统计当月入金"
        >
          <Select
            v-model:value="formData.bankAccountId"
            :loading="bankCardLoading"
            :options="
              bankCardOptions.map((c) => ({
                label: cardLabel(c),
                value: c.id,
              }))
            "
            allow-clear
            placeholder="选填"
          />
        </FormItem>
        <FormItem
          label="每期定投金额（元）"
          name="amount"
          :rules="formRules.amount"
        >
          <InputNumber
            v-model:value="formData.amount"
            class="w-full!"
            :min="0"
            :precision="2"
            placeholder="大于 0 的正数"
          />
        </FormItem>
        <FormItem
          label="每月执行日"
          name="executeDay"
          :rules="formRules.executeDay"
          extra="1-31 日；当月无该日时按月末执行（如 31 日 → 2 月末）"
        >
          <InputNumber
            v-model:value="formData.executeDay"
            class="w-full!"
            :max="31"
            :min="1"
            :precision="0"
            placeholder="1-31"
          />
        </FormItem>
        <FormItem label="计划名称" name="planName">
          <Input
            v-model:value="formData.planName"
            :maxlength="64"
            placeholder="默认：每月定投"
          />
        </FormItem>
        <FormItem label="备注" name="remark">
          <Input.TextArea
            v-model:value="formData.remark"
            :maxlength="500"
            :rows="1"
            placeholder="选填"
          />
        </FormItem>
      </div>
    </Form>
    <template #prepend-footer>
      <Button class="mr-auto" @click="handleReset">重 置</Button>
    </template>
  </BasicModal>
</template>
