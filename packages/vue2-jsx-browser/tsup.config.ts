import { copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  clean: true,
  dts: false,
  entry: {
    index: 'src/index.ts',
  },
  esbuildOptions(options) {
    options.define = {
      'process.env.NODE_ENV': '"production"',
    };
    // Replace Node.js 'assert' with our CommonJS shim
    // Using .cjs file ensures it's treated as CommonJS and exports a callable function
    options.alias = {
      assert: resolve(__dirname, 'src/assert-shim.cjs'),
    };
  },

  // Keep @babel/core external, but bundle everything else
  external: ['@babel/core'],

  format: ['esm', 'cjs'],

  // Bundle all dependencies
  noExternal: [
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

  onSuccess: async () => {
    // Copy handwritten .d.ts to dist
    copyFileSync('src/index.d.ts', 'dist/index.d.ts');
  },

  // Use 'neutral' platform for universal compatibility
  // The assert module is aliased to our browser-compatible shim
  platform: 'neutral',

  sourcemap: true,
  splitting: false,
  treeshake: true,
});
