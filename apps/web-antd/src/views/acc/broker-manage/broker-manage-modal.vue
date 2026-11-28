<script setup lang="ts">
import type { FormInstance } from 'antdv-next';
import type { Rule } from 'antdv-next/dist/form/types';

import type { BrokerManageSave } from '#/api/acc/broker-manage/model';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { cloneDeep } from '@vben/utils';

import {
  Button,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  RadioGroup,
  Select,
} from 'antdv-next';
import { pick } from 'lodash-es';

import {
  brokerManageAdd,
  brokerManageCheckCodeUnique,
  brokerManageInfo,
  brokerManageUpdate,
} from '#/api/acc/broker-manage';
import { useBeforeCloseDiff } from '#/utils/popup';

import {
  BROKER_TYPE_OPTIONS,
  MARKET_OPTIONS,
  TRADE_CHANNEL_OPTIONS,
} from './data';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => (isUpdate.value ? '编辑券商' : '新建券商'));

/**
 * 表单数据类型（字段口径对齐 t_acc_broker）
 */
interface FormData {
  id?: number;
  brokerCode?: string;
  brokerName?: string;
  shortName?: string;
  brokerType?: string;
  licenseNo?: string;
  website?: string;
  servicePhone?: string;
  appName?: string;
  defaultTradeChannel?: string;
  defaultCommissionRate?: number;
  defaultMinCommission?: number;
  defaultAllIn?: number;
  exchangeFeeRate?: number;
  settleCycle?: string;
  supportMarkets?: string[];
  brokerStatus?: string;
  orderNum?: number;
  remark?: string;
}

const defaultValues: FormData = {
  id: undefined,
  brokerCode: '',
  brokerName: '',
  shortName: '',
  brokerType: 'SECURITIES',
  licenseNo: '',
  website: '',
  servicePhone: '',
  appName: '',
  defaultTradeChannel: 'IMPORT',
  defaultCommissionRate: 0.000_25,
  defaultMinCommission: 5,
  defaultAllIn: 1,
  exchangeFeeRate: 0.000_054_1,
  settleCycle: 'T1',
  supportMarkets: ['SH'],
  brokerStatus: 'ACTIVE',
  orderNum: undefined,
  remark: '',
};

const formData = ref<FormData>({ ...defaultValues });

/**
 * 体系绑定只读信息（预算分配 2.4 · 券商-资金池-银行卡体系，编辑模式回显）：
 * 银行卡为券商级多张、资金池为券商级一对一，均在各自页面维护，此处只展示绑定状态。
 */
const bindingInfo = ref<{
  cardCount: number;
  poolBound: boolean;
  poolText: string;
}>({
  cardCount: 0,
  poolBound: false,
  poolText: '',
});

/** 打开弹窗时的初始快照（新建=默认值+推荐排序号；编辑=记录原值），供【重置】恢复 */
const initialSnapshot = ref<FormData>({ ...defaultValues });

type AntdFormRules<T> = Partial<Record<keyof T, Rule[]>> & {
  [key: string]: Rule[];
};

const formRules = ref<AntdFormRules<FormData>>({
  brokerCode: [
    { required: true, message: '请输入券商编码' },
    {
      pattern: /^[A-Z0-9]{2,8}$/,
      message: '2–8 位大写字母或数字，全局唯一（如 HTZQ）',
    },
    {
      // 编码查重：光标离开时查库校验，重复则字段下方提示（提交时也会再次校验兜底）
      trigger: 'blur',
      validator: async (_rule: unknown, value: string) => {
        const code = (value ?? '').trim();
        if (!code || !/^[A-Z0-9]{2,8}$/.test(code) || isUpdate.value) {
          return;
        }
        const available = await brokerManageCheckCodeUnique(code);
        if (!available) {
          throw new Error(`券商编码已存在：${code}，请更换`);
        }
      },
    },
  ],
  brokerName: [{ required: true, message: '请输入券商全称' }],
  brokerType: [{ required: true, message: '请选择机构类型' }],
  defaultTradeChannel: [{ required: true, message: '请选择默认交易方式' }],
  defaultCommissionRate: [{ required: true, message: '请输入默认佣金费率' }],
  defaultMinCommission: [{ required: true, message: '请输入默认最低佣金' }],
  defaultAllIn: [{ required: true, message: '请选择佣金口径' }],
});

const formInstance = ref<FormInstance>();

