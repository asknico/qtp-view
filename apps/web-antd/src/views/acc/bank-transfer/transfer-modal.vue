<script setup lang="ts">
import type { FormInstance } from 'antdv-next';
import type { Rule } from 'antdv-next/dist/form/types';

import type {
  BankCardOption,
  BankTransferSave,
} from '#/api/acc/bank-transfer/model';
import type { AccountOption } from '#/api/acc/cash-flow/model';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { cloneDeep } from '@vben/utils';

import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  TimePicker,
} from 'antdv-next';
import dayjs from 'dayjs';

import {
  bankTransferAccountOptions,
  bankTransferAdd,
  bankTransferBankCardOptions,
  bankTransferInfo,
  bankTransferUpdate,
} from '#/api/acc/bank-transfer';
import { useBeforeCloseDiff } from '#/utils/popup';

import { TRANSFER_TYPE_OPTIONS } from './data';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => (isUpdate.value ? '修改转账' : '登记转账'));

/**
 * 表单数据（字段口径对齐 /acc/bankBrokerTransfer/create、/update）
 * <p>DatePicker/TimePicker 配置了 value-format，模型值为字符串（YYYY-MM-DD / HH:mm）
 */
interface FormData {
  id?: number;
  accountCode?: string;
  bankAccountId?: number;
  transferType?: string;
  transferDate?: string;
  transferTime?: string;
  amount?: number;
  remark?: string;
}

const defaultValues: FormData = {
  id: undefined,
  accountCode: undefined,
  bankAccountId: undefined,
  transferType: 'IN_TRANSFER',
  transferDate: undefined,
  transferTime: undefined,
  amount: undefined,
  remark: '',
};

/** 新建默认值在打开弹窗时实时生成（日期/时间取当下，避免模块加载时固化） */
function buildCreateDefaults(): FormData {
  return {
    ...defaultValues,
    transferDate: dayjs().format('YYYY-MM-DD'),
    // 默认带出当前时间，避免出现“有日期没时间”的记录（仍可手动改/清空）
    transferTime: dayjs().format('HH:mm'),
  };
}

const formData = ref<FormData>({ ...defaultValues });

/** 打开弹窗时的初始快照，供【重置】恢复 */
const initialSnapshot = ref<FormData>({ ...defaultValues });

/** 账户下拉选项（打开弹窗时加载） */
const accountOptions = ref<AccountOption[]>([]);

/** 存管银行卡选项（随账户联动加载，仅 ACTIVE 且归属当前账户） */
const bankCardOptions = ref<BankCardOption[]>([]);
const bankCardLoading = ref(false);

/** 主卡标识后缀 */
function cardLabel(card: BankCardOption): string {
  return `${card.bankName}（${card.bankCardNo}）${card.isPrimary === 1 ? ' · 主卡' : ''}`;
}

