# 技术选型

## 1. 技术选型总览

| 模块               | 选型                  | 备选方案              | 选择理由             |
| ------------------ | --------------------- | --------------------- | -------------------- |
| API 提取           | vue-docgen-api        | vue-type-metadata     | Vue 2 专用，成熟稳定 |
| SFC 编译 (Node)    | vue-template-compiler | -                     | Vue 2 官方工具       |
| SFC 编译 (Browser) | 自研                  | vue-template-compiler | 需要浏览器端运行     |
| JSX 转换           | @vue/babel-preset-jsx | -                     | Vue 2 官方 JSX 方案  |
| 浏览器 Babel       | Babel Standalone      | SWC WASM              | 生态成熟，插件丰富   |
| LESS 编译          | less.js (CDN)         | -                     | 浏览器端唯一方案     |
| SCSS 编译          | sass.js (CDN)         | dart-sass WASM        | 体积小，兼容性好     |
| 缓存策略           | LRU Cache             | Map                   | 限制内存占用         |

## 2. API 提取方案

### 2.1 方案对比

| 方案               | 原理                | Vue 2 支持    | TypeScript | 维护状态 |
| ------------------ | ------------------- | ------------- | ---------- | -------- |
| **vue-docgen-api** | AST 解析            | ✅ 完整       | 部分       | 活跃     |
| vue-type-metadata  | TS 类型解析         | ❌ Vue 3 only | 完整       | 活跃     |
| @dumijs/vue-meta   | TS Language Service | ❌ Vue 3 only | 完整       | 活跃     |
| 手动 AST 解析      | 自研                | 可定制        | 需自研     | -        |

### 2.2 选择 vue-docgen-api

**选择理由**：

1. **Vue 2 专用**：专门为 Vue 2 设计，对 Options API 支持完善
2. **功能完整**：支持 Props、Events、Slots、Methods、Mixins 提取
3. **生态成熟**：Storybook for Vue 2 也使用此方案
4. **社区活跃**：持续维护，有问题可获得支持

**局限性**：

- TypeScript 支持有限，无法像 @dumijs/vue-meta 那样完整解析类型
- 需要自研 `PropType<T>` 泛型提取

### 2.3 PropType<T> 增强

由于 vue-docgen-api 无法完整提取 `PropType<T>` 泛型，我们自研了增强方案：

```typescript
// 输入
props: {
  user: {
    type: Object as PropType<User>,
    required: true
  }
}

// vue-docgen-api 输出
{ type: { name: 'object' } }

// 增强后输出
{ type: { name: 'User', schema: 'reference' } }
```

## 3. SFC 编译方案

### 3.1 Node.js 侧编译

使用 Vue 2 官方工具链：

```
.vue 文件
    ↓
vue-template-compiler (解析 SFC)
    ↓
├── template → vue-template-compiler.compile()
├── script  → Babel + @vue/babel-preset-jsx
└── style   → less/sass + postcss
    ↓
可执行的 ES Module
```

**依赖**：

- `vue-template-compiler`: SFC 解析和模板编译
- `@vue/component-compiler-utils`: 样式处理
- `@babel/core` + `@vue/babel-preset-jsx`: JSX 转换

### 3.2 浏览器侧编译

由于 Live Editing 需要在浏览器中编译 SFC，无法直接使用 Node.js 工具，需自研方案：

```
浏览器中的 .vue 代码
    ↓
自研 SFC Parser (正则 + 状态机)
    ↓
├── template → 简化版 template compiler
├── script  → Babel Standalone
└── style   → less.js / sass.js (CDN)
    ↓
Vue 组件对象
```

**关键实现**：

1. **SFC 解析**：使用正则表达式提取 template/script/style 块
2. **模板编译**：将 template 转换为 render 函数
3. **脚本编译**：Babel Standalone + Vue JSX 预设
4. **样式处理**：CDN 加载 less.js/sass.js

### 3.3 为什么不用 WASM 方案

| 方案             | 优点               | 缺点               |
| ---------------- | ------------------ | ------------------ |
| Babel Standalone | 生态成熟，插件丰富 | 体积较大 (~500KB)  |
| SWC WASM         | 速度快             | Vue JSX 插件不完善 |
| esbuild WASM     | 速度快             | 不支持 Vue 2 JSX   |

**结论**：Babel Standalone 是目前唯一能完整支持 Vue 2 JSX 的浏览器端方案。

## 4. JSX/TSX 转换方案

### 4.1 Vue 2 JSX vs Vue 3 JSX

```jsx
// Vue 2 JSX (h 函数参数不同)
h(
  'div',
  {
    class: 'container',
    on: { click: handler },
  },
  children,
);

// Vue 3 JSX
h(
  'div',
  {
    class: 'container',
    onClick: handler,
  },
  children,
);
```

