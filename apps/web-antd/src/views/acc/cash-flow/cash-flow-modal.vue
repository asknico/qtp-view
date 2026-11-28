<script setup lang="ts">
import type { FormInstance } from 'antdv-next';
import type { Rule } from 'antdv-next/dist/form/types';

import type { AccountOption, CashFlowSave } from '#/api/acc/cash-flow/model';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { cloneDeep } from '@vben/utils';

import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  RadioGroup,
  Select,
  TimePicker,
} from 'antdv-next';
import dayjs from 'dayjs';

import {
  cashFlowAccountOptions,
  cashFlowAdd,
  cashFlowInfo,
  cashFlowUpdate,
} from '#/api/acc/cash-flow';
import { useBeforeCloseDiff } from '#/utils/popup';

import { MANUAL_FLOW_TYPE_OPTIONS } from './data';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => (isUpdate.value ? '修改流水' : '新增流水'));

/** 银证转账类：展示银行名称字段 */
const isTransferType = computed(() =>
  ['IN_TRANSFER', 'OUT_TRANSFER'].includes(formData.value.flowType ?? ''),
);

/** 手工调整（ADJUST）：字典未定义方向，需显式选择流入/流出 */
const needDirection = computed(() => formData.value.flowType === 'ADJUST');

/**
 * 表单数据类型（字段口径对齐 t_acc_cash_flow 手工可写字段）
 * <p>DatePicker/TimePicker 配置了 value-format，模型值为字符串（YYYY-MM-DD / HH:mm）
 */
interface FormData {
  id?: number;
  accountCode?: string;
  flowDate?: string;
  flowTime?: string;
  flowType?: string;
  direction?: 0 | 1;
  amount?: number;
  bankName?: string;
  remark?: string;
}

const defaultValues: FormData = {
  id: undefined,
  accountCode: undefined,
  flowDate: dayjs().format('YYYY-MM-DD'),
  flowTime: undefined,
  flowType: 'IN_TRANSFER',
  direction: 1,
  amount: undefined,
  bankName: '',
  remark: '',
};

const formData = ref<FormData>({ ...defaultValues });

/** 打开弹窗时的初始快照，供【重置】恢复 */
const initialSnapshot = ref<FormData>({ ...defaultValues });

/** 账户下拉选项（打开弹窗时加载） */
const accountOptions = ref<AccountOption[]>([]);

type AntdFormRules<T> = Partial<Record<keyof T, Rule[]>> & {
  [key: string]: Rule[];
};

const formRules = ref<AntdFormRules<FormData>>({
  accountCode: [{ required: true, message: '请选择账户' }],
  flowDate: [{ required: true, message: '请选择发生日期' }],
  flowType: [{ required: true, message: '请选择流水类型' }],
  direction: [{ required: true, message: '请选择资金方向' }],
  amount: [
    { required: true, message: '请输入金额' },
    {
      // 必须为 async（返回 Promise），否则 antd 按 callback 风格处理导致 validate 永不结束
      validator: async (_rule: unknown, value: number) => {
        if (value !== undefined && value !== null && value <= 0) {
          throw new Error(
            '金额必须大于 0（方向由流水类型自动推导，无需输入负号）',
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
    const options = await cashFlowAccountOptions();
    accountOptions.value = options.filter((o) => o.accountStatus === 'ACTIVE');

    const { id } = modalApi.getData() as { id?: number | string };
    isUpdate.value = !!id;
    if (isUpdate.value && id) {
      const record = await cashFlowInfo(id);
      formData.value = {
        id: record.id,
        accountCode: record.accountCode,
        flowDate: record.flowDate ?? undefined,
        flowTime: record.flowTime ?? undefined,
        flowType: record.flowType,
        direction: (record.direction ?? undefined) as 0 | 1 | undefined,
        amount: record.amount,
        bankName: record.bankName ?? '',
        remark: record.remark ?? '',
      };
    } else {
      formData.value = { ...defaultValues };
    }
    initialSnapshot.value = cloneDeep(formData.value);
    await markInitialized();

    modalApi.modalLoading(false);
  },
});

/** 重置：恢复到打开弹窗时的初始值，清空校验提示 */
function handleReset() {
  formData.value = cloneDeep(initialSnapshot.value);
  formInstance.value?.clearValidate();
  // 重置后内容与初始一致，直接关闭不应弹未保存确认
  markInitialized();
}

async function handleConfirm() {
  try {
    modalApi.lock(true);
    await formInstance.value?.validate();
    const data: CashFlowSave = {
      id: formData.value.id,
      accountCode: formData.value.accountCode,
      flowDate: formData.value.flowDate ?? '',
      flowTime: formData.value.flowTime || undefined,
      flowType: formData.value.flowType ?? '',
      direction: needDirection.value ? formData.value.direction : undefined,
      amount: formData.value.amount ?? 0,
      bankName: formData.value.bankName || undefined,
      remark: formData.value.remark || undefined,
    };
    await (isUpdate.value ? cashFlowUpdate(data) : cashFlowAdd(data));
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
  formInstance.value?.resetFields();
  resetInitialized();
}
</script>

<template>
  <BasicModal :title="title">
    <Form layout="vertical" ref="formInstance" :model="formData">
      <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
        <FormItem
          label="账户"
          name="accountCode"
          :rules="formRules.accountCode"
          :extra="isUpdate ? '账户不可修改' : ''"
        >
          <Select
            v-model:value="formData.accountCode"
            :disabled="isUpdate"
            :options="
              accountOptions.map((o) => ({
                label: `${o.displayName}（${o.accountCode}）`,
                value: o.accountCode,
              }))
            "
            show-search
            option-filter-prop="label"
            placeholder="选择券商账户"
          />
        </FormItem>
        <FormItem label="流水类型" name="flowType" :rules="formRules.flowType">
          <Select
            v-model:value="formData.flowType"
            :options="MANUAL_FLOW_TYPE_OPTIONS"
            placeholder="选择流水类型"
          />
        </FormItem>
        <FormItem label="发生日期" name="flowDate" :rules="formRules.flowDate">
          <DatePicker
            v-model:value="formData.flowDate"
            class="w-full!"
            value-format="YYYY-MM-DD"
          />
        </FormItem>
        <FormItem label="发生时间" name="flowTime">
          <TimePicker
            v-model:value="formData.flowTime"
            class="w-full!"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选填"
          />
        </FormItem>
        <FormItem
          v-if="needDirection"
          label="资金方向"
          name="direction"
          :rules="formRules.direction"
          extra="手工调整类型需显式指定方向"
        >
          <RadioGroup
            v-model:value="formData.direction"
            button-style="solid"
            option-type="button"
            :options="[
              { label: '流入', value: 1 },
              { label: '流出', value: 0 },
            ]"
          />
        </FormItem>
        <FormItem
          label="金额（元）"
          name="amount"
          :rules="formRules.amount"
          :extra="needDirection ? '' : '方向由流水类型自动推导，请输入正数'"
        >
          <InputNumber
            v-model:value="formData.amount"
            class="w-full!"
            :min="0"
            :precision="2"
            placeholder="大于 0 的正数"
          />
        </FormItem>
        <FormItem v-if="isTransferType" label="银行名称" name="bankName">
          <Input
            v-model:value="formData.bankName"
            :maxlength="64"
            placeholder="如 工商银行"
          />
        </FormItem>
        <FormItem label="备注" name="remark">
          <Input
            v-model:value="formData.remark"
            :maxlength="500"
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
