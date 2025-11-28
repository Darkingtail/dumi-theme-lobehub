/**
 * Browser-compatible Vue 2 JSX Babel plugins bundle
 *
 * This file bundles all Vue JSX plugins for browser use with @babel/standalone.
 * It avoids Node.js-specific operations like require("vue/package.json").
 *
 * Note: h injection is handled in browser.ts by adding `var h = require('vue').h;`
 * at the top of compiled JSX/TSX files. This works for both Options API and Composition API.
 */
import babelPluginTransformVueJsx from '@vue/babel-plugin-transform-vue-jsx';
import babelSugarFunctionalVue from '@vue/babel-sugar-functional-vue';
import babelSugarVModel from '@vue/babel-sugar-v-model';
import babelSugarVOn from '@vue/babel-sugar-v-on';

/**
 * Create Vue 2 JSX preset for browser use
 */
export function createVue2JsxPreset(
  _api: any,
  options: {
    functional?: boolean;
    vModel?: boolean;
    vOn?: boolean;
  } = {},
) {
  const { functional = true, vModel = true, vOn = true } = options;

  return {
    plugins: [
      functional && babelSugarFunctionalVue,
      vModel && babelSugarVModel,
      vOn && babelSugarVOn,
      babelPluginTransformVueJsx,
    ].filter(Boolean),
  };
}

// Export individual plugins for direct registration

// Default export for preset registration
export default createVue2JsxPreset;

export { default as babelPluginTransformVueJsx } from '@vue/babel-plugin-transform-vue-jsx';
export { default as babelSugarFunctionalVue } from '@vue/babel-sugar-functional-vue';
export { default as babelSugarVModel } from '@vue/babel-sugar-v-model';
export { default as babelSugarVOn } from '@vue/babel-sugar-v-on';