### 4.2 选择 @vue/babel-preset-jsx

这是 Vue 2 官方推荐的 JSX 转换方案，包含：

- `@vue/babel-plugin-transform-vue-jsx`: 核心转换
- `@vue/babel-plugin-jsx-event-modifiers`: 事件修饰符
- `@vue/babel-plugin-jsx-v-model`: v-model 支持

**Babel 配置**：

```javascript
{
  presets: [
    [
      '@vue/babel-preset-jsx',
      {
        injectH: true, // 自动注入 h 函数
        compositionAPI: true, // 支持 Composition API
      },
    ],
  ];
}
```

### 4.3 React/Vue JSX 区分

由于 dumi 同时支持 React 和 Vue，需要智能区分 JSX 类型：

**区分策略**：

1. **路径匹配**：通过 `jsxIncludes` 配置指定 Vue JSX 文件路径
2. **代码分析**：检测 import 语句（`import Vue` vs `import React`）
3. **语法特征**：Vue JSX 使用 `on={{ click }}` 而非 `onClick`

```typescript
// 配置示例
vue2: {
  jsxIncludes: ['/components/', '/vue2/'],  // 这些路径下的 JSX 按 Vue 处理
}
```

## 5. 样式预处理方案

### 5.1 Node.js 侧

使用标准 npm 包：

```javascript
// LESS
const less = require('less');
const result = await less.render(code);

// SCSS
const sass = require('sass');
const result = sass.compileString(code);
```

### 5.2 浏览器侧

通过 CDN 加载编译器：

```javascript
// LESS - less.js
await loadScript('https://cdn.bootcdn.net/ajax/libs/less.js/4.2.0/less.min.js');
const result = await window.less.render(code);

// SCSS - sass.js
await loadScript('https://cdn.jsdelivr.net/npm/sass.js@0.11.1/dist/sass.sync.min.js');
const result = Sass.compile(code);
```

**选择 sass.js 而非 dart-sass WASM**：

- sass.js 体积更小 (~1MB vs ~4MB)
- 同步 API 使用更简单
- 浏览器兼容性更好

### 5.3 Scoped Styles 实现

```vue
<style scoped>
.button {
  color: red;
}
</style>
```

编译后：

```css
.button[data-v-f3f3eg9] {
  color: red;
}
```

**实现原理**：

1. 生成唯一 scopeId（基于组件 hash）
2. 为每个选择器添加 `[data-v-xxx]` 属性选择器
3. 在组件根元素添加 `data-v-xxx` 属性

## 6. 缓存策略

### 6.1 为什么需要缓存

- **编译耗时**：SFC 编译涉及模板解析、Babel 转换、样式处理，耗时较长
- **重复请求**：Live Editing 中代码变化时可能重复编译相同内容
- **内存限制**：浏览器内存有限，不能无限缓存

### 6.2 LRU 缓存实现

```typescript
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    // 移到末尾（最近使用）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 删除最久未使用
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

**缓存 Key 设计**：

```typescript
const cacheKey = md5(sourceCode + scopeId + options);
```

## 7. 构建工具

### 7.1 Node.js 侧构建

使用 **father** (dumi 官方推荐的库构建工具)：

```json
{
  "scripts": {
    "build": "father build"
  }
}
```

输出 ESM 和 CJS 双格式到 `dist/` 目录。

### 7.2 浏览器侧构建

使用 **Webpack** 构建运行时代码：

```javascript
// webpack.lib.config.js
module.exports = {
  entry: './src/vue2/runtime/index.ts',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'runtime.js',
    library: { type: 'umd' },
  },
  // ...
};
```

输出到 `lib/` 目录，通过 script 标签在浏览器加载。

## 8. 技术选型总结

```
┌─────────────────────────────────────────────────────────────┐
│                     preset-vue2 技术栈                       │
├─────────────────────────────────────────────────────────────┤
│  Node.js 侧                    │  浏览器侧                    │
├────────────────────────────────┼────────────────────────────┤
│  vue-docgen-api (API 提取)     │  自研 SFC Parser            │
│  vue-template-compiler (SFC)   │  Babel Standalone (JSX)    │
│  @vue/babel-preset-jsx         │  less.js (CDN)             │
│  less / sass (npm)             │  sass.js (CDN)             │
│  father (构建)                 │  Webpack (构建)            │
├────────────────────────────────┴────────────────────────────┤
│                      共享模块                                │
│  TypeScript / LRU Cache / Error Handling                    │
└─────────────────────────────────────────────────────────────┘
```

---

下一篇：[架构设计](./04-ARCHITECTURE.md)
