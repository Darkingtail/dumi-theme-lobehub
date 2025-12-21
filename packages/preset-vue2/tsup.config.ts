import { type Options, defineConfig } from 'tsup';

// Shared base configuration for all browser bundles
const browserBase: Partial<Options> = {
  format: 'esm',
  outDir: 'lib',
  platform: 'browser',
  target: 'esnext',
  treeshake: true,
};

// Shared configuration for Vue runtime bundles (renderer, preflight, runtimePlugin)
const vueRuntimeBase: Partial<Options> = {
  ...browserBase,
  external: ['vue'],
};

export default defineConfig([
  // Browser compiler bundle - includes @vue/compiler-sfc and Vue JSX plugins
  {
    ...browserBase,
    entry: { compiler: 'src/compiler/browser.ts' },
    // Bundle Vue 3's @vue/compiler-sfc browser version for <script setup> support
    // Also bundle Vue JSX plugins for TSX/JSX Live Editing support
    // The esm-browser.js is automatically selected due to the "import" export condition
    esbuildOptions(options) {
      options.conditions = ['import', 'browser'];
      options.mainFields = ['module', 'browser', 'main'];
    },

    name: 'compiler',
    noExternal: [
      // Vue compiler dependencies
      /@vue\/compiler-sfc/,
      /@vue\/compiler-dom/,
      /@vue\/compiler-core/,
      /@vue\/shared/,
      /@babel\/parser/,
      /estree-walker/,
      /source-map-js/,
      // Vue 2 JSX browser bundle (fixed plugin + sugar plugins)
      /vue2-jsx-browser/,
      /@vue\/babel-plugin-transform-vue-jsx/,
      /@vue\/babel-sugar-functional-vue/,
      /@vue\/babel-sugar-v-model/,
      /@vue\/babel-sugar-v-on/,
      /@vue\/babel-helper-vue-jsx-merge-props/,
      /@babel\/plugin-syntax-jsx/,
      /@babel\/helper-plugin-utils/,
      /@babel\/helper-module-imports/,
      /lodash.kebabcase/,
      /html-tags/,
      /svg-tags/,
    ],
  },
  // Vue 2 renderer - handles component mounting
  {
    ...vueRuntimeBase,
    entry: { renderer: 'src/vue2/runtime/renderer.ts' },
    name: 'renderer',
  },
  // Preflight - environment setup before rendering
  {
    ...vueRuntimeBase,
    entry: { preflight: 'src/vue2/runtime/preflight.ts' },
    name: 'preflight',
  },
  // Runtime plugin - dumi previewer integration
  {
    ...vueRuntimeBase,
    entry: ['src/vue2/runtime/runtimePlugin.ts'],
    name: 'previewer',
  },
]);
