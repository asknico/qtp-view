<script lang="ts" setup>
/**
 * 驾驶舱通用卡片外壳
 * ---------------------------------------------------------------------------
 * 资产总览 / 今日速览共用：标题 + 副标题 + 右侧操作 + 主体 + 页脚。
 * 只做排版，不含任何业务字段。
 */
interface Props {
  /** 主体区去掉内边距（表格类内容贴边） */
  flush?: boolean;
}

withDefaults(defineProps<Props>(), { flush: false });
</script>

<template>
  <section class="qtp-card">
    <header class="qtp-card__header">
      <div class="qtp-card__title">
        <slot name="title"></slot>
        <span v-if="$slots.sub" class="qtp-card__sub"><slot name="sub"></slot></span>
      </div>
      <div v-if="$slots.actions" class="qtp-card__actions">
        <slot name="actions"></slot>
      </div>
    </header>
    <div class="qtp-card__body" :class="{ 'qtp-card__body--flush': flush }">
      <slot></slot>
    </div>
    <footer v-if="$slots.footer" class="qtp-card__footer">
      <slot name="footer"></slot>
    </footer>
  </section>
</template>

<style scoped>
.qtp-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 80%);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
  transition: box-shadow 0.2s;
}

.qtp-card:hover {
  box-shadow: 0 3px 12px rgb(16 24 40 / 6%);
}

.qtp-card__header {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  padding: 10px 14px 9px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.qtp-card__title {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.qtp-card__sub {
  font-size: 11px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}

.qtp-card__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

.qtp-card__body {
  flex: 1;
  min-height: 0;
  padding: 12px 14px;
  overflow: hidden;
}

.qtp-card__body--flush {
  padding: 0;
}

.qtp-card__footer {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  padding: 7px 14px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 30%);
  border-top: 1px solid hsl(var(--border) / 50%);
}
</style>
