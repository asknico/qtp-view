<script setup lang="ts">
import type { FormInstance } from 'antdv-next';
import type { UploadFile } from 'antdv-next/dist/upload/interface';

import type { BankTransferImportResult } from '#/api/acc/bank-transfer/model';
import type { AccountOption } from '#/api/acc/cash-flow/model';

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

import {
  bankTransferAccountOptions,
  bankTransferImport,
} from '#/api/acc/bank-transfer';

const emit = defineEmits<{ reload: [] }>();

const formInstance = ref<FormInstance>();
const formData = ref<{ accountCode?: string }>({});
const fileList = ref<UploadFile[]>([]);
const result = ref<BankTransferImportResult>();
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
    // 归属账户锁定为页头所选券商账户（setData 传入），弹窗内不可变更
    const data = modalApi.getData() as null | { accountCode?: string };
    formData.value = { accountCode: data?.accountCode };
    modalApi.modalLoading(true);
    const options = await bankTransferAccountOptions();
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
    result.value = await bankTransferImport(fd);
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
  <BasicModal title="导入转账记录">
    <Form layout="vertical" ref="formInstance" :model="formData">
      <FormItem
        label="归属账户"
        name="accountCode"
        :rules="[{ required: true, message: '请选择归属账户' }]"
        extra="跟随页头所选券商账户，导入记录归属该账户"
      >
        <Select
          v-model:value="formData.accountCode"
          disabled
          :options="
            accountOptions.map((o) => ({
              label: `${o.accountName}（${o.accountCode}）`,
              value: o.accountCode,
            }))
          "
          show-search
          option-filter-prop="label"
          placeholder="选择转账归属的券商账户"
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
      message="模板列：转账日期、转账时间、转账类型、转账金额、银行名称、银行卡号、备注；转账类型支持 银证转入 / 银证转出（或 IN_TRANSFER / OUT_TRANSFER）。"
    />
    <Alert
      class="mb-2"
      type="warning"
      show-icon
      message="仅导入银证转入/转出两类；同一账户下按「日期+时间+类型+金额」指纹去重，重复行自动跳过，不会覆盖历史流水。"
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
