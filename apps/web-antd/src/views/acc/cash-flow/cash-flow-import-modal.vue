<script setup lang="ts">
import type { FormInstance } from 'antdv-next';
import type { UploadFile } from 'antdv-next/dist/upload/interface';

import type {
  AccountOption,
  CashFlowImportResult,
} from '#/api/acc/cash-flow/model';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Select,
  Typography,
  Upload,
} from 'antdv-next';

import { cashFlowAccountOptions, cashFlowImport } from '#/api/acc/cash-flow';

const emit = defineEmits<{ reload: [] }>();

const formInstance = ref<FormInstance>();
const formData = ref<{ accountCode?: string }>({});
const fileList = ref<UploadFile[]>([]);
const result = ref<CashFlowImportResult>();
const accountOptions = ref<AccountOption[]>([]);

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[560px]',
  fullscreenButton: false,
  onConfirm: handleImport,
  confirmText: '开始导入',
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return null;
    }
    result.value = undefined;
    fileList.value = [];
    formData.value = {};
    modalApi.modalLoading(true);
    const options = await cashFlowAccountOptions();
    accountOptions.value = options.filter((o) => o.accountStatus === 'ACTIVE');
    modalApi.modalLoading(false);
  },
});

function beforeUpload(file: UploadFile) {
  // 手动上传：选文件后不自动发请求，确认时统一提交
  fileList.value = [file];
  return false;
}

async function handleImport() {
  try {
    modalApi.lock(true);
    await formInstance.value?.validate();
    if (!fileList.value[0]?.originFileObj) {
      window.message.warning('请选择导入文件');
      return;
    }
    const fd = new FormData();
    fd.append('file', fileList.value[0].originFileObj as File);
    fd.append('accountCode', formData.value.accountCode ?? '');
    fd.append('importType', 'MANUAL_TEMPLATE');
    result.value = await cashFlowImport(fd);
    window.message.success('导入完成');
    emit('reload');
  } catch (error) {
    console.error(error);
  } finally {
    modalApi.lock(false);
  }
}

const statusMap: Record<
  string,
  { color: 'error' | 'info' | 'success' | 'warning'; text: string }
> = {
  SUCCESS: { color: 'success', text: '全部导入成功' },
  PARTIAL_SUCCESS: { color: 'warning', text: '部分导入成功' },
  FAILED: { color: 'error', text: '导入失败' },
};
</script>

<template>
  <BasicModal title="导入资金流水">
    <Form layout="vertical" ref="formInstance" :model="formData">
      <FormItem
        label="归属账户"
        name="accountCode"
        :rules="[{ required: true, message: '请选择归属账户' }]"
      >
        <Select
          v-model:value="formData.accountCode"
          :options="
            accountOptions.map((o) => ({
              label: `${o.accountName}（${o.accountCode}）`,
              value: o.accountCode,
            }))
          "
          show-search
          option-filter-prop="label"
          placeholder="选择流水归属的券商账户"
        />
      </FormItem>
      <FormItem label="导入文件" required>
        <Upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :max-count="1"
          accept=".xlsx,.xls"
        >
          <Button>选择 Excel 文件</Button>
        </Upload>
      </FormItem>
    </Form>
    <Alert
      class="mb-2"
      type="info"
      show-icon
      message="模板列：发生日期、发生时间、流水类型、金额、银行名称、备注；流水类型支持编码或中文（如 BUY_PAY / 买入扣款）。"
    />
    <Alert
      class="mb-2"
      type="warning"
      show-icon
      message="同一账户下按「日期+时间+类型+金额」指纹去重，重复行自动跳过，不会覆盖历史流水。"
    />
    <template v-if="result">
      <Alert
        class="mb-2"
        :type="statusMap[result.status]?.color || 'info'"
        show-icon
        :message="`${statusMap[result.status]?.text}：共 ${result.totalCount} 行，成功 ${result.successCount}，重复跳过 ${result.duplicateCount}，失败 ${result.failCount}（批次 ${result.importLogCode}）`"
      />
      <Typography v-if="result.failRows.length > 0">
        <div
          v-for="row in result.failRows.slice(0, 10)"
          :key="row"
          class="text-xs text-red-500"
        >
          {{ row }}
        </div>
      </Typography>
    </template>
  </BasicModal>
</template>
