import { defineConfig } from 'father';

export default defineConfig({
  cjs: {
    output: 'dist',
    ignores: ['src/vue2/runtime/**'],
  },
});
