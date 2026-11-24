import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getPopupContainer } from '@vben/utils';

/**
 * 银证转账（2.3）页面配置 —— 对齐设计稿 09_2.3银证转账.html
 */

/** 转账方向（transferType 仅两类，服务端推导 direction） */
export const TRANSFER_TYPE_OPTIONS = [
  { label: '银证转入', value: 'IN_TRANSFER' },
  { label: '银证转出', value: 'OUT_TRANSFER' },
];

/** 来源类型 */
export const SOURCE_TYPE_OPTIONS = [
  { label: '导入', value: 'IMPORT' },
  { label: '手工', value: 'MANUAL' },
  { label: '系统', value: 'SYSTEM' },
];

export const TRANSFER_TYPE_MAP = new Map(
  TRANSFER_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);
export const SOURCE_TYPE_MAP = new Map(
  SOURCE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'RangePicker',
    fieldName: 'transferDateRange',
    label: '日期范围',
    componentProps: { allowClear: true, valueFormat: 'YYYY-MM-DD' },
  },
  // 账户筛选已上移到页头「券商账户」切换器（整页联动），此处不再提供账户下拉
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: TRANSFER_TYPE_OPTIONS,
      placeholder: '全部方向',
    },
    fieldName: 'transferType',
    label: '转账方向',
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: SOURCE_TYPE_OPTIONS,
      placeholder: '请选择',
    },
    fieldName: 'sourceType',
    label: '来源',
  },
  {
    component: 'Input',
    fieldName: 'keyword',
    label: '关键字',
    componentProps: {
      allowClear: true,
      placeholder: '银行 / 卡号 / 备注模糊匹配',
    },
  },
];

export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 50 },
  {
    title: '日期时间',
    field: 'transferDate',
    width: 130,
    slots: { default: 'transferDate' },
  },
  {
    title: '账户',
    field: 'accountName',
    minWidth: 120,
    showOverflow: true,
  },
  {
    title: '方向',
    field: 'transferTypeName',
    width: 100,
    align: 'center',
    slots: { default: 'transferType' },
  },
  {
    title: '金额',
    field: 'signedAmount',
    width: 120,
    align: 'right',
    slots: { default: 'signedAmount' },
  },
  {
    title: '银行 / 卡号',
    field: 'bankName',
    minWidth: 150,
    showOverflow: true,
    slots: { default: 'bankCard' },
  },
  {
    title: '余额',
    field: 'balanceAfter',
    width: 100,
    align: 'right',
    slots: { default: 'balanceAfter' },
  },
  {
    title: '备注',
    field: 'remark',
    minWidth: 140,
    showOverflow: true,
    slots: { default: 'remark' },
  },
  {
    title: '来源',
    field: 'sourceTypeName',
    width: 80,
    align: 'center',
    slots: { default: 'sourceType' },
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    resizable: false,
    width: 120,
  },
];