/** 佣金率「万」提示：0.00025 → 万 2.50 */
const rateWanHint = computed(() => {
  const r = formData.value.defaultCommissionRate;
  if (r === null || r === undefined || Number.isNaN(r)) {
    return '请输入小数佣金率（0–1）';
  }
  return `万 ${(r * 10_000).toFixed(2)}（${r}）`;
});

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
  class: 'w-[760px]',
  fullscreenButton: false,
  onBeforeClose,
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return null;
    }
    modalApi.modalLoading(true);

    const { id, nextOrderNum } = modalApi.getData() as {
      id?: number | string;
      nextOrderNum?: number;
    };
    isUpdate.value = !!id;
    if (isUpdate.value && id) {
      const record = await brokerManageInfo(id);
      bindingInfo.value = {
        cardCount: record.cardCount ?? 0,
        poolBound: Boolean(record.poolBound),
        poolText: record.poolText ?? '',
      };
      const filterRecord = pick(record, [
        'id',
        'brokerCode',
        'brokerName',
        'shortName',
        'brokerType',
        'licenseNo',
        'website',
        'servicePhone',
        'appName',
        'defaultTradeChannel',
        'defaultCommissionRate',
        'defaultMinCommission',
        'defaultAllIn',
        'exchangeFeeRate',
        'settleCycle',
        'supportMarkets',
        'brokerStatus',
        'orderNum',
        'remark',
      ]);
      formData.value = {
        ...defaultValues,
        ...(filterRecord as FormData),
        supportMarkets: record.supportMarkets ?? [],
      };
    } else {
      // 新建：默认排序号 = 当前列表最大排序号 + 1（由列表页传入）
      bindingInfo.value = { cardCount: 0, poolBound: false, poolText: '' };
      formData.value = {
        ...defaultValues,
        supportMarkets: [...(defaultValues.supportMarkets ?? [])],
        orderNum: nextOrderNum,
      };
    }
    initialSnapshot.value = cloneDeep(formData.value);
    await markInitialized();

    modalApi.modalLoading(false);
  },
});

/** 重置：恢复到打开弹窗时的初始值（编码、费率等全部还原），清空校验提示 */
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
    const data = cloneDeep(formData.value) as BrokerManageSave;
    // 支持市场：数组 → 逗号分隔（后端为逗号分隔字段）
    data.supportMarkets = (formData.value.supportMarkets ?? []).join(',');
    await (isUpdate.value ? brokerManageUpdate(data) : brokerManageAdd(data));
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
  formData.value = {
    ...defaultValues,
    supportMarkets: [...(defaultValues.supportMarkets ?? [])],
  };
  formInstance.value?.resetFields();
  resetInitialized();
}
</script>

