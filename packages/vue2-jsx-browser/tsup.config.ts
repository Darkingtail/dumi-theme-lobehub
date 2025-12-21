import { copyFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: {
    index: 'src/index.ts',
  },
  // Shim Node.js built-ins for browser
esbuildOptions(options) {
    options.define = {
      'process.env.NODE_ENV': '"production"',
    };
  },
  
external: ['@babel/core'],
  
format: ['esm', 'cjs'],
  
// Bundle all dependencies for browser use
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
  

platform: 'browser',
  
  

sourcemap: true,
  
  
splitting: false,
  treeshake: true,
});
