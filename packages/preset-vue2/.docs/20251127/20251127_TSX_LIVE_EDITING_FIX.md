# Vue 2 TSX/JSX Live Editing 开发总结

> 日期: 2025-11-27
> 作者: Claude
> 版本: preset-vue2@0.0.1

## 1. 目标

在 dumi-theme-lobehub 的 `@dumijs/preset-vue2` 中实现 Vue 2 TSX/JSX 文件的 Live Editing（实时编辑预览）功能。

## 2. 问题背景

Vue 2 SFC (`.vue` 文件) 的 Live Editing 已经实现，但 TSX/JSX 文件在浏览器端编辑时报错：

```
[Vue warn]: Error in render: "ReferenceError: h is not defined"
```

## 3. 技术难点及解决方案

### 3.1 路径限制过严

#### 现象

Demo 文件位于 `/vue2demo/demos/` 目录，但 `jsx.ts` 中的 `isSupported` 方法检查路径必须包含 `/vue2/` 或 `/vue2-`，导致 TSX 文件不被 Vue 2 技术栈识别处理。

#### 原因分析

原始代码对路径做了过于严格的限制：

```typescript
// jsx.ts - 问题代码
isSupported(node, lang) {
  return ['jsx', 'tsx'].includes(lang) &&
         (node.path.includes('/vue2/') || node.path.includes('/vue2-'));
}
```

#### 解决方案

移除路径限制，让所有 `.jsx/.tsx` 文件都被 Vue 2 JSX tech stack 处理：

```typescript
// jsx.ts - 修复后
isSupported(node, lang) {
  return ['jsx', 'tsx'].includes(lang);
}
```

---

### 3.2 Composition API 中 `h is not defined`

#### 现象

使用 `defineComponent` + `setup()` 返回 JSX 渲染函数时，运行时报错：

```javascript
ReferenceError: h is not defined
    at LoginFormJSX.tsx:73:1
```

#### 原因分析

`@vue/babel-preset-jsx` 默认配置 `injectH: true`，会在编译时自动注入：

```javascript
const h = this.$createElement;
```

但在 Vue 2.7 的 Composition API `setup()` 函数中：

- `this` 是 `undefined`（setup 不绑定组件实例）
- 无法通过 `this.$createElement` 获取 `h` 函数

#### 解决方案

设置 `injectH: false`，要求用户显式从 vue 导入 `h`：

```typescript
// node.ts
export const compiler = createCompiler({
  availablePresets: {
    env,
    typescript,
    // Vue 2 JSX preset with injectH: false
    // This is critical for Composition API setup() functions
    'vue2-jsx': [require.resolve('@vue/babel-preset-jsx'), { injectH: false }],
  },
  babel,
});
```

用户代码需要：

```typescript
import { defineComponent, h } from 'vue';  // 显式导入 h

export default defineComponent({
  setup() {
    return () => <div>Hello</div>;  // JSX 编译后使用导入的 h
  }
});
```

---

### 3.3 Webpack 规则与 React JSX 冲突

#### 现象

配置了 `injectH: false` 后仍然报错：

```
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
    at parseAttributeJSXAttribute
```

同时 dumi 内部的 React TSX 文件也被错误地用 Vue JSX 处理。

#### 原因分析

**问题 1: Babel Presets 执行顺序**

Babel presets 按**逆序**执行（数组最后的最先执行）。原配置：

```javascript
presets: [
  ...babelInUmi.options.presets,  // 第3执行：包含 React JSX
  [tsPresetPath, ...],            // 第2执行：TypeScript
  ['@vue/babel-preset-jsx', ...]  // 第1执行：Vue JSX
]
```

Vue JSX 插件先执行时，代码中还包含 TypeScript 类型注解，导致解析失败。

**问题 2: React JSX 冲突**

umi 的 presets 包含 `@babel/preset-react`，会将 JSX 转换为 `React.createElement()`，与 Vue JSX 的 `h()` 转换冲突。

#### 解决方案

1. **调整 preset 顺序**：让 TypeScript 先执行（放在数组最后）
2. **移除 umi presets**：避免 React JSX 转换干扰
3. **使用 resourceQuery**：只处理带 `?techStack=vue2-tsx` 查询的文件

```typescript
// config.ts - 最终配置
config.module
  .rule('vue2-jsx-tsx')
  .test(/\.(jsx|tsx)$/)
  .resourceQuery(/techStack=vue2-tsx/) // 只处理 Vue 2 demo 文件
  .use('babel-loader')
  .loader(babelInUmi.loader)
  .options({
    // 不继承 umi presets，避免 React JSX 转换
    presets: [
      // Vue JSX 第二个执行（转换 JSX → h() 调用）
      [require.resolve('@vue/babel-preset-jsx'), { injectH: false }],
      // TypeScript 第一个执行（移除类型注解）- 放最后因为逆序
      [tsPresetPath, { allExtensions: true, isTSX: true, onlyRemoveTypeImports: true }],
    ],
    plugins: babelInUmi.options.plugins || [],
  });
```

---

## 4. 核心原理