<template>
  <BasicModal :title="title">
    <Form layout="vertical" ref="formInstance" :model="formData">
      <Divider plain class="mb-3! mt-0!" title-placement="left">
        基础信息<span class="ml-2 text-xs text-gray-400">编码全局唯一，保存后不可修改</span>
      </Divider>
      <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
        <FormItem
          label="券商编码"
          name="brokerCode"
          :rules="formRules.brokerCode"
        >
          <Input
            v-model:value="formData.brokerCode"
            :disabled="isUpdate"
            :maxlength="8"
            placeholder="如 HTZQ"
            class="uppercase!"
          />
        </FormItem>
        <FormItem
          label="券商全称"
          name="brokerName"
          :rules="formRules.brokerName"
        >
          <Input
            v-model:value="formData.brokerName"
            :maxlength="64"
            placeholder="如 华泰证券股份有限公司"
          />
        </FormItem>
        <FormItem label="简称" name="shortName">
          <Input
            v-model:value="formData.shortName"
            :maxlength="32"
            placeholder="前端显示，如 华泰"
          />
        </FormItem>
        <FormItem
          label="机构类型"
          name="brokerType"
          :rules="formRules.brokerType"
        >
          <RadioGroup
            v-model:value="formData.brokerType"
            button-style="solid"
            option-type="button"
            :options="BROKER_TYPE_OPTIONS"
          />
        </FormItem>
        <FormItem label="状态" name="brokerStatus">
          <RadioGroup
            v-model:value="formData.brokerStatus"
            button-style="solid"
            option-type="button"
            :options="[
              { label: '启用', value: 'ACTIVE' },
              { label: '停用', value: 'INACTIVE' },
            ]"
          />
        </FormItem>
        <FormItem label="排序号" name="orderNum">
          <InputNumber
            v-model:value="formData.orderNum"
            class="w-full!"
            :min="0"
            :precision="0"
            placeholder="券商下拉选项按排序号升序展示"
          />
        </FormItem>
        <FormItem label="许可证号" name="licenseNo">
          <Input
            v-model:value="formData.licenseNo"
            :maxlength="64"
            placeholder="经营证券业务许可证号"
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

      <Divider plain class="mb-3!" title-placement="left">联系与渠道</Divider>
      <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
        <FormItem label="客服电话" name="servicePhone">
          <Input
            v-model:value="formData.servicePhone"
            :maxlength="32"
            placeholder="如 95587"
          />
        </FormItem>
        <FormItem label="官网地址" name="website">
          <Input
            v-model:value="formData.website"
            :maxlength="200"
            placeholder="https://..."
          />
        </FormItem>
        <FormItem label="官方交易 App" name="appName">
          <Input
            v-model:value="formData.appName"
            :maxlength="64"
            placeholder="如 涨乐财富通"
          />
        </FormItem>
        <FormItem
          label="默认交易方式"
          name="defaultTradeChannel"
          :rules="formRules.defaultTradeChannel"
        >
          <RadioGroup
            v-model:value="formData.defaultTradeChannel"
            button-style="solid"
            option-type="button"
            :options="TRADE_CHANNEL_OPTIONS"
          />
        </FormItem>
      </div>

      <Divider plain class="mb-3!" title-placement="left">
        默认费率与交收<span class="ml-2 text-xs text-gray-400">账户可单独覆盖，此处为新建账户默认带入</span>
      </Divider>
      <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
        <FormItem
          label="默认佣金率"
          name="defaultCommissionRate"
          :rules="formRules.defaultCommissionRate"
          :extra="rateWanHint"
        >
          <InputNumber
            v-model:value="formData.defaultCommissionRate"
            class="w-full!"
            :min="0"
            :max="1"
            :precision="8"
            :step="0.0001"
          />
        </FormItem>
        <FormItem
          label="默认最低佣金（元）"
          name="defaultMinCommission"
          :rules="formRules.defaultMinCommission"
        >
          <InputNumber
            v-model:value="formData.defaultMinCommission"
            class="w-full!"
            :min="0"
            :precision="2"
          />
        </FormItem>
        <FormItem
          label="佣金口径"
          name="defaultAllIn"
          :rules="formRules.defaultAllIn"
        >
          <RadioGroup
            v-model:value="formData.defaultAllIn"
            button-style="solid"
            option-type="button"
            :options="[
              { label: '全佣', value: 1 },
              { label: '净佣', value: 0 },
            ]"
          />
        </FormItem>
        <FormItem label="规费标准" name="exchangeFeeRate">
          <InputNumber
            v-model:value="formData.exchangeFeeRate"
            class="w-full!"
            :min="0"
            :max="1"
            :precision="8"
            :step="0.00001"
            placeholder="交易所统一标准"
          />
        </FormItem>
        <FormItem label="交收周期" name="settleCycle">
          <RadioGroup
            v-model:value="formData.settleCycle"
            button-style="solid"
            option-type="button"
            :options="[
              { label: 'T+1', value: 'T1' },
              { label: 'T+0', value: 'T0' },
            ]"
          />
        </FormItem>
        <FormItem label="支持市场" name="supportMarkets">
          <Select
            v-model:value="formData.supportMarkets"
            mode="multiple"
            :options="MARKET_OPTIONS"
            placeholder="选择支持的市场"
            :max-tag-count="5"
          />
        </FormItem>
      </div>

      <!-- 体系绑定（只读回显，编辑模式）：银行卡/资金池在对应页面维护 -->
      <template v-if="isUpdate">
        <Divider plain class="mb-3!" title-placement="left">
          资金池与银行卡（体系绑定）<span class="ml-2 text-xs text-gray-400">预算分配 2.4 · 券商级一对一 · 只读回显</span>
        </Divider>
        <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
          <FormItem label="绑定银行卡">
            <Input
              :value="`卡 ${bindingInfo.cardCount} 张（券商级主数据）`"
              disabled
            />
          </FormItem>
          <FormItem label="资金池">
            <Input
              :value="
                bindingInfo.poolBound
                  ? `已绑定 · ${bindingInfo.poolText}`
                  : '未绑定 · 请在「券商账户 → 券商资金池配置」中配置'
              "
              disabled
            />
          </FormItem>
        </div>
      </template>
    </Form>
    <template #prepend-footer>
      <Button class="mr-auto" @click="handleReset">重 置</Button>
    </template>
  </BasicModal>
</template>
