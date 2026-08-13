import { defineConfig } from 'vitest/config';

// 只跑纯 TS 单元测试。.astro 组件不在这里测，靠 npm run build + 产物断言验证。
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