### 4.1 Babel 转换流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    Babel 转换流程 (逆序执行)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  源代码 (TSX + TypeScript)                                      │
│  ─────────────────────────                                      │
│  import { defineComponent, h } from 'vue';                      │
│  interface Props { name: string; }                              │
│  export default defineComponent({                               │
│    setup() {                                                    │
│      return () => <div class="test">Hello</div>;                │
│    }                                                            │
│  });                                                            │
│                                                                 │
│         ↓ Step 1: TypeScript Preset (最后定义，最先执行)          │
│           - 移除 interface Props { ... }                        │
│           - 保留值导入 (h, defineComponent)                      │
│                                                                 │
│  中间代码 (JSX, 无类型)                                          │
│  ────────────────────                                           │
│  import { defineComponent, h } from 'vue';                      │
│  export default defineComponent({                               │
│    setup() {                                                    │
│      return () => <div class="test">Hello</div>;                │
│    }                                                            │
│  });                                                            │
│                                                                 │
│         ↓ Step 2: Vue JSX Preset (injectH: false)               │
│           - <div> → h('div', ...)                               │
│           - class="test" → { class: 'test' }                    │
│           - 不注入 const h = this.$createElement                │
│                                                                 │
│  最终代码 (纯 JavaScript)                                        │
│  ───────────────────────                                        │
│  import { defineComponent, h } from 'vue';                      │
│  export default defineComponent({                               │
│    setup() {                                                    │
│      return () => h('div', { class: 'test' }, 'Hello');         │
│    }                                                            │
│  });                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 dumi 技术栈机制

```
┌──────────────────────────────────────────────────────────────────┐
│                     dumi Demo 加载流程                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 文档解析阶段                                                  │
│     docs/vue2demo/index.md                                       │
│         ↓                                                        │
│     发现 <code src="./demos/LoginFormJSX.tsx">                   │
│         ↓                                                        │
│     调用 techStack.isSupported() 确定技术栈                       │
│         ↓                                                        │
│     返回 'vue2-tsx'                                              │
│                                                                  │
│  2. Webpack 打包阶段                                              │
│     import './demos/LoginFormJSX.tsx?techStack=vue2-tsx'         │
│         ↓                                                        │
│     匹配 rule('vue2-jsx-tsx')                                    │
│         - test: /\.(jsx|tsx)$/                                   │
│         - resourceQuery: /techStack=vue2-tsx/                    │
│         ↓                                                        │
│     使用 Vue JSX Babel 配置编译                                   │
│                                                                  │
│  3. 浏览器 Live Editing                                          │
│     用户编辑代码                                                  │
│         ↓                                                        │
│     browser.ts compile() 函数                                    │
│         ↓                                                        │
│     @babel/standalone + Vue JSX plugins                          │
│         ↓                                                        │
│     热更新渲染                                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. 关键配置参考

### 5.1 Babel 配置选项

| 配置项                  | 值      | 作用                                                             |
| ----------------------- | ------- | ---------------------------------------------------------------- |
| `injectH`               | `false` | 不自动注入 `const h = this.$createElement`，适配 Composition API |
| `allExtensions`         | `true`  | TypeScript 处理所有文件扩展名（包括 .tsx）                       |
| `isTSX`                 | `true`  | 启用 TSX 语法支持                                                |
| `onlyRemoveTypeImports` | `true`  | 只移除纯类型导入，保留值导入（如 `h`）                           |

### 5.2 Webpack 配置

| 配置项          | 值                     | 作用                          |
| --------------- | ---------------------- | ----------------------------- |
| `test`          | `/\.(jsx\|tsx)$/`      | 匹配 JSX/TSX 文件             |
| `resourceQuery` | `/techStack=vue2-tsx/` | 只处理 dumi 标记的 Vue 2 demo |

---

## 6. 修改的文件清单

| 文件                         | 修改内容                                 |
| ---------------------------- | ---------------------------------------- |
| `src/vue2/techStack/jsx.ts`  | 移除路径限制                             |
| `src/compiler/node.ts`       | 添加 `injectH: false` 配置               |
| `src/vue2/webpack/config.ts` | 修复 Babel preset 顺序，移除 umi presets |
| `src/compiler/browser.ts`    | 清理调试日志                             |

---

## 7. 测试验证

### 7.1 构建测试

```bash
pnpm build     # 编译 dist/
pnpm build:lib # 编译 lib/ (browser runtime)
```

### 7.2 运行测试

```bash
cd vue2-example
pnpm dev # 启动开发服务器
```

访问 http://localhost:8001/vue2demo 验证：

- [x] TSX Demo 正常渲染
- [x] 点击编辑按钮可进入 Live Editing
- [x] 修改代码后实时预览
- [x] SFC Demo 不受影响

---

## 8. 经验教训

1. **Babel presets 执行顺序很重要** - 逆序执行，TypeScript 应该在 JSX 转换之前运行
2. **Vue 2 Composition API 与 Options API 差异** - `setup()` 中没有 `this`，需要显式导入 `h`
3. **避免 React/Vue JSX 冲突** - 使用 `resourceQuery` 隔离不同框架的文件
4. **编译后文件同步** - 修改源码后必须重新 build，否则运行的是旧代码
