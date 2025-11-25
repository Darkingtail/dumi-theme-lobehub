import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      compiler: 'src/compiler/browser.ts',
    },
    // External: packages that are available in browser runtime
external: ['vue-template-compiler', '@vue/component-compiler-utils'],
    
format: 'esm',
    
name: 'compiler',
    
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
