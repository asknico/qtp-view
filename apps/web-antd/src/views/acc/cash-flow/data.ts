import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getPopupContainer } from '@vben/utils';

import { cashFlowAccountOptions } from '#/api/acc/cash-flow';

/**
 * 资金流水（2.2）页面配置 —— 对齐设计稿 08_2.2资金流水.html
 */

/** 流水类型（CASH_FLOW_TYPE 字典 24 项，与后端 FLOW_TYPE_TEXT 一致） */
export const FLOW_TYPE_OPTIONS = [
  { label: '银证转入', value: 'IN_TRANSFER' },
  { label: '银证转出', value: 'OUT_TRANSFER' },
  { label: '买入扣款', value: 'BUY_PAY' },
  { label: '卖出回款', value: 'SELL_RECV' },
  { label: '佣金', value: 'COMMISSION' },
  { label: '印花税', value: 'STAMP_TAX' },
  { label: '过户费', value: 'TRANSFER_FEE' },
  { label: '规费', value: 'EXCHANGE_FEE' },
  { label: '红利入账', value: 'DIVIDEND' },
  { label: '股息利息', value: 'INTEREST' },
  { label: '融资买入', value: 'MARGIN_BUY' },
  { label: '融券卖出', value: 'SHORT_SELL' },
  { label: '融资还款', value: 'MARGIN_REPAY' },
  { label: '融券还券', value: 'SHORT_RETURN' },
  { label: '融资利息', value: 'MARGIN_INTEREST' },
  { label: '新股中签缴款', value: 'IPO_PAY' },
  { label: '新股退款', value: 'IPO_REFUND' },
  { label: '可转债缴款', value: 'BOND_PAY' },
  { label: '可转债退款', value: 'BOND_REFUND' },
  { label: '配股缴款', value: 'RIGHTS_PAY' },
  { label: '冻结', value: 'FREEZE' },
  { label: '解冻', value: 'UNFREEZE' },
  { label: '手工调整', value: 'ADJUST' },
  { label: '其他费用', value: 'FEE_OTHER' },
];

/** 手工新增可选类型（买卖/勾稽类流水由交割单导入产生，不提供手工入口） */
export const MANUAL_FLOW_TYPE_OPTIONS = [
  { label: '银证转入', value: 'IN_TRANSFER' },
  { label: '银证转出', value: 'OUT_TRANSFER' },
  { label: '红利入账', value: 'DIVIDEND' },
  { label: '股息利息', value: 'INTEREST' },
  { label: '手工调整', value: 'ADJUST' },
  { label: '其他费用', value: 'FEE_OTHER' },
  { label: '冻结', value: 'FREEZE' },
  { label: '解冻', value: 'UNFREEZE' },
];

/** 来源类型 */
export const SOURCE_TYPE_OPTIONS = [
  { label: '导入', value: 'IMPORT' },
  { label: '手工', value: 'MANUAL' },
  { label: '系统', value: 'SYSTEM' },
];

/** 资金方向 */
export const DIRECTION_OPTIONS = [
  { label: '流入', value: 1 },
  { label: '流出', value: 0 },
];

/** 市场类型 */
export const MARKET_OPTIONS = [
  { label: '沪 SH', value: 'SH' },
  { label: '深 SZ', value: 'SZ' },
  { label: '北 BJ', value: 'BJ' },
  { label: '港 HK', value: 'HK' },
  { label: '美 US', value: 'US' },
];

export const FLOW_TYPE_MAP = new Map(
  FLOW_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);
export const SOURCE_TYPE_MAP = new Map(
  SOURCE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'RangePicker',
    fieldName: 'flowDateRange',
    label: '日期范围',
    componentProps: { allowClear: true, valueFormat: 'YYYY-MM-DD' },
  },
  {
    component: 'ApiSelect',
    fieldName: 'accountCode',
    label: '账户',
    componentProps: {
      allowClear: true,
      api: cashFlowAccountOptions,
      labelField: 'accountName',
      valueField: 'accountCode',
      showSearch: true,
      optionFilterProp: 'accountName',
      getPopupContainer,
      placeholder: '全部账户',
    },
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      showSearch: true,
      optionFilterProp: 'label',
      options: FLOW_TYPE_OPTIONS,
      placeholder: '全部类型',
    },
    fieldName: 'flowType',
    label: '流水类型',
  },
  {
    component: 'Select',
    componentProps: {
      getPopupContainer,
      allowClear: true,
      options: DIRECTION_OPTIONS,
      placeholder: '请选择',
    },
    fieldName: 'direction',
    label: '资金方向',
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
      placeholder: '标的 / 银行 / 备注模糊匹配',
    },
  },
];

export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 50 },
  {
    title: '日期',
    field: 'flowDate',
    width: 120,
    slots: { default: 'flowDate' },
  },
  {
    title: '账户',
    field: 'accountName',
    minWidth: 130,
    showOverflow: true,
  },
  {
    title: '流水类型',
    field: 'flowTypeName',
    width: 110,
    slots: { default: 'flowType' },
  },
  {
    title: '发生金额',
    field: 'signedAmount',
    width: 120,
    align: 'right',
    slots: { default: 'signedAmount' },
  },
  {
    title: '资金余额',
    field: 'balanceAfter',
    width: 110,
    align: 'right',
    slots: { default: 'balanceAfter' },
  },
  {
    title: '关联标的',
    field: 'linkName',
    width: 110,
    slots: { default: 'linkName' },
  },
  {
    title: '对手方 / 说明',
    field: 'counterpartyDesc',
    minWidth: 170,
    align: 'left',
    showOverflow: true,
    slots: { default: 'counterpartyDesc' },
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
