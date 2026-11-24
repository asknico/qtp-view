import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      order: 1,
      title: $t('page.acc.title'),
    },
    name: 'Acc',
    path: '/acc',
    redirect: '/acc/broker-accounts',
    children: [
      {
        name: 'BrokerAccounts',
        path: '/acc/broker-accounts',
        component: () => import('#/views/acc/broker-accounts/index.vue'),
        meta: {
          title: $t('page.acc.brokerAccounts'),
        },
      },
      {
        name: 'CashFlow',
        path: '/acc/cash-flow',
        component: () => import('#/views/acc/cash-flow/index.vue'),
        meta: {
          title: $t('page.acc.cashFlow'),
        },
      },
      {
        name: 'BankTransfer',
        path: '/acc/bank-transfer',
        component: () => import('#/views/acc/bank-transfer/index.vue'),
        meta: {
          title: $t('page.acc.bankTransfer'),
        },
      },
      {
        name: 'BrokerManage',
        path: '/acc/broker-manage',
        component: () => import('#/views/acc/broker-manage/index.vue'),
        meta: {
          title: $t('page.acc.brokerManage'),
        },
      },
    ],
  },
];

export default routes;
