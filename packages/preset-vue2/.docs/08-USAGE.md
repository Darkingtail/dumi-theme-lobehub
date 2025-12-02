# 使用指南

## 1. 快速开始

### 1.1 安装

```bash
# 使用 pnpm
pnpm add @dumijs/preset-vue2 -D

# 使用 npm
npm install @dumijs/preset-vue2 -D

# 使用 yarn
yarn add @dumijs/preset-vue2 -D
```

### 1.2 配置

在 `.dumirc.ts` 中添加 preset：

```typescript
import presetVue2 from '@dumijs/preset-vue2';
import { defineConfig } from 'dumi';

export default defineConfig({
  presets: [presetVue2()],
});
```

### 1.3 验证

创建一个简单的 Vue 2 组件 Demo：

````markdown
# Hello World

```vue
<template>
  <div>{{ message }}</div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello Vue 2!',
    };
  },
};
</script>
` ` `
```
````

运行 `pnpm dev`，如果看到组件正常渲染，说明安装成功！

## 2. 配置详解

### 2.1 完整配置示例

```typescript
import presetVue2 from '@dumijs/preset-vue2';
import { defineConfig } from 'dumi';

export default defineConfig({
  presets: [presetVue2()],

  // Vue 2 相关配置
  vue2: {
    // JSX/TSX 文件匹配规则
    jsxIncludes: true,

    // 编译器 CDN 配置
    compiler: {
      babelStandaloneCDN: 'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.22.17/babel.min.js',
      lessCDN: 'https://cdn.bootcdn.net/ajax/libs/less.js/4.2.0/less.min.js',
      sassCDN: 'https://cdn.jsdelivr.net/npm/sass.js@0.11.1/dist/sass.sync.min.js',
    },

    // Live Editing 中可用的外部模块
    resolveMap: ['element-ui', 'lodash'],
  },
});
```

### 2.2 配置项说明

#### `jsxIncludes`

控制哪些 JSX/TSX 文件按 Vue 2 处理：

```typescript
// 方式一：全部启用（默认）
// 会分析代码特征自动判断
jsxIncludes: true;

// 方式二：路径匹配
// 只有路径包含这些字符串的文件才按 Vue 处理
jsxIncludes: ['/components/', '/vue2-'];

// 方式三：正则匹配
jsxIncludes: [/\/src\/.*\.tsx$/, /vue2/];

// 方式四：混合使用
jsxIncludes: ['/components/', /\.vue\.tsx$/];
```

#### `compiler`

自定义浏览器端编译器的 CDN 地址：

```typescript
compiler: {
  // Babel Standalone - 用于编译 JSX
  babelStandaloneCDN: 'https://your-cdn/babel.min.js',

  // Less.js - 用于编译 LESS
  lessCDN: 'https://your-cdn/less.min.js',

  // Sass.js - 用于编译 SCSS/SASS
  sassCDN: 'https://your-cdn/sass.sync.min.js',
}
```

#### `resolveMap`

指定 Live Editing 中可用的外部模块：

```typescript
// 这些模块可以在 Demo 代码中 import
resolveMap: ['element-ui', 'lodash', 'moment'];
```

## 3. 编写组件

### 3.1 Vue SFC 组件

推荐使用 Vue 单文件组件格式：

```vue
<!-- src/components/Button/index.vue -->
<template>
  <button :class="['my-button', `my-button--${type}`]" @click="handleClick">
    <slot>{{ text }}</slot>
  </button>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

export default Vue.extend({
  name: 'Button',
  props: {
    /**
     * 按钮类型
     */
    type: {
      type: String as PropType<'primary' | 'default' | 'danger'>,
      default: 'default',
    },
    /**
     * 按钮文字
     */
    text: {
      type: String,
      default: 'Button',
    },
  },
  methods: {
    handleClick(e: MouseEvent) {
      /**
       * 点击事件
       * @arg {MouseEvent} e - 鼠标事件对象
       */
      this.$emit('click', e);
    },
  },
});
</script>

<style scoped lang="less">
.my-button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;

  &--primary {
    background: #1890ff;
    color: white;
  }

  &--danger {
    background: #ff4d4f;
    color: white;
  }
}
</style>
```

### 3.2 JSX/TSX 组件

也可以使用 JSX/TSX 格式：

```tsx
// src/components/Card/index.tsx
import Vue, { PropType } from 'vue';

interface CardProps {
  title: string;
  bordered?: boolean;
}

export default Vue.extend({
  name: 'Card',
  props: {
    /**
     * 卡片标题
     */
    title: {
      type: String as PropType<string>,
      required: true,
    },
    /**
     * 是否显示边框
     */
    bordered: {
      type: Boolean,
      default: true,
    },
  },
  render() {
    return (
      <div class={['card', { 'card--bordered': this.bordered }]}>
        <div class="card-header">{this.title}</div>
        <div class="card-body">{this.$slots.default}</div>
      </div>
    );
  },
});
```

### 3.3 Composition API

Vue 2.7 支持 Composition API：

```vue
<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'Counter',
  props: {
    /**
     * 初始值
     */
    initialValue: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const count = ref(props.initialValue);
    const doubled = computed(() => count.value * 2);

    const increment = () => {
      count.value++;
    };

    return {
      count,
      doubled,
      increment,
    };
  },
});
</script>
```

## 4. 编写文档

### 4.1 内联 Demo

在 Markdown 中直接编写 Vue 代码：

````markdown
# Button 组件

## 基础用法

```vue
<template>
  <Button type="primary">主要按钮</Button>
</template>

<script>
import { Button } from 'my-component-lib';

