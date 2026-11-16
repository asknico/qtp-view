import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      order: 1,
      title: $t('page.accounts.title'),
    },
    name: 'Accounts',
    path: '/accounts',
    redirect: '/accounts/broker-accounts',
    children: [
      {
        name: 'BrokerAccounts',
        path: '/accounts/broker-accounts',
        component: () => import('#/views/accounts/broker-accounts/index.vue'),
        meta: {
          title: $t('page.accounts.brokerAccounts'),
        },
      },
    ],
  },
];

export default routes;
