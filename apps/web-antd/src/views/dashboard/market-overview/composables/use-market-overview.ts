import type {
  HeatDimension,
  MarketOverview,
  MarketOverviewQuery,
} from '../data/types';

import { computed, onMounted, ref, shallowRef } from 'vue';

import { fetchMarketOverview } from '../api/market-overview';
import {
  buildIndexCards,
  heatTilesOf,
  subtitleOf,
  turnoverVs5dPctOf,
  upSharePctOf,
  volumeBarsOf,
} from '../data/selectors';

/**
 * 市场概览（1.3）数据装配
 * ---------------------------------------------------------------------------
 * 页面只跟这个 composable 打交道：data / loading / error / refresh。
 * 数据源（演示 or 接口）由 api/market-overview.ts 决定，此处不感知。
 */
export function useMarketOverview() {
  /** 聚合数据（整体替换，避免深层响应式带来的无谓开销） */
  const data = shallowRef<MarketOverview | null>(null);
  const loading = ref(false);
  const error = ref('');

  /** 指数行情条 */
  const indexCards = computed(() =>
    data.value ? buildIndexCards(data.value) : [],
  );

  /** 热力树图（当前维度由页面组件持有，按值取） */
  function heatOf(dimension: HeatDimension) {
    return { tiles: data.value ? heatTilesOf(data.value, dimension) : [] };
  }

  /** 上涨占比（%） */
  const upSharePct = computed(() =>
    data.value ? upSharePctOf(data.value) : 0,
  );

  /** 量能柱 */
  const volumeBars = computed(() =>
    data.value ? volumeBarsOf(data.value) : [],
  );

  /** 两市成交额较 5 日均量（%，由柱图数据反推，与柱图同源） */
  const turnoverVs5dPct = computed(() =>
    data.value ? turnoverVs5dPctOf(data.value) : 0,
  );

  /** 页头副标题 */
  const subtitle = computed(() => (data.value ? subtitleOf(data.value) : ''));

  async function load(query: MarketOverviewQuery = {}): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      data.value = await fetchMarketOverview(query);
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '未知错误';
      window.message.error(`市场概览加载失败：${error.value}`);
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
    heatOf,
    indexCards,
    loading,
    load,
    refresh: load,
    subtitle,
    turnoverVs5dPct,
    upSharePct,
    volumeBars,
  };
}
