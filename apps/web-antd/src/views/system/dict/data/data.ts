import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { DictData } from '#/api/system/dict/dict-data-model';

import { renderDictTag } from '#/utils/render';

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'dictName',
    label: '字典名称',
  },
];

export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 60 },
  {
    title: '字典名称',
    field: 'cssClass',
    slots: {
      default: ({ row }) => {
        const { dictCode } = row as DictData;
        return renderDictTag(dictCode, [row]);
      },
    },
  },
  {
    title: '字典编码',
    field: 'dictCode',
  },
  {
    title: '字典值',
    field: 'dictValue',
  },
  {
    title: '字典排序',
    field: 'dictSort',
  },
  {
    title: '备注',
    field: 'remark',
  },
  {
    title: '创建时间',
    field: 'createTime',
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    resizable: false,
    width: 'auto',
  },
];

export const drawerSchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    dependencies: {
      show: () => false,
      triggerFields: [''],
    },
    fieldName: 'dictId',
  },
  {
    component: 'Input',
    componentProps: {
      disabled: true,
    },
    fieldName: 'dictType',
    label: '字典类型',
  },
  {
    component: 'Input',
    fieldName: 'listClass',
    label: '标签样式',
  },
  {
    component: 'Input',
    fieldName: 'dictName',
    label: '字典名称',
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'dictCode',
    label: '字典编码',
    rules: 'required',
  },
  {
    component: 'Textarea',
    componentProps: {
      maxlength: 2000,
      showCount: true,
      rows: 2,
    },
    fieldName: 'dictValue',
    formItemClass: 'items-start',
    help: '业务扩展值，最长 2000 字符',
    label: '字典值',
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '可使用tailwind类名 如bg-blue w-full h-full等',
    },
    fieldName: 'cssClass',
    formItemClass: 'items-start',
    help: '标签的css样式, 可添加已经编译的css类名',
    label: 'css类名',
  },
  {
    component: 'InputNumber',
    fieldName: 'dictSort',
    label: '显示排序',
    rules: 'required',
    defaultValue: 1,
    componentProps: {
      class: 'flex-1',
    },
  },
  {
    component: 'Textarea',
    fieldName: 'remark',
    formItemClass: 'items-start',
    label: '备注',
  },
];
