import type {
  CustomDashboard,
  DashboardCardKey,
  DashboardCardMeta,
  DashboardLayout,
  DashboardParams,
  LayoutColumns,
  NavRange,
} from '../data/types';

import { computed, onMounted, ref, shallowRef } from 'vue';

import { fetchCustomDashboard } from '../api/custom-dashboard';
import {
  defaultLayoutOf,
  miniCardByKeyOf,
  visibleCardsOf,
} from '../data/selectors';

/** 布局持久化键：只存展示配置，不含任何账户信息 */
const STORAGE_KEY = 'qtp:custom-dashboard:layout:v1';

/** 布局导出文件格式版本 */
const EXPORT_VERSION = 1;

function cloneLayout(layout: DashboardLayout): DashboardLayout {
  return {
    columns: layout.columns,
    order: [...layout.order],
    visible: { ...layout.visible },
  };
}

/** 读取本地布局：缺失字段用默认值补齐（新增卡片自动出现） */
function readStoredLayout(data: CustomDashboard): DashboardLayout {
  const fallback = defaultLayoutOf(data);
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    const keys = new Set(data.cards.map((card) => card.key));
    const order = (parsed.order ?? []).filter((key) => keys.has(key));
    for (const card of data.cards) {
      if (!order.includes(card.key)) order.push(card.key);
    }
    const columns: LayoutColumns =
      parsed.columns === 1 || parsed.columns === 3 ? parsed.columns : 2;
    return {
      columns,
      order,
      visible: { ...fallback.visible, ...parsed.visible },
    };
  } catch {
    return fallback;
  }
}

/**
 * 自定义看板数据装配与布局草稿
 * ---------------------------------------------------------------------------
 * 显隐 / 排序 / 列数进入「草稿」，点「保存布局」才落库并生效；
 * 卡片参数（净值区间、刷新频率）属展示阈值，改动即时生效。
 */
export function useCustomDashboard() {
  const data = shallowRef<CustomDashboard | null>(null);
  const loading = ref(false);
  const error = ref('');

  const saved = ref<DashboardLayout | null>(null);
  const draft = ref<DashboardLayout | null>(null);
  const params = ref<DashboardParams>({ navRange: '3m', refreshMinutes: 5 });
  const dragKey = ref<'' | DashboardCardKey>('');

  const dirty = computed(
    () => JSON.stringify(saved.value) !== JSON.stringify(draft.value),
  );
  const columns = computed<LayoutColumns>(() => draft.value?.columns ?? 2);
  const miniCards = computed<DashboardCardMeta[]>(() => {
    if (!data.value || !draft.value) return [];
    return visibleCardsOf(data.value, draft.value, 'mini');
  });
  const panelCards = computed<DashboardCardMeta[]>(() => {
    if (!data.value || !draft.value) return [];
    return visibleCardsOf(data.value, draft.value, 'panel');
  });
  const hiddenCount = computed(() => {
    if (!draft.value) return 0;
    return Object.values(draft.value.visible).filter((v) => v === false).length;
  });
  const miniCardOf = computed(() =>
    data.value ? miniCardByKeyOf(data.value) : () => undefined,
  );

  async function load(): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      const payload = await fetchCustomDashboard();
      data.value = payload;
      const stored = readStoredLayout(payload);
      saved.value = cloneLayout(stored);
      draft.value = cloneLayout(stored);
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : '数据加载失败';
    } finally {
      loading.value = false;
    }
  }

  /** 显隐切换：常驻卡片忽略 */
  function toggleVisible(card: DashboardCardMeta): void {
    if (!draft.value || card.required) return;
    draft.value = {
      ...draft.value,
      visible: {
        ...draft.value.visible,
        [card.key]: draft.value.visible[card.key] === false,
      },
    };
  }

  function setColumns(value: LayoutColumns): void {
    if (!draft.value) return;
    draft.value = { ...draft.value, columns: value };
  }

  /** 拖拽排序：仅在同一分区内移动，跨区直接忽略 */
  function moveCard(from: DashboardCardKey, to: DashboardCardKey): void {
    if (!draft.value || !data.value || from === to) return;
    const zoneOf = (key: DashboardCardKey) =>
      data.value?.cards.find((card) => card.key === key)?.zone;
    if (zoneOf(from) !== zoneOf(to)) return;
    const next = draft.value.order.filter((key) => key !== from);
    const target = next.indexOf(to);
    next.splice(target === -1 ? next.length : target, 0, from);
    draft.value = { ...draft.value, order: next };
  }

  /** 保存布局：草稿落库 + 本地持久化 */
  function saveLayout(): void {
    if (!draft.value) return;
    saved.value = cloneLayout(draft.value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.value));
    }
  }

  /** 恢复默认：回到目录默认顺序与两列，仍需「保存布局」才生效 */
  function resetLayout(): void {
    if (!data.value) return;
    draft.value = defaultLayoutOf(data.value);
  }

  /** 导出布局：仅展示配置（显隐 / 排序 / 列数 / 卡片参数） */
  function exportLayout(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        layout: draft.value,
        params: params.value,
        version: EXPORT_VERSION,
      },
      null,
      2,
    );
  }

  /** 导入布局：校验版本与字段，失败返回错误文案 */
  function importLayout(text: string): string {
    if (!data.value) return '数据未就绪';
    try {
      const parsed = JSON.parse(text) as {
        layout?: Partial<DashboardLayout>;
        params?: Partial<DashboardParams>;
        version?: number;
      };
      if (parsed.version !== EXPORT_VERSION || !parsed.layout) {
        return '文件格式不支持（需由本页导出的 v1 布局）';
      }
      const keys = new Set(data.value.cards.map((card) => card.key));
      const order = (parsed.layout.order ?? []).filter((key) => keys.has(key));
      for (const card of data.value.cards) {
        if (!order.includes(card.key)) order.push(card.key);
      }
      const columns: LayoutColumns =
        parsed.layout.columns === 1 || parsed.layout.columns === 3
          ? parsed.layout.columns
          : 2;
      draft.value = {
        columns,
        order,
        visible: {
          ...defaultLayoutOf(data.value).visible,
          ...parsed.layout.visible,
        },
      };
      const range = parsed.params?.navRange;
      if (range === '1y' || range === '3m' || range === '6m') {
        params.value = { ...params.value, navRange: range };
      }
      return '';
    } catch {
      return 'JSON 解析失败，请检查文件内容';
    }
  }

  function setNavRange(range: NavRange): void {
    params.value = { ...params.value, navRange: range };
  }

  function setRefresh(minutes: number): void {
    params.value = { ...params.value, refreshMinutes: minutes };
  }

  onMounted(load);

  return {
    columns,
    data,
    dirty,
    draft,
    dragKey,
    error,
    exportLayout,
    hiddenCount,
    importLayout,
    loading,
    miniCardOf,
    miniCards,
    moveCard,
    panelCards,
    params,
    resetLayout,
    saveLayout,
    setColumns,
    setNavRange,
    setRefresh,
    toggleVisible,
  };
}
