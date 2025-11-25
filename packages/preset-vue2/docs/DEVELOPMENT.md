# @dumijs/preset-vue2 开发文档

## 概述

`@dumijs/preset-vue2` 是一个 dumi 插件，用于在 dumi 文档站点中支持 Vue 2 组件的展示。

## 功能特性

### 已实现

- ✅ Vue 2 SFC (.vue) 文件的 demo 展示
- ✅ Vue 2 JSX/TSX 文件的 demo 展示
- ✅ TypeScript 支持 (`<script lang="ts">`)
- ✅ Scoped CSS 支持
- ✅ Element UI 等 UI 库集成
- ✅ 代码预览功能

### 暂不支持（遗留项）

- ❌ Live editing（在线编辑）功能
  - SFC 文件的在线编辑
  - JSX/TSX 文件的在线编辑

## 项目结构

```
packages/preset-vue2/
├── src/
│   ├── index.ts                 # 插件入口
│   ├── shared.ts                # 共享常量和工具函数
│   ├── requireHook.ts           # Node.js require hook
│   ├── compiler/
│   │   ├── index.ts             # 编译器入口
│   │   ├── node.ts              # Node.js 端编译器
│   │   └── browser.ts           # 浏览器端编译器（live editing 用）
│   └── vue2/
│       ├── index.ts             # Vue 2 插件入口
│       ├── checkVersion.ts      # Vue 版本检查
│       ├── techStack/
│       │   ├── index.ts         # 注册 tech stack
│       │   ├── sfc.ts           # SFC tech stack
│       │   └── jsx.ts           # JSX tech stack
│       ├── runtime/
│       │   ├── renderer.ts      # 组件渲染器
│       │   ├── preflight.ts     # 预检函数
│       │   └── runtimePlugin.ts # 运行时插件
│       └── webpack/
│           ├── index.ts         # Webpack 配置
│           └── config.ts        # Webpack 配置详情
├── lib/                         # tsup 构建输出（浏览器端）
│   ├── compiler.mjs
│   ├── renderer.mjs
│   ├── preflight.mjs
│   └── runtimePlugin.mjs
├── dist/                        # father 构建输出（Node.js 端）
├── tsup.config.ts               # tsup 配置
└── package.json
```

## 技术实现

### 1. Tech Stack 注册

dumi 通过 `registerTechStack` 机制支持不同技术栈。我们注册了两个 tech stack：

- **Vue2JSXTechStack**: 处理 .jsx/.tsx 文件
- **Vue2SfcTechStack**: 处理 .vue 文件

```typescript
// src/vue2/techStack/index.ts
api.register({
  key: 'registerTechStack',
  stage: 0,
  fn: () => Vue2JSXTechStack(runtimeOpts),
});

api.register({
  key: 'registerTechStack',
  stage: 1,
  fn: () => Vue2SfcTechStack(runtimeOpts),
});
```

### 2. 组件编译

#### Node.js 端编译（构建时）

使用 `@vue/component-compiler-utils` 和 `vue-template-compiler` 编译 Vue 2 SFC：

```typescript
// src/compiler/node.ts
import { compileStyle, compileTemplate, parse } from '@vue/component-compiler-utils';
import * as vueTemplateCompiler from 'vue-template-compiler';
```

#### 浏览器端编译（Live Editing - 暂未启用）

使用 `@babel/standalone` 进行浏览器端 TypeScript 转换：

```typescript
// src/compiler/browser.ts
// 当前已禁用，返回 "不支持" 提示
```

### 3. 组件渲染

```typescript
// src/vue2/runtime/renderer.ts
const renderer: IDemoCancelableFn = async function (canvas, component) {
  // 注入 CSS
  if (component.__css__) {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style css-${component.__id__}>${component.__css__}</style>`,
    );
  }

  // Vue 2 挂载
  const vm = new Vue({
    render: (h) => h(component),
  });
  vm.$mount(mountPoint);

  // 返回清理函数
  return () => {
    vm.$destroy();
    canvas.innerHTML = '';
  };
};
```

### 4. Runtime Options

```typescript
const runtimeOpts = {
  // compilePath: 禁用以关闭 live editing
  rendererPath: getPluginPath(api, RENDERER_FILENAME),
  preflightPath: getPluginPath(api, PREFLIGHT_FILENAME),
};
```

## Live Editing 实现尝试（记录）

### 遇到的问题

1. **Babel standalone API 差异**
   - Node.js: `babel.transformSync()`
   - Browser: `babel.transform()`

2. **ES Module 转 CommonJS**
   - dumi 的 `evalCommonJS` 需要 CommonJS 格式
   - 需要使用 `@babel/preset-env` 的 `modules: 'cjs'` 选项

3. **Vue.extend() 构造函数问题**
   - `Vue.extend()` 返回构造函数
   - React 的 `setState` 会将函数作为 updater 调用
   - 解决：提取 `.options` 属性

4. **JSX/TSX 支持问题**
   - `@vue/babel-preset-jsx` 在浏览器中不可用
   - `@babel/preset-react` 输出 React 风格的 JSX 调用
   - Vue 2 的 `h` 函数签名与 React 不同

### 临时解决方案

当前禁用 live editing，只保留代码预览功能。

### 后续可能的方案

1. **方案 A**: 将 `@vue/babel-preset-jsx` 打包为浏览器版本
2. **方案 B**: 编写 React JSX → Vue 2 JSX 的转换层
3. **方案 C**: 只支持 SFC 文件的 live editing

## 构建命令

```bash
# 构建浏览器端文件（lib/）
pnpm build:lib

# 构建 Node.js 端文件（dist/）
pnpm build

# 同时构建
pnpm build:lib && pnpm build
```

## 使用方式

### 安装

```bash
pnpm add @dumijs/preset-vue2 vue@2.7 vue-template-compiler
```

### 配置

```typescript
// .dumirc.ts
export default {
  presets: [require.resolve('@dumijs/preset-vue2')],
  vue2: {},
};
```

### 编写 Demo

```markdown
<!-- docs/components/button.md -->

# Button 组件

<code src="./demos/Button.vue"></code>
```

```vue
<!-- docs/components/demos/Button.vue -->
<template>
  <el-button type="primary">{{ text }}</el-button>
</template>

<script lang="ts">
import Vue from 'vue';
import { Button } from 'element-ui';

export default Vue.extend({
  name: 'ButtonDemo',
  components: { ElButton: Button },
  data() {
    return {
      text: 'Click me',
    };
  },
});
</script>

<style scoped>
.el-button {
  margin: 10px;
}
</style>
```

## 依赖说明

### peerDependencies

- `dumi`: ^2.4.0
- `vue`: ^2.7.0
- `vue-template-compiler`: ^2.7.0

### dependencies

- `@vue/component-compiler-utils`: Vue 2 SFC 编译
- `hash-sum`: 生成组件 ID

### devDependencies

- `@babel/standalone`: 浏览器端 Babel（live editing 用）
- `tsup`: 浏览器端构建工具
- `father`: Node.js 端构建工具

## 更新日志

### 2024-11-25

- 初始实现 Vue 2 组件预览功能
- 禁用 live editing 功能（作为遗留项）
- 支持 SFC + TypeScript
- 支持 JSX/TSX 文件展示
- 集成 Element UI 示例
