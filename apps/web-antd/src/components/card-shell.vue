<script lang="ts" setup>
/**
 * QTP 通用卡片外壳（公共组件）
 * -------------------------------------------------------------------------
 * 驾驶舱（dashboard）与账户与资金（accounts）共用：标题 + 副标题 + 右侧操作 + 主体 + 页脚。
 * 只做排版，不含任何业务字段。字号使用 styles/typography.css 的统一 Token。
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

/* 头部高度钉死 42px：标题 16px 的行高显式声明，
   避免字号上调后各卡片头部高度随内容浮动，导致并排卡片标题不在同一基线 */
.qtp-card__header {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  height: 42px;
  padding: 0 14px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.qtp-card__title {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  font-size: var(--font-title);
  font-weight: var(--font-weight-strong);
  line-height: 22px;
  white-space: nowrap;
}

.qtp-card__sub {
  font-size: var(--font-small);
  font-weight: var(--font-weight-normal);
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

/* 页脚 32px：12px 文字配 8px 上下内边距，保证与表格行高节奏一致 */
.qtp-card__footer {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  font-size: var(--font-small);
  line-height: 18px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 30%);
  border-top: 1px solid hsl(var(--border) / 50%);
}
</style>
