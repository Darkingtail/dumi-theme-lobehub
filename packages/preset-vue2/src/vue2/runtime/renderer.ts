import type { IDemoCancelableFn } from 'dumi/dist/client/theme-api';
import Vue from 'vue';

/**
 * Vue 2 component renderer for dumi demos
 * Handles mounting, CSS injection, and cleanup
 */
const renderer: IDemoCancelableFn = async function (canvas, component) {
  if (!component) {
    throw new Error('[Vue2 Renderer] Component is undefined');
  }

  // Handle CSS injection (from SFC styles)
  if (component.__css__ && component.__id__) {
    // Remove existing styles for this component
    document.querySelectorAll(`style[data-css-${component.__id__}]`).forEach((el) => el.remove());
    // Insert new styles
    const styleEl = document.createElement('style');
    styleEl.setAttribute(`data-css-${component.__id__}`, '');
    styleEl.textContent = component.__css__;
    document.head.append(styleEl);
  }

  // Clear canvas before mounting
  canvas.innerHTML = '';

  // Create a mount point inside canvas
  const mountPoint = document.createElement('div');
  canvas.append(mountPoint);

  // Vue 2 mounting with error handling
  let vm: Vue | null = null;
  let hasError = false;

  try {
    vm = new Vue({
      render: (h) => h(component),
    });
    vm.$mount(mountPoint);
  } catch (error) {
    hasError = true;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Vue2 Renderer] Mount error:', errorMsg);
    canvas.innerHTML = `<div style="color: #d32f2f; padding: 12px; background: #ffebee; border-radius: 4px; font-family: monospace; font-size: 13px; white-space: pre-wrap;">${errorMsg}</div>`;
    // Don't re-throw - return cleanup function to allow recovery
  }

  // Return cleanup function (always returns, even on error, for proper recovery)
  return () => {
    if (vm && !hasError) {
      try {
        vm.$destroy();
        if (vm.$el && vm.$el.parentNode) {
          vm.$el.remove();
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    canvas.innerHTML = '';
  };
};

export default renderer;
