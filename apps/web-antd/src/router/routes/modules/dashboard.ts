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
        name: 'TodayOverview',
        path: '/today-overview',
        component: () => import('#/views/dashboard/today-overview/index.vue'),
        meta: {
          title: $t('page.dashboard.todayOverview'),
        },
      },
      {
        name: 'MarketOverview',
        path: '/market-overview',
        component: () => import('#/views/dashboard/market-overview/index.vue'),
        meta: {
          title: $t('page.dashboard.marketOverview'),
        },
      },
      {
        name: 'GoalsProgress',
        path: '/goals-progress',
        component: () => import('#/views/dashboard/goals-progress/index.vue'),
        meta: {
          title: $t('page.dashboard.goalsProgress'),
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
