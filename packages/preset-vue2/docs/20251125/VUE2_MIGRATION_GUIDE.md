# Vue 2 迁移实战：从 @dumijs/preset-vue 到 @dumijs/preset-vue2

> 本文档记录将 dumi Vue 3 预设迁移到 Vue 2 过程中遇到的问题、解决方案和遗留项。内容面向技术面试，涵盖深度原理分析。

## 目录

1. [项目背景](#项目背景)
2. [核心差异对比](#核心差异对比)
3. [迁移过程遇到的问题](#迁移过程遇到的问题)
4. [问题详解与解决方案](#问题详解与解决方案)
5. [遗留问题](#遗留问题)
6. [面试问答](#面试问答)

---

## 项目背景

### 迁移目标

将 dumi 官方的 `@dumijs/preset-vue` (Vue 3) 迁移为支持 Vue 2 的 `@dumijs/preset-vue2`，用于在 dumi 文档站点中展示 Vue 2 组件。

### 核心功能需求

| 功能                | 优先级 | 状态      |
| ------------------- | ------ | --------- |
| SFC (.vue) 文件预览 | P0     | ✅ 已实现 |
| TypeScript 支持     | P0     | ✅ 已实现 |
| Scoped CSS          | P0     | ✅ 已实现 |
| JSX/TSX 文件预览    | P1     | ✅ 已实现 |
| Live Editing        | P2     | ❌ 遗留   |

---

## 核心差异对比

### Vue 2 vs Vue 3 编译器差异

| 特性        | Vue 3                                   | Vue 2                                                     |
| ----------- | --------------------------------------- | --------------------------------------------------------- |
| SFC 编译器  | `vue/compiler-sfc`                      | `@vue/component-compiler-utils` + `vue-template-compiler` |
| 模板编译器  | 内置于 compiler-sfc                     | 独立的 `vue-template-compiler`                            |
| Script 编译 | `compileScript()` 支持 `<script setup>` | 无 `<script setup>` 支持                                  |
| JSX 转换    | `@vue/babel-plugin-jsx`                 | `@vue/babel-preset-jsx`                                   |
| 组件定义    | `defineComponent()`                     | `Vue.extend()` 或 Options API                             |
| 应用创建    | `createApp(component).mount(el)`        | `new Vue({ render: h => h(component) }).$mount(el)`       |

### 关键代码对比

**Vue 3 渲染器：**

```typescript
import { createApp } from 'vue';

const renderer = async function (canvas, component) {
  const app = createApp(component);
  app.mount(canvas);
  return () => app.unmount();
};
```

**Vue 2 渲染器：**

```typescript
import Vue from 'vue';

const renderer = async function (canvas, component) {
  const mountPoint = document.createElement('div');
  canvas.appendChild(mountPoint);

  const vm = new Vue({
    render: (h) => h(component),
  });
  vm.$mount(mountPoint);

  return () => {
    vm.$destroy();
    if (vm.$el && vm.$el.parentNode) {
      vm.$el.parentNode.removeChild(vm.$el);
    }
    canvas.innerHTML = '';
  };
};
```

---

## 迁移过程遇到的问题

### 问题清单（按遇到顺序）

| #   | 问题                              | 类型         | 难度       | 状态      |
| --- | --------------------------------- | ------------ | ---------- | --------- |
| 1   | Babel standalone 未加载           | 运行时       | ⭐⭐       | ✅ 已解决 |
| 2   | `transformSync` is not a function | API 差异     | ⭐⭐       | ✅ 已解决 |
| 3   | Cannot use import statement       | 模块格式     | ⭐⭐⭐     | ✅ 已解决 |
| 4   | Vue.\_init is undefined           | 框架差异     | ⭐⭐⭐⭐   | ✅ 已解决 |
| 5   | 组件多实例问题                    | 渲染逻辑     | ⭐⭐       | ✅ 已解决 |
| 6   | JS/CSS 修改不生效                 | Live Editing | ⭐⭐⭐     | ⚠️ 遗留   |
| 7   | JSX React is not defined          | JSX 转换     | ⭐⭐⭐⭐⭐ | ⚠️ 遗留   |
| 8   | Vue 2 JSX props 格式差异          | 框架差异     | ⭐⭐⭐⭐⭐ | ⚠️ 遗留   |

---

## 问题详解与解决方案

### 问题 1：Babel standalone 未加载

**错误信息：**

```
[Vue2 Compiler] Babel standalone is not loaded
ReferenceError: Babel is not defined
```

**原因分析：**

Vue 3 preset 使用 `async: true` 加载 Babel standalone：

```typescript
api.addHTMLHeadScripts(() => [
  {
    src: BABEL_STANDALONE_CDN,
    async: true, // 异步加载
  },
]);
```

异步加载导致脚本执行顺序不确定，编译器初始化时 Babel 可能尚未加载完成。

**解决方案：**

1. **移除 async 属性**（降低性能但保证顺序）：

```typescript
api.addHTMLHeadScripts(() => [
  {
    src: BABEL_STANDALONE_CDN,
    // 移除 async: true
  },
]);
```

2. **懒加载编译器**（推荐）：

```typescript
let _compiler: Compiler | null = null;

function getCompiler() {
  if (!_compiler) {
    if (typeof Babel === 'undefined') {
      throw new Error('Babel standalone is not loaded');
    }
    _compiler = createCompiler({ babel: Babel });
  }
  return _compiler;
}

export function compile(code, opts) {
  return getCompiler().compileSFC(opts); // 延迟初始化
}
```

**面试考点：** Script 加载时序、模块初始化时机、懒加载模式

---

### 问题 2：`transformSync` is not a function

**错误信息：**

```
TypeError: babel.transformSync is not a function
```

**原因分析：**

| 环境    | Babel API               | 说明                                     |
| ------- | ----------------------- | ---------------------------------------- |
| Node.js | `babel.transformSync()` | 同步 API                                 |
| 浏览器  | `Babel.transform()`     | @babel/standalone 只有异步风格的同步 API |

Vue 3 preset 的编译器使用了 Node.js 的 `transformSync`，但浏览器端的 `@babel/standalone` 只提供 `transform`。

**解决方案：**

抽象 Babel API 适配层：

```typescript
// Node.js 端
import { babelCore } from 'dumi/tech-stack-utils';
const babel = babelCore();  // 提供 transformSync

// 浏览器端
const babel = {
  transformSync(...args) {
    // @babel/standalone 虽然叫 transform，但实际是同步的
    return Babel.transform(...args);
  }
};
```

**面试考点：** API 适配模式、同构代码设计、依赖注入

---

### 问题 3：Cannot use import statement

**错误信息：**

```
SyntaxError: Cannot use import statement outside a module
```

**原因分析：**

dumi 的 `evalCommonJS` 函数期望 CommonJS 格式的代码：

```typescript
// dumi 内部
function evalCommonJS(code) {
  const module = { exports: {} };
  const require = (id) => {
    /* ... */
  };
  eval(code); // 需要 CommonJS 格式
  return module.exports;
}
```

但 SFC 编译输出包含 ES Module 语法：

```javascript
// 编译输出（ES Module）
import Vue from 'vue';
const __sfc__ = { ... };
export default __sfc__;
```

**解决方案：**

使用 `@babel/preset-env` 将 ES Module 转为 CommonJS：

```typescript
function toCommonJS(es: string) {
  return babel.transformSync(es, {
    presets: [['env', { modules: 'cjs' }]], // 关键配置
  });
}

// 完整编译流程
function compile(code, { filename }) {
  const compiled = compileSFC({ id, filename, code });
  let { js, css } = compiled;

  // 添加元数据
  js += `\n__sfc__.__css__ = ${JSON.stringify(css)};`;
  js += `\nexport default __sfc__;`;

  // 转为 CommonJS
  return toCommonJS(js)?.code || '';
}
```

**转换结果：**

```javascript
// 转换后（CommonJS）
"use strict";
var _vue = require("vue");
var __sfc__ = { ... };
module.exports = __sfc__;
module.exports.default = __sfc__;
```

**面试考点：** ES Module vs CommonJS、Babel preset 配置、模块系统互操作

---

### 问题 4：Vue.\_init is undefined

**错误信息：**

```
TypeError: Cannot read property '_init' of undefined
```

**原因分析：**

这是一个非常隐蔽的 bug，涉及 Vue 2 的 `Vue.extend()` 和 React 的 `setState` 行为冲突。

**Vue 2 组件定义方式：**

```typescript
// Vue 2 组件通常用 Vue.extend()
export default Vue.extend({
  name: 'MyComponent',
  data() {
    return { count: 0 };
  },
});
```

**Vue.extend() 返回值：**

```typescript
const Component = Vue.extend({ ... });

typeof Component === 'function';  // true - 这是一个构造函数！
Component.options;  // 真正的组件选项对象
```

**问题根源：**

dumi 内部使用 React 管理 demo 状态：

```typescript
// dumi 内部代码（简化）
const [component, setComponent] = useState(initialComponent);

// Live Editing 时
const newComponent = evalCommonJS(compiledCode);
setComponent(newComponent); // 问题在这里！
```

React 的 `setState` 对函数有特殊处理：

```typescript
// React setState 内部逻辑
setState((prevState) => {
  if (typeof newValue === 'function') {
    // React 认为这是 updater 函数，会调用它！
    return newValue(prevState);
  }
  return newValue;
});
```

当 `newComponent` 是 `Vue.extend()` 返回的构造函数时，React 会尝试调用它：

```typescript
// React 内部
newComponent(prevState); // 调用了 Vue 构造函数！
// 导致: this._init is undefined（因为没有正确的 this 上下文）
```

**解决方案：**

提取 `.options` 属性，确保传递的是普通对象：

```typescript
// 编译器输出
const __sfc___raw = Vue.extend({ ... });

// 如果是构造函数，提取 options；否则直接使用
var __sfc__ = typeof __sfc___raw === 'function' && __sfc___raw.options
  ? __sfc___raw.options
  : __sfc___raw;

module.exports = __sfc__;
```

**面试考点：** Vue.extend 原理、React setState 内部机制、框架互操作陷阱

---

### 问题 5：组件多实例问题

**现象：**

用户在 Live Editing 中每输入一个字符，就会多渲染一个组件实例，导致页面出现多个重复组件。

**原因分析：**

Vue 2 的 `$mount` 方法会替换挂载元素：

```typescript
// Vue 2 行为
const vm = new Vue({ render: (h) => h(component) });
vm.$mount(mountPoint);
// mountPoint 被 vm.$el 替换了！
```

如果不清理旧实例，再次渲染时会创建新元素而不是替换。

**解决方案：**

完整的渲染清理逻辑：

```typescript
const renderer = async function (canvas, component) {
  // 1. 清理旧样式
  if (component.__css__) {
    document.querySelectorAll(`style[css-${component.__id__}]`).forEach((el) => el.remove());
    // 注入新样式
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style css-${component.__id__}>${component.__css__}</style>`,
    );
  }

  // 2. 清空 canvas（重要！）
  canvas.innerHTML = '';

  // 3. 创建新挂载点
  const mountPoint = document.createElement('div');
  canvas.appendChild(mountPoint);

  // 4. 挂载 Vue 实例
  const vm = new Vue({
    render: (h) => h(component),
  });
  vm.$mount(mountPoint);

  // 5. 返回清理函数
  return () => {
    vm.$destroy();
    // 手动移除 DOM
    if (vm.$el && vm.$el.parentNode) {
      vm.$el.parentNode.removeChild(vm.$el);
    }
    canvas.innerHTML = '';
  };
};
```

**面试考点：** Vue 实例生命周期、DOM 操作、资源清理

---

### 问题 6：JS/CSS 修改不生效（Live Editing）

**现象：**

- 修改 `<template>` 内容 → ✅ 实时更新
- 修改 `<script>` 内容 → ❌ 不更新
- 修改 `<style>` 内容 → ❌ 不更新

**原因分析：**

经过调试发现，问题出在浏览器端的 SFC 编译流程。模板修改能生效是因为 Vue 模板编译器工作正常，但 script 和 style 的处理存在问题。

由于 Live Editing 整体实现复杂度高，且在 Vue 2 场景下存在多个技术障碍，我们选择暂时禁用此功能。

**当前解决方案：**

禁用 Live Editing，仅支持代码预览：

```typescript
// techStack/index.ts
const runtimeOpts = {
  // compilePath: getPluginPath(api, COMPILE_FILENAME),  // 注释掉
  rendererPath: getPluginPath(api, RENDERER_FILENAME),
  preflightPath: getPluginPath(api, PREFLIGHT_FILENAME),
};
```

**面试考点：** 技术债务管理、MVP 决策、功能降级策略

---

### 问题 7：JSX "React is not defined"

**错误信息：**

```
ReferenceError: React is not defined
```

**原因分析：**

**Babel JSX 转换机制：**

```javascript
// JSX 源码
const element = <div className="foo">Hello</div>;

// @babel/preset-react 输出（默认）
const element = React.createElement("div", { className: "foo" }, "Hello");

// Vue JSX 期望
const element = h("div", { class: "foo" }, "Hello");
```

`@babel/preset-react` 默认输出 `React.createElement`，但浏览器环境没有 React。

**尝试的解决方案：**

**方案 1：设置 JSX pragma（失败）**

```typescript
// 配置 Babel 使用 h 而非 React.createElement
presets: [
  [
    'react',
    {
      pragma: 'h',
      pragmaFrag: 'Fragment',
    },
  ],
];
```

问题：输出的 props 格式仍然是 React 风格：

```javascript
// 输出
h('div', { className: 'foo' }); // React 风格 props

// Vue 期望
h('div', { class: 'foo' }); // Vue 风格 props
```

**方案 2：编写适配层（部分失败）**

```typescript
// 尝试包装 h 函数
function createVueH(originalH) {
  return function h(tag, props, ...children) {
    if (props && typeof props === 'object') {
      // 转换 className → class
      if (props.className) {
        props.class = props.className;
        delete props.className;
      }
      // 转换事件 onClick → on: { click: ... }
      // ... 复杂的转换逻辑
    }
    return originalH(tag, props, ...children);
  };
}
```

问题：React 和 Vue 的 JSX 语义差异太大，难以完全兼容。

**根本原因：**

| 特性       | React JSX                  | Vue 2 JSX                        |
| ---------- | -------------------------- | -------------------------------- |
| class 属性 | `className`                | `class`                          |
| 事件绑定   | `onClick`                  | `on: { click: fn }` 或 `onClick` |
| 样式       | `style={{ color: 'red' }}` | `style: { color: 'red' }`        |
| 子元素     | 第三个参数起               | `children` 或 slots              |
| JSX 插件   | `@babel/preset-react`      | `@vue/babel-preset-jsx`          |

**关键问题：**

`@vue/babel-preset-jsx` 不包含在 `@babel/standalone` 中，无法在浏览器端使用。

**面试考点：** JSX 编译原理、Babel 插件机制、框架 JSX 差异

---

### 问题 8：Vue 2 JSX Props 格式差异

**深入分析：**

Vue 2 的 `h` 函数签名与 React 完全不同：

```typescript
// React h (createElement)
createElement(
  type: string | Component,
  props: object | null,
  ...children: any[]
)

// Vue 2 h (createElement)
createElement(
  tag: string | Component,
  data?: VNodeData,  // 复杂的数据对象
  children?: VNode[] | string
)

// Vue 2 VNodeData 结构
interface VNodeData {
  class?: any;
  style?: object;
  attrs?: object;
  props?: object;
  domProps?: object;
  on?: { [key: string]: Function };
  nativeOn?: { [key: string]: Function };
  directives?: VNodeDirective[];
  slot?: string;
  scopedSlots?: { [key: string]: ScopedSlot };
  ref?: string;
  key?: string | number;
}
```

**示例对比：**

```jsx
// 希望写的代码
<el-button type="primary" onClick={handleClick}>
  Click me
</el-button>;

// React JSX 编译结果
React.createElement('el-button', { type: 'primary', onClick: handleClick }, 'Click me');

// Vue 2 JSX 正确编译结果
h(
  'el-button',
  {
    props: { type: 'primary' },
    on: { click: handleClick },
  },
  'Click me',
);
```

**为什么 Vue 3 可以但 Vue 2 不行？**

Vue 3 的 `@vue/babel-plugin-jsx` 是独立包，可以被 bundle 到浏览器中：

```typescript
// Vue 3 preset browser.ts
import jsx from '@vue/babel-plugin-jsx';

const compiler = createCompiler({
  availablePlugins: {
    'vue-jsx': jsx, // 直接引入插件
  },
});
```

Vue 2 的 `@vue/babel-preset-jsx` 是一个 preset（包含多个插件），且有 Node.js 依赖，无法直接在浏览器使用。

**面试考点：** Virtual DOM 差异、Babel plugin vs preset、浏览器环境限制

---

## 遗留问题

### 1. Live Editing 功能

**状态：** 禁用

**技术障碍：**

1. `@vue/babel-preset-jsx` 无法在浏览器运行
2. Vue 2 h 函数签名与 React 差异大
3. 浏览器端 SFC 编译器对 JS/CSS 变更处理有问题

**可能的解决方案：**

| 方案                     | 可行性 | 工作量 | 描述                                      |
| ------------------------ | ------ | ------ | ----------------------------------------- |
| A. 打包 Vue 2 JSX preset | 中     | 高     | 将 @vue/babel-preset-jsx 打包为浏览器版本 |
| B. JSX → Vue 转换层      | 低     | 极高   | 编写 React JSX → Vue 2 JSX 的运行时转换   |
| C. 仅 SFC Live Editing   | 高     | 中     | 只支持 .vue 文件的 Live Editing           |
| D. 使用 Web Worker       | 中     | 高     | 在 Worker 中运行完整编译器                |

### 2. `<script setup>` 支持

**状态：** 不支持

**原因：** Vue 2 不支持 `<script setup>` 语法

**替代方案：** 使用传统的 Options API 或 `Vue.extend()`

### 3. 自定义预处理器

**状态：** 不支持

**原因：** Less/Sass/Stylus 等预处理器需要额外的浏览器端编译器

**当前处理：** 显示警告信息

```typescript
if (descriptor.styles.some((style) => style.lang && style.lang !== 'css')) {
  js += '\nconsole.warn("Custom preprocessors for <style> are not supported.")';
}
```

---

## 面试问答

### Q1: 为什么 Vue 2 需要单独的 preset？

**答：** Vue 2 和 Vue 3 的编译器完全不同：

1. **SFC 编译器不同**
   - Vue 3: `vue/compiler-sfc` (内置)
   - Vue 2: `@vue/component-compiler-utils` + `vue-template-compiler`

2. **模板编译输出不同**
   - Vue 3: 基于 Block Tree 的优化渲染函数
   - Vue 2: 传统的渲染函数

3. **运行时 API 不同**
   - Vue 3: `createApp().mount()`
   - Vue 2: `new Vue().$mount()`

4. **JSX 支持不同**
   - Vue 3: `@vue/babel-plugin-jsx`
   - Vue 2: `@vue/babel-preset-jsx`

### Q2: 如何理解 Vue.extend() 导致的 React setState 问题？

**答：** 这是一个框架互操作的经典问题：

1. `Vue.extend()` 返回的是构造函数，不是普通对象
2. React 的 `setState` 对函数参数有特殊处理（作为 updater 调用）
3. 当 dumi 内部用 `setState(vueComponent)` 时，如果 `vueComponent` 是函数，React 会调用它
4. Vue 构造函数在错误的上下文被调用，导致 `this._init` 未定义

**解决方法：** 确保传递给 React 的始终是普通对象：

```typescript
const component =
  typeof raw === 'function' && raw.options
    ? raw.options // 提取选项对象
    : raw;
```

### Q3: 浏览器端为什么不能使用 @vue/babel-preset-jsx？

**答：**

1. **Preset vs Plugin**
   - Plugin 是单一转换规则
   - Preset 是多个插件的集合，通常包含配置逻辑

2. **Node.js 依赖**
   - @vue/babel-preset-jsx 内部使用了 Node.js API
   - 依赖文件系统操作和路径解析

3. **@babel/standalone 限制**
   - 只内置了常用的 plugins 和 presets
   - 不包含 Vue 特定的转换器

4. **可能的解决方案**
   - 使用 webpack/rollup 打包 preset 为浏览器版本
   - 或者实现一个简化版的 Vue 2 JSX 转换器

### Q4: 双端编译架构的设计考量是什么？

**答：**

**Node.js 端（构建时）：**

- 完整的编译能力
- 性能最优
- 用于 SSR 和生产构建
- 可以使用任何 Node.js 依赖

**浏览器端（运行时）：**

- 受限于浏览器环境
- 用于 Live Editing 功能
- 需要特殊处理（CDN 加载、懒初始化）
- 能力有限但用户体验好

**共享设计：**

- `createCompiler` 抽象核心逻辑
- 通过依赖注入适配不同环境
- 统一的接口，差异化的实现

### Q5: 如何处理 CSS Scoped 在不同框架中的差异？

**答：**

两个框架的 Scoped CSS 原理相似，但实现细节不同：

**编译时：**

- 都生成唯一 ID（通常基于文件 hash）
- 都在 CSS 选择器中添加属性选择器 `[data-v-xxx]`

**运行时：**

```typescript
// 我们的实现
if (component.__css__) {
  // 1. 移除旧样式（避免重复）
  document.querySelectorAll(`style[css-${component.__id__}]`).forEach((el) => el.remove());

  // 2. 注入新样式
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style css-${component.__id__}>${component.__css__}</style>`,
  );
}
```

**需要注意的点：**

- 样式清理时机
- 样式标识符命名
- 多实例样式共享

### Q6: Live Editing 禁用后如何保证用户体验？

**答：**

1. **代码预览功能保留**
   - 组件正常渲染
   - 代码高亮显示
   - 支持复制代码

2. **清晰的提示信息**
   - 显示「Live Editing 暂不支持」
   - 建议用户修改源文件后刷新

3. **功能降级而非报错**
   - 不影响主要功能
   - 用户仍能完成文档浏览

4. **文档说明**
   - 在 README 中说明限制
   - 提供替代方案建议

---

## 总结

### 技术收获

1. 深入理解了 Vue 2/3 编译器差异
2. 掌握了 Babel 在不同环境的使用方式
3. 理解了框架互操作的复杂性
4. 学习了功能降级和技术债务管理

### 关键经验

1. **先 MVP，后完善**：Live Editing 复杂度高，先保证基本功能可用
2. **调试先行**：console.log 是定位问题的有效手段
3. **理解底层**：很多 bug 源于对框架内部机制的不了解
4. **权衡取舍**：有些功能投入产出比不高，可以作为遗留项

### 后续计划

1. 研究将 @vue/babel-preset-jsx 打包为浏览器版本的可行性
2. 考虑使用 Web Worker 运行完整编译器
3. 探索只支持 SFC 文件 Live Editing 的方案
