# Vue2 Preset Live Editing 技术文档

## 概述

本次改动解决了 dumi Vue2 preset 在 Live Editing（实时编辑）功能中遇到的多个模块解析问题，使 Vue2 SFC 和 TSX/JSX 组件能够正常支持实时编辑预览。

---

## 问题列表与解决方案

### 问题 1: PreviewerActions 崩溃

**错误信息:**

```
Cannot read properties of undefined (reading '0') at PreviewerActions
```

**根因分析:**

- dumi 的 `block.js` 中定义了 `DEFAULT_DEMO_MODULE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"]`
- `.vue` 文件不在此列表中，导致 Vue SFC 文件的 `asset.dependencies` 没有 `FILE` 类型的条目
- PreviewerActions 组件尝试访问 `files[activeKey]` 时，因 `files` 为空而崩溃

**解决方案:**
在 `sfc.ts` 和 `jsx.ts` 中实现 `generateMetadata` 钩子，手动添加 FILE 依赖：

```typescript
// sfc.ts & jsx.ts
generateMetadata(asset, opts) {
  const hasFileEntry = Object.values(asset.dependencies).some((dep) => dep.type === 'FILE');

  if (!hasFileEntry) {
    let sourceCode = opts.entryPointCode || '';
    if (!sourceCode && opts.fileAbsPath) {
      try {
        sourceCode = fs.readFileSync(opts.fileAbsPath, 'utf-8');
      } catch {
        sourceCode = '';
      }
    }

    const entryFilename = opts.fileAbsPath
      ? path.basename(opts.fileAbsPath)
      : asset.entry || 'index.vue';

    asset.dependencies[entryFilename] = {
      type: 'FILE',
      value: sourceCode,
    };

    if (!asset.entry) {
      asset.entry = entryFilename;
    }
  }
  return asset;
}
```

---

### 问题 2: Cannot find module: vue

**错误信息:**

```
Error: Cannot find module: vue
```

**根因分析:**

- dumi 的 Live Editing 使用 `useLiveDemo` 钩子在浏览器端执行编译后的代码
- 编译后的代码使用 `require('vue')` 导入 Vue
- `require` 函数通过 `context` 对象解析模块：
  ```javascript
  liveRequire = function (v) {
    if (v in context) return context[v];
    throw new Error('Cannot find module: ' + v);
  };
  ```
- `context` 来源于 `demo.resolveMap`，而 Vue 不在其中

**解决方案:**
在 tech stack 中实现 `generateSources` 钩子，将 Vue 添加到 resolveMap：

```typescript
// sfc.ts & jsx.ts
generateSources(resolveMap) {
  if (!resolveMap['vue']) {
    resolveMap['vue'] = 'vue';
  }
  return resolveMap;
}
```

---

### 问题 3: Cannot find module: @vue/babel-helper-vue-jsx-merge-props

**错误信息:**

```
Error: Cannot find module: @vue/babel-helper-vue-jsx-merge-props
```

**根因分析:**

- Vue JSX 编译时，Babel 插件会注入 `@vue/babel-helper-vue-jsx-merge-props` 辅助函数
- 这个辅助函数用于合并 JSX props
- Live Editing 时，编译后的代码尝试 `require` 这个模块但找不到

**解决方案:**
在 `jsx.ts` 的 `generateSources` 中自动添加此辅助模块：

```typescript
// jsx.ts
generateSources(resolveMap) {
  if (!resolveMap['vue']) {
    resolveMap['vue'] = 'vue';
  }
  // 自动添加 Vue JSX babel 辅助模块
  if (!resolveMap['@vue/babel-helper-vue-jsx-merge-props']) {
    resolveMap['@vue/babel-helper-vue-jsx-merge-props'] =
      '@vue/babel-helper-vue-jsx-merge-props';
  }
  return resolveMap;
}
```

---

### 问题 4: Cannot find module: element-ui

**错误信息:**

```
Error: Cannot find module: element-ui
```

**根因分析:**

- 用户代码中导入了 `element-ui` 组件库
- Live Editing 需要在浏览器端解析这些第三方模块
- 这些模块不在默认的 resolveMap 中

**解决方案:**
新增 `resolveMap` 配置选项，允许用户指定需要在 Live Editing 中可用的模块：

**1. 更新类型定义 (`shared.ts`):**

```typescript
export interface Vue2Config {
  compiler?: { ... };
  jsxIncludes?: JsxIncludesConfig;
  /**
   * 在 Live Editing 上下文中包含的额外模块
   * 这些模块将可通过 require() 在 Live Editing 中使用
   * 示例: ['element-ui', 'lodash']
   */
  resolveMap?: string[];
}
```

**2. 传递配置到 tech stack (`techStack/index.ts`):**

```typescript
api.register({
  fn: () =>
    Vue2JSXTechStack({
      jsxIncludes: vue2Config?.jsxIncludes,
      resolveMap: vue2Config?.resolveMap,
      runtimeOpts,
    }),
  key: 'registerTechStack',
  stage: 0,
});
```

**3. 在 generateSources 中应用用户配置:**

```typescript
generateSources(resolveMap) {
  if (!resolveMap['vue']) {
    resolveMap['vue'] = 'vue';
  }
  // 添加用户配置的模块
  if (userResolveMap) {
    for (const mod of userResolveMap) {
      if (!resolveMap[mod]) {
        resolveMap[mod] = mod;
      }
    }
  }
  return resolveMap;
}
```

**4. 用户配置示例 (`.dumirc.ts`):**

```typescript
export default {
  vue2: {
    jsxIncludes: ['vue2demo'],
    resolveMap: ['element-ui'], // 新增
  },
};
```

