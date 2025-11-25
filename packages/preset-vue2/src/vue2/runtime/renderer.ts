import type { IDemoCancelableFn } from 'dumi/dist/client/theme-api';
import Vue from 'vue';

const renderer: IDemoCancelableFn = async function (canvas, component) {
  if (!component) {
    throw new Error('Component is undefined');
  }

  // Handle CSS injection
  if (component.__css__) {
    // Remove old styles first
    document.querySelectorAll(`style[css-${component.__id__}]`).forEach((el) => el.remove());
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style css-${component.__id__}>${component.__css__}</style>`,
    );
  }

  // Clear canvas before mounting (important for re-renders)
  canvas.innerHTML = '';

  // Create a mount point inside canvas
  // Vue 2's $mount replaces the element, so we need a wrapper
  const mountPoint = document.createElement('div');
  canvas.append(mountPoint);

  // Vue 2 mounting
  const vm = new Vue({
    render: (h) => h(component),
  });

  vm.$mount(mountPoint);

  // Return cleanup function
  return () => {
    vm.$destroy();
    // Clear the DOM after destroy
    if (vm.$el && vm.$el.parentNode) {
      vm.$el.remove();
    }
    // Also clear canvas to be safe
    canvas.innerHTML = '';
  };
};

export default renderer;
