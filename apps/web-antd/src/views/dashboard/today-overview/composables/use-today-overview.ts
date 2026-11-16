import type { TodayOverview, TodayOverviewQuery } from '../data/types';

import { computed, onMounted, ref, shallowRef } from 'vue';

import { fetchTodayOverview } from '../api/today-overview';
import { buildKpiCards } from '../data/selectors';

/**
 * 今日速览（1.2）数据装配
 * ---------------------------------------------------------------------------
 * 页面只跟这个 composable 打交道：data / loading / error / refresh。
 * 数据源（演示 or 接口）由 api/today-overview.ts 决定，此处不感知。
 *
 * 预留能力：
 *   - load({ date, accountId }) 支持按日 / 按账户重载；
 *   - 已做并发保护，连点「刷新」不会堆叠请求。
 */
export function useTodayOverview() {
  /** 聚合数据（整体替换，避免深层响应式带来的无谓开销） */
  const data = shallowRef<null | TodayOverview>(null);
  const loading = ref(false);
  const error = ref('');

  /** KPI 卡由数据派生，接口返回后自动重算 */
  const kpiCards = computed(() =>
    data.value ? buildKpiCards(data.value) : [],
  );

  async function load(query: TodayOverviewQuery = {}): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      data.value = await fetchTodayOverview(query);
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '未知错误';
      window.message.error(`今日速览加载失败：${error.value}`);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    if (!data.value) void load();
  });

  return {
    data,
    error,
    kpiCards,
    loading,
    load,
    refresh: load,
  };
}
