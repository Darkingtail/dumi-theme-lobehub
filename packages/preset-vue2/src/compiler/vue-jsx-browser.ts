/**
 * Browser-compatible Vue 2 JSX Babel plugins bundle
 *
 * Re-exports from vue2-jsx-browser package for browser use with @babel/standalone.
 */
export type { Vue2JsxPreset,Vue2JsxPresetOptions } from 'vue2-jsx-browser';
export {
  babelPluginTransformVueJsx,
  babelSugarFunctionalVue,
  babelSugarVModel,
  babelSugarVOn,
  createVue2JsxPreset,
  default,
} from 'vue2-jsx-browser';