export default {
  components: { Button },
};
</script>
```

## 不同类型

```vue
<template>
  <div>
    <Button type="default">默认按钮</Button>
    <Button type="primary">主要按钮</Button>
    <Button type="danger">危险按钮</Button>
  </div>
</template>
```
````

### 4.2 外部 Demo 文件

引用独立的 Demo 文件：

```markdown
# Button 组件

## 基础用法

<code src="./demos/basic.vue"></code>

## 高级用法

<code src="./demos/advanced.vue"></code>
```

### 4.3 API 文档

使用 `<API>` 组件自动生成 API 文档：

```markdown
# Button 组件

## API

### Props

<API id="Button" type="props"></API>

### Events

<API id="Button" type="events"></API>

### Slots

<API id="Button" type="slots"></API>

### Methods

<API id="Button" type="imperative"></API>
```

## 5. API 文档规范

### 5.1 Props 注释

使用 JSDoc 注释描述 props：

```typescript
props: {
  /**
   * 按钮大小
   * @default 'medium'
   */
  size: {
    type: String as PropType<'small' | 'medium' | 'large'>,
    default: 'medium',
  },

  /**
   * 用户信息对象
   */
  user: {
    type: Object as PropType<User>,
    required: true,
  },

  /**
   * 是否禁用
   * @deprecated 请使用 disabled 属性代替
   */
  isDisabled: {
    type: Boolean,
    default: false,
  },
}
```

### 5.2 Events 注释

在 `$emit` 处添加注释：

```typescript
methods: {
  handleChange(value: string) {
    /**
     * 值变化时触发
     * @arg {string} value - 新的值
     */
    this.$emit('change', value);
  },

  handleSelect(item: Item, index: number) {
    /**
     * 选中项时触发
     * @arg {Item} item - 选中的项
     * @arg {number} index - 选中项的索引
     */
    this.$emit('select', item, index);
  },
}
```

### 5.3 Slots 注释

在组件顶部添加 slots 注释：

```typescript
/**
 * @slot default - 默认插槽内容
 * @slot header - 头部内容
 * @slot footer - 底部内容
 * @slot icon - 图标插槽 (scope: { active: boolean })
 */
export default Vue.extend({
  // ...
});
```

### 5.4 Methods 注释

使用 `@public` 标记公开方法：

```typescript
methods: {
  /**
   * 聚焦输入框
   * @public
   */
  focus() {
    this.$refs.input.focus();
  },

  /**
   * 清空输入内容
   * @public
   */
  clear() {
    this.value = '';
    this.$emit('clear');
  },

  // 私有方法不会出现在 API 文档中
  _updateValue() {
    // ...
  },
}
```

## 6. 样式处理

### 6.1 Scoped Styles

使用 `scoped` 确保样式隔离：

```vue
<style scoped>
.button {
  /* 只会影响当前组件 */
}
</style>
```

### 6.2 LESS 支持

```vue
<style scoped lang="less">
@primary-color: #1890ff;

.button {
  background: @primary-color;

  &:hover {
    background: darken(@primary-color, 10%);
  }
}
</style>
```

### 6.3 SCSS 支持

```vue
<style scoped lang="scss">
$primary-color: #1890ff;

.button {
  background: $primary-color;

  &:hover {
    background: darken($primary-color, 10%);
  }
}
</style>
```

## 7. 外部库集成

### 7.1 Element UI

```typescript
// .dumirc.ts
export default defineConfig({
  vue2: {
    resolveMap: ['element-ui'],
  },
});
```

```vue
<!-- Demo 中使用 -->
<template>
  <el-button type="primary">Element UI 按钮</el-button>
</template>

<script>
import { Button } from 'element-ui';

export default {
  components: {
    'el-button': Button,
  },
};
</script>
```

### 7.2 全局注册

如果需要全局注册 Element UI，可以在入口文件配置：

```typescript
// src/index.ts
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import Vue from 'vue';

Vue.use(ElementUI);
```

## 8. 最佳实践

### 8.1 组件命名

- 组件 `name` 属性必须与文件名一致
- 使用 PascalCase 命名

```typescript
// src/components/MyButton/index.vue
export default Vue.extend({
  name: 'MyButton', // 与目录名一致
  // ...
});
```

### 8.2 类型定义

- 使用 `PropType<T>` 定义复杂类型
- 导出类型供外部使用

```typescript
// types.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

// Component.vue
import { PropType } from 'vue';
import type { User } from './types';

props: {
  user: {
    type: Object as PropType<User>,
    required: true,
  },
}
```

### 8.3 文档组织

```
docs/
├── index.md           # 首页
├── guide/
│   ├── getting-started.md
│   └── faq.md
└── components/
    ├── button.md
    ├── button/
    │   └── demos/
    │       ├── basic.vue
    │       └── advanced.vue
    └── input.md
```

## 9. 常见问题

### Q: 为什么我的 JSX 组件按 React 处理了？

A: 检查 `jsxIncludes` 配置，确保你的文件路径匹配。或者在代码中明确 import Vue：

```tsx
import Vue from 'vue';

// 添加这行帮助识别
```

### Q: API Table 显示 "Component not found"？

A: 确保：

1. 组件有 `name` 属性
2. `<API id="xxx">` 中的 id 与组件 name 一致
3. 组件位于正确的目录下

### Q: Live Editing 中样式不生效？

A: 确保：

1. 使用 `scoped` 样式
2. CDN 加载成功（检查控制台网络请求）
3. 预处理器语法正确

---

下一篇：[总结与展望](./09-SUMMARY.md)
