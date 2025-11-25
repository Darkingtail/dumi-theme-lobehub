import type { IPreflightFn } from 'dumi/dist/client/theme-api';
import Vue from 'vue';

/**
 * Preflight check for Vue 2 components
 */
const preflight: IPreflightFn = function (component) {
  // Check if it's a valid Vue 2 component
  if (!component) {
    return 'Component is undefined';
  }

  // Vue 2 components can be objects with render function or template
  if (typeof component !== 'object' && typeof component !== 'function') {
    return 'Invalid Vue 2 component';
  }

  // Check Vue version
  const vueVersion = Vue.version;
  if (!vueVersion.startsWith('2.')) {
    return `Expected Vue 2.x but got ${vueVersion}`;
  }

  return true;
};

export default preflight;
