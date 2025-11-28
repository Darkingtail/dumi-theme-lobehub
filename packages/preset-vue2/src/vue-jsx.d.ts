/**
 * Type declarations for Vue 2 JSX babel plugins
 * These packages don't ship with TypeScript declarations
 */

declare module '@vue/babel-plugin-transform-vue-jsx' {
  import type { PluginObj } from '@babel/core';

  const plugin: () => PluginObj;
  export default plugin;
}

declare module '@vue/babel-sugar-functional-vue' {
  import type { PluginObj } from '@babel/core';

  const plugin: () => PluginObj;
  export default plugin;
}

declare module '@vue/babel-sugar-v-model' {
  import type { PluginObj } from '@babel/core';

  const plugin: () => PluginObj;
  export default plugin;
}

declare module '@vue/babel-sugar-v-on' {
  import type { PluginObj } from '@babel/core';

  const plugin: () => PluginObj;
  export default plugin;
}
