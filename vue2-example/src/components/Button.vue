<template>
  <button
    ref="buttonRef"
    :class="[
      'vue2-button',
      `vue2-button--${type}`,
      `vue2-button--${size}`,
      { 'vue2-button--disabled': disabled, 'vue2-button--loading': loading },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <span v-if="loading" class="vue2-button__loading">⏳</span>
    <!-- @slot icon - 按钮图标插槽 -->
    <slot name="icon"></slot>
    <!-- @slot default - 按钮内容插槽 -->
    <slot>{{ text }}</slot>
    <!-- @slot suffix - 按钮后缀插槽 -->
    <slot name="suffix"></slot>
  </button>
</template>

<script>
/**
 * Vue 2 按钮组件
 * 支持多种类型、尺寸和状态
 * @displayName Button
 * @since 1.0.0
 * @version 2.1.0
 * @author preset-vue2 Team
 * @example
 * <Button type="primary" @click="handleClick">点击我</Button>
 */
export default {
  name: 'Button',
  props: {
    /**
     * 按钮类型123123
     * @values primary, secondary, danger, warning, success
     */
    type: {
      type: String,
      default: 'primary',
      validator: (value) =>
        ['primary', 'secondary', 'danger', 'warning', 'success'].includes(value),
    },
    /**
     * 按钮尺寸
     */
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value),
    },
    /**
     * 按钮文字
     */
    text: {
      type: String,
      default: 'Button',
    },
    /**
     * 是否禁用
     */
    disabled: {
      type: Boolean,
      default: false,
    },
    /**
     * 是否加载中
     */
    loading: {
      type: Boolean,
      default: false,
    },
    /**
     * 自定义类名
     */
    customClass: {
      type: String,
      default: '',
    },
  },
  methods: {
    /**
     * 处理点击事件
     * @param {MouseEvent} event - 原生点击事件
     * @public
     */
    handleClick(event) {
      if (!this.disabled && !this.loading) {
        /**
         * 点击事件
         * @event click
         * @param {MouseEvent} event - 原生点击事件
         */
        this.$emit('click', event);
      }
    },
    /**
     * 处理鼠标进入事件
     * @param {MouseEvent} event - 原生鼠标事件
     * @public
     */
    handleMouseEnter(event) {
      /**
       * 鼠标进入事件
       * @event mouseenter
       * @param {MouseEvent} event - 原生鼠标事件
       */
      this.$emit('mouseenter', event);
    },
    /**
     * 处理鼠标离开事件
     * @param {MouseEvent} event - 原生鼠标事件
     * @public
     */
    handleMouseLeave(event) {
      /**
       * 鼠标离开事件
       * @event mouseleave
       * @param {MouseEvent} event - 原生鼠标事件
       */
      this.$emit('mouseleave', event);
    },
    /**
     * 聚焦按钮
     * @public
     */
    focus() {
      this.$refs.buttonRef?.focus();
    },
    /**
     * 取消聚焦
     * @public
     */
    blur() {
      this.$refs.buttonRef?.blur();
    },
  },
};
</script>

<style scoped>
.vue2-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.vue2-button--primary {
  background: #1890ff;
  color: white;
}
.vue2-button--secondary {
  background: #f0f0f0;
  color: #333;
}
.vue2-button--danger {
  background: #ff4d4f;
  color: white;
}
.vue2-button--warning {
  background: #faad14;
  color: white;
}
.vue2-button--success {
  background: #52c41a;
  color: white;
}
.vue2-button--small {
  padding: 4px 8px;
  font-size: 12px;
}
.vue2-button--large {
  padding: 12px 24px;
  font-size: 16px;
}
.vue2-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vue2-button--loading {
  cursor: wait;
}
.vue2-button__loading {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
