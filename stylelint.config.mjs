export default {
  extends: ['@vben/stylelint-config'],
  root: true,
  overrides: [
    {
      /**
       * 统一字体排版 Token 约束（styles/typography.css）：
       * dashboard / accounts 业务模块禁止写死 font-size / font-weight 字面量，
       * 必须引用 var(--font-*)，防止两套排版体系再次分叉。
       */
      customSyntax: 'postcss-html',
      files: [
        'apps/web-antd/src/views/dashboard/**/*.{vue,css,scss}',
        'apps/web-antd/src/views/accounts/**/*.{vue,css,scss}',
      ],
      rules: {
        'declaration-property-value-allowed-list': {
          '/^font-size$/': [
            'var(--font-tiny)',
            'var(--font-small)',
            'var(--font-body)',
            'var(--font-title)',
            'var(--font-base)',
            'var(--font-value)',
            'var(--font-page)',
            'var(--font-kpi)',
            'var(--font-kpi-dec)',
            'inherit',
          ],
          '/^font-weight$/': [
            'var(--font-weight-normal)',
            'var(--font-weight-medium)',
            'var(--font-weight-strong)',
            'inherit',
          ],
        },
      },
    },
  ],
};
