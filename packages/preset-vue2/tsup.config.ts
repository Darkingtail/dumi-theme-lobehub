import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      compiler: 'src/compiler/browser.ts',
    },
    // Bundle Vue 3's @vue/compiler-sfc browser version for <script setup> support
    // Also bundle Vue JSX plugins for TSX/JSX Live Editing support
    // The esm-browser.js is automatically selected due to the "import" export condition
    esbuildOptions(options) {
      options.conditions = ['import', 'browser'];
      options.mainFields = ['module', 'browser', 'main'];
    },
    format: 'esm',
    name: 'compiler',
    noExternal: [
      /@vue\/compiler-sfc/,
      /@vue\/compiler-dom/,
      /@vue\/compiler-core/,
      /@vue\/shared/,
      /@babel\/parser/,
      /estree-walker/,
      /source-map-js/,
      // Vue JSX plugins for browser bundling
      /@vue\/babel-plugin-transform-vue-jsx/,
      /@vue\/babel-sugar-functional-vue/,
      /@vue\/babel-sugar-v-model/,
      /@vue\/babel-sugar-v-on/,
      /@vue\/babel-helper-vue-jsx-merge-props/,
      /@babel\/plugin-syntax-jsx/,
      /@babel\/helper-plugin-utils/,
      /@babel\/helper-module-imports/,
      /lodash\.kebabcase/,
      /html-tags/,
      /svg-tags/,
    ],
    outDir: 'lib',
    platform: 'browser',
    target: 'esnext',
    treeshake: true,
  },
  {
    entry: {
      renderer: 'src/vue2/runtime/renderer.ts',
    },
    external: ['vue'],
    format: 'esm',
    name: 'renderer',
    outDir: 'lib',
    platform: 'browser',
    target: 'esnext',
    treeshake: true,
  },
  {
    entry: {
      preflight: 'src/vue2/runtime/preflight.ts',
    },
    external: ['vue'],
    format: 'esm',
    name: 'preflight',
    outDir: 'lib',
    platform: 'browser',
    target: 'esnext',
    treeshake: true,
  },
  {
    entry: ['src/vue2/runtime/runtimePlugin.ts'],
    format: 'esm',
    name: 'previewer',
    outDir: 'lib',
    platform: 'browser',
    target: 'esnext',
    treeshake: true,
  },
]);