async function loadBankCards(accountCode?: string) {
  const task = (async () => {
    bankCardOptions.value = [];
    if (!accountCode) {
      return;
    }
    bankCardLoading.value = true;
    try {
      bankCardOptions.value = await bankTransferBankCardOptions(accountCode);
      // 换账户后原卡不归属新账户，自动清空；默认选中主卡
      if (
        formData.value.bankAccountId &&
        !bankCardOptions.value.some(
          (c) => c.id === formData.value.bankAccountId,
        )
      ) {
        formData.value.bankAccountId = undefined;
      }
      if (!formData.value.bankAccountId) {
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

/** 进行中的卡列表加载任务：打开/重置时需等默认卡回填完成后再拍快照 */
let bankCardTask: null | Promise<void> = null;

watch(
  () => formData.value.accountCode,
  (val, old) => {
    // 编辑弹窗打开时由数据回填触发一次加载，不视为用户换账户
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
  bankAccountId: [{ required: true, message: '请选择存管银行卡' }],
  transferType: [{ required: true, message: '请选择转账方向' }],
  transferDate: [{ required: true, message: '请选择转账日期' }],
  amount: [
    { required: true, message: '请输入金额' },
    {
      // 必须为 async（返回 Promise），否则 antd 按 callback 风格处理导致 validate 永不结束
      validator: async (_rule: unknown, value: number) => {
        if (value !== undefined && value !== null && value <= 0) {
          throw new Error(
            '金额必须大于 0（方向由转账方向自动推导，无需输入负号）',
          );
        }
      },
    },
  ],
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
  class: 'w-[620px]',
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

    const { id, accountCode } = modalApi.getData() as {
      accountCode?: string;
      id?: number | string;
    };
    isUpdate.value = !!id;
    if (isUpdate.value && id) {
      const record = await bankTransferInfo(id);
      formData.value = {
        id: record.id,
        accountCode: record.accountCode,
        bankAccountId: undefined, // 由 watch(accountCode) 触发加载后按卡号回填
        transferType: record.transferType,
        transferDate: record.transferDate ?? undefined,
        transferTime: record.transferTime ?? undefined,
        amount: record.amount,
        remark: record.remark ?? '',
      };
    } else {
      // 从页头「券商账户」带入默认账户
      formData.value = { ...buildCreateDefaults(), accountCode };
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

/** 编辑模式：银行卡按卡号快照回填（列表行带 bankCardNo 脱敏快照） */
watch(bankCardOptions, (cards) => {
  if (isUpdate.value && !formData.value.bankAccountId && cards.length > 0) {
    // 优先按主卡回填；无卡数据时由用户手动选择
    formData.value.bankAccountId =
      cards.find((c) => c.isPrimary === 1)?.id ?? cards[0]?.id;
  }
});

/** 重置：恢复到打开弹窗时的初始值，清空校验提示 */
async function handleReset() {
  formData.value = cloneDeep(initialSnapshot.value);
  // 重置可能触发账户级联重新加载（默认卡回填），等它完成再拍快照
  await nextTick();
  await bankCardTask;
  formInstance.value?.clearValidate();
  // 重置后内容与初始一致，直接关闭不应弹未保存确认
  markInitialized();
}

async function handleConfirm() {
  try {
    modalApi.lock(true);
    await formInstance.value?.validate();
    const data: BankTransferSave = {
      id: formData.value.id,
      accountCode: formData.value.accountCode ?? '',
      bankAccountId: formData.value.bankAccountId,
      transferType: formData.value.transferType ?? '',
      transferDate: formData.value.transferDate ?? '',
      transferTime: formData.value.transferTime || undefined,
      amount: formData.value.amount ?? 0,
      remark: formData.value.remark || undefined,
    };
    await (isUpdate.value ? bankTransferUpdate(data) : bankTransferAdd(data));
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
          :extra="isUpdate ? '账户不可修改' : ''"
        >
          <Select
            v-model:value="formData.accountCode"
            :disabled="isUpdate"
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
          label="存管银行卡"
          name="bankAccountId"
          :rules="formRules.bankAccountId"
          extra="仅显示当前账户已绑定（ACTIVE）的三方存管银行卡"
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
            placeholder="选择存管银行卡"
          />
        </FormItem>
        <FormItem
          label="转账方向"
          name="transferType"
          :rules="formRules.transferType"
        >
          <Select
            v-model:value="formData.transferType"
            :options="TRANSFER_TYPE_OPTIONS"
            placeholder="银证转入 / 银证转出"
          />
        </FormItem>
        <FormItem
          label="转账金额（元）"
          name="amount"
          :rules="formRules.amount"
          extra="方向由转账方向自动推导，请输入正数"
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
          label="转账日期"
          name="transferDate"
          :rules="formRules.transferDate"
        >
          <DatePicker
            v-model:value="formData.transferDate"
            class="w-full!"
            value-format="YYYY-MM-DD"
          />
        </FormItem>
        <FormItem label="转账时间" name="transferTime">
          <TimePicker
            v-model:value="formData.transferTime"
            class="w-full!"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选填"
          />
        </FormItem>
        <FormItem label="备注" name="remark" class="lg:col-span-2">
          <Input
            v-model:value="formData.remark"
            :maxlength="500"
            placeholder="选填，如 加仓备用金"
          />
        </FormItem>
      </div>
    </Form>
    <template #prepend-footer>
      <Button class="mr-auto" @click="handleReset">重 置</Button>
    </template>
  </BasicModal>
</template>