---

### 问题 5: Cannot find module: element-ui/lib/theme-chalk/index.css

**错误信息:**

```
Error: Cannot find module: element-ui/lib/theme-chalk/index.css
```

**根因分析:**

- TSX 文件中直接导入 CSS：`import 'element-ui/lib/theme-chalk/index.css'`
- 浏览器端编译后，这变成 `require('element-ui/lib/theme-chalk/index.css')`
- CSS 文件无法作为 JS 模块被 require
- 注意：SFC 文件不存在此问题，因为样式通过 `<style>` 块处理

**解决方案:**
在浏览器端编译器中剥离 CSS 导入，因为样式已在初始页面加载时加载：

```typescript
// browser.ts - 在 TSX/JSX 处理逻辑中
// Handle TSX/JSX/TS/JS files
if (lang && ['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
  try {
    let js = comp.transformTS(code, filename, { lang });
    const cjsResult = comp.toCommonJS(js);
    let cjsCode = cjsResult?.code || js;

    // 为 Live Editing 移除 CSS/样式导入
    // 这些样式已在初始页面加载时加载，Live Editing 时不需要重新加载
    cjsCode = cjsCode.replace(
      /require\s*\(\s*["'][^"']+\.(css|less|scss|sass|styl|stylus)["']\s*\)\s*;?/g,
      '/* css import removed for live editing */'
    );

    // ... 后续处理
  }
}
```

---

## 技术难点总结

| 难点                | 描述                                                                              | 复杂度   |
| ------------------- | --------------------------------------------------------------------------------- | -------- |
| dumi 内部机制理解   | 需要深入理解 dumi 的 tech stack 钩子、block.js 资源解析、useLiveDemo 模块解析机制 | ⭐⭐⭐⭐ |
| 模块解析上下文      | Live Editing 在浏览器端运行，需要手动管理模块解析上下文                           | ⭐⭐⭐   |
| SFC vs TSX 差异处理 | 两种文件类型的样式处理机制不同，需要分别处理                                      | ⭐⭐⭐   |
| CSS 导入处理        | 浏览器端无法直接 require CSS 文件，需要在编译阶段剥离                             | ⭐⭐     |

---

## 文件改动清单

| 文件路径                      | 改动类型 | 说明                                       |
| ----------------------------- | -------- | ------------------------------------------ |
| `src/shared.ts`               | 修改     | 新增 `resolveMap` 配置类型                 |
| `src/vue2/techStack/index.ts` | 修改     | 传递 `resolveMap` 到 tech stack            |
| `src/vue2/techStack/jsx.ts`   | 修改     | 实现 `generateMetadata`、`generateSources` |
| `src/vue2/techStack/sfc.ts`   | 修改     | 实现 `generateMetadata`、`generateSources` |
| `src/compiler/browser.ts`     | 修改     | 剥离 CSS 导入                              |
| `vue2-example/.dumirc.ts`     | 修改     | 添加 `resolveMap` 配置示例                 |

---

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        dumi Live Editing                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   用户代码    │───▶│  browser.ts  │───▶│   编译后的 CJS   │  │
│  │  (TSX/SFC)   │    │  (编译器)     │    │      代码        │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│                                                    │             │
│                                                    ▼             │
│                      ┌─────────────────────────────────────┐    │
│                      │           useLiveDemo               │    │
│                      │  ┌─────────────────────────────┐   │    │
│                      │  │     liveRequire(module)     │   │    │
│                      │  │            │                │   │    │
│                      │  │            ▼                │   │    │
│                      │  │   context[module] 查找      │   │    │
│                      │  │            │                │   │    │
│                      │  │     ┌──────┴──────┐        │   │    │
│                      │  │     ▼             ▼        │   │    │
│                      │  │  找到返回     抛出错误     │   │    │
│                      │  └─────────────────────────────┘   │    │
│                      └─────────────────────────────────────┘    │
│                                      ▲                          │
│                                      │                          │
│  ┌───────────────────────────────────┴───────────────────────┐ │
│  │                    generateSources                         │ │
│  │  resolveMap = {                                           │ │
│  │    'vue': 'vue',                                          │ │
│  │    '@vue/babel-helper-vue-jsx-merge-props': '...',        │ │
│  │    'element-ui': 'element-ui',  // 用户配置               │ │
│  │  }                                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 使用指南

用户如需在 Live Editing 中使用第三方库，需在 `.dumirc.ts` 中配置：

```typescript
export default {
  vue2: {
    // 指定哪些 TSX/JSX 文件由 Vue2 处理
    jsxIncludes: ['vue2demo'],

    // Live Editing 需要的第三方模块
    resolveMap: [
      'element-ui',
      'lodash',
      // 其他需要的模块...
    ],
  },
};
```

---

## 相关源码参考

### dumi 源码位置

- **block.js** (资源解析): `node_modules/dumi/dist/loaders/markdown/transformer/rehypeDemo.js`
- **useLiveDemo.js** (Live Editing): `node_modules/dumi/dist/client/theme-api/useLiveDemo.js`
- **tech-stack-utils** (Tech Stack 工具): `node_modules/dumi/tech-stack-utils`

### 关键代码片段

**dumi useLiveDemo 模块解析逻辑:**

```javascript
// useLiveDemo.js 第 100-102 行
liveRequire = function (v) {
  if (v in context) return context[v];
  throw new Error('Cannot find module: ' + v);
};
```

**dumi block.js 默认扩展名:**

```javascript
// block.js
const DEFAULT_DEMO_MODULE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
```
