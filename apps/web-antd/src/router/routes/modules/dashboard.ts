import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      order: -1,
      title: $t('page.dashboard.title'),
    },
    name: 'Dashboard',
    path: '/dashboard',
    redirect: '/asset-overview',
    children: [
      {
        name: 'AssetOverview',
        path: '/asset-overview',
        component: () => import('#/views/dashboard/asset-overview/index.vue'),
        meta: {
          affixTab: true,
          title: $t('page.dashboard.assetOverview'),
        },
      },
      {
        name: 'Workspace',
        path: '/workspace',
        component: () => import('#/views/dashboard/workspace/index.vue'),
        meta: {
          title: $t('page.dashboard.workspace'),
        },
      },
    ],
  },
];

export default routes;
