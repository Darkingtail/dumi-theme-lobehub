# P0 优化实现记录

> 日期: 2025-12-01
> 目标: 实现核心体验优化，与 preset-vue (Vue 3) 对齐

---

## 一、优化概览

| 优化项                           | 状态    | 涉及文件     |
| -------------------------------- | ------- | ------------ |
| HMR 热更新优化                   | ✅ 完成 | `config.ts`  |
| 编译错误提示优化                 | ✅ 完成 | `browser.ts` |
| Live Editing 性能优化 (编译缓存) | ✅ 完成 | `browser.ts` |

---

## 二、HMR 热更新优化

### 问题

源文件修改后经常需要完整页面刷新，状态丢失。

### 解决方案

在 vue-loader 配置中启用 `hotReload` 选项。

### 代码变更

**文件**: `src/vue2/webpack/config.ts`

```typescript
// Vue 2 SFC support with vue-loader@15
// HMR optimization: Enable hot reload for better development experience
const isDev = process.env.NODE_ENV !== 'production';

config.module
  .rule('vue')
  .test(/\.vue$/)
  .exclude.add(dumiSrc)
  .end()
  .use('vue-loader')
  .loader(require.resolve('vue-loader'))
  .options({
    babelParserPlugins: ['jsx', 'classProperties', 'decorators-legacy', 'typescript'],
    // Enable HMR in development mode
    hotReload: isDev,
    loaders: {
      ts: [tsBabelLoaderConfig],
      tsx: [tsBabelLoaderConfig],
    },
  });
```

### 效果

- 开发环境下自动启用组件级热更新
- 减少不必要的页面刷新

---

## 三、编译错误提示优化

### 问题

编译错误时 demo 区域消失，只在控制台显示 `[Vue warn]: Failed to mount component: template or render function not defined.`

### 根本原因分析

对比 preset-vue (Vue 3) 的实现：

**preset-vue 浏览器端编译器** (`browser.ts`):

```typescript
if (Array.isArray(compiled)) {
  throw compiled[0]; // 直接抛出错误
}
```

**我们之前的实现**:

```typescript
if (Array.isArray(compiled)) {
  return createErrorComponent(errorMsg, code);  // 返回错误组件字符串 (错误!)
}
```

dumi 的 LiveDemo 组件期望编译器在错误时 **抛出异常**，它会捕获并显示错误信息。返回错误组件字符串会被当作正常代码执行，导致解析失败。

### 解决方案

遵循 preset-vue 模式，直接抛出错误。

### 代码变更

**文件**: `src/compiler/browser.ts`

```typescript
// SFC 编译错误处理
if (lang === 'vue') {
  try {
    const compiled = await comp.compileSFC({ code, filename, id });

    if (Array.isArray(compiled)) {
      // Follow preset-vue pattern: throw error so dumi's LiveDemo can catch and display it
      throw compiled[0];
    }
    // ... 正常编译流程
  } catch (error) {
    // Follow preset-vue pattern: re-throw error so dumi's LiveDemo can catch and display it
    throw error;
  }
}

// TSX/JSX 编译错误处理
if (lang && ['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
  try {
    // ... 正常编译流程
  } catch (error) {
    // Follow preset-vue pattern: re-throw error so dumi's LiveDemo can catch and display it
    throw error;
  }
}
```

### 效果

错误提示现在与 preset-vue 一致，例如：

- `SyntaxError: Element is missing end tag.`
- `SyntaxError: Interpolation end sign was not found.`

---

## 四、Live Editing 性能优化 (编译缓存)

### 问题

每次修改都重新编译整个组件，响应速度慢。

### 解决方案

实现 LRU (Least Recently Used) 编译缓存，避免重复编译相同代码。

### 代码变更

**文件**: `src/compiler/browser.ts`

```typescript
// ============================================
// P0 Optimization: Compilation Cache
// ============================================

// Simple hash function for cache key generation
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Cache for compiled code (max 100 entries with LRU eviction)
const compilationCache = new Map<string, { code: string; timestamp: number }>();
const MAX_CACHE_SIZE = 100;

function getCacheKey(code: string, filename: string): string {
  return simpleHash(code + filename);
}

function getFromCache(key: string): string | null {
  const cached = compilationCache.get(key);
  if (cached) {
    // Update timestamp for LRU
    cached.timestamp = Date.now();
    return cached.code;
  }
  return null;
}

function setToCache(key: string, code: string): void {
  // Evict oldest entry if cache is full
  if (compilationCache.size >= MAX_CACHE_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, v] of compilationCache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      compilationCache.delete(oldestKey);
    }
  }
  compilationCache.set(key, { code, timestamp: Date.now() });
}
```

**在 compile 函数中使用缓存**:

```typescript
export async function compile(code: string, opts: { filename: string }) {
  const { filename } = opts;

  // P0 Optimization: Check cache first
  const cacheKey = getCacheKey(code, filename);
  const cachedResult = getFromCache(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // ... 编译逻辑 ...

  // P0 Optimization: Cache successful compilation
  setToCache(cacheKey, cjsCode);
  return cjsCode;
}
```

### 缓存流程图

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ 代码输入     │───▶│ 计算缓存键    │───▶│ 查询缓存        │
└─────────────┘    └──────────────┘    └─────────────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         │ 命中               │                    │ 未命中
                         ▼                    │                    ▼
                  ┌─────────────┐             │             ┌─────────────┐
                  │ 返回缓存结果 │             │             │ 执行编译    │
                  └─────────────┘             │             └─────────────┘
                                              │                    │
                                              │                    ▼
                                              │             ┌─────────────┐
                                              │             │ 存入缓存    │
                                              │             └─────────────┘
                                              │                    │
                                              └────────────────────┘
```

### 效果

- 最多缓存 100 个编译结果
- 使用 LRU 策略淘汰最久未使用的缓存
- 重复编辑相同代码时直接返回缓存，响应速度显著提升

---

## 五、服务端错误处理增强

### 问题

服务端编译 (`transformCode`) 在错误时返回空字符串，导致 demo 不渲染。

### 解决方案

在 `sfc.ts` 和 `jsx.ts` 中添加错误组件生成。

### 代码变更

**文件**: `src/compiler/shared.ts` (新增)

```typescript
/**
 * Generate an error component code in ES Module format
 * Used by server-side compilation (node.ts, sfc.ts, jsx.ts)
 */
export function createErrorComponentCode(errorMsg: string, source?: string): string {
  const formattedError = formatCompileError(errorMsg, source);
  const escapedError = JSON.stringify(formattedError);

  return `
const ${COMP_IDENTIFIER} = {
  name: "VueCompileError",
  render: function(h) {
    return h("div", {
      style: {
        padding: "16px",
        margin: "8px 0",
        background: "#fff2f0",
        border: "1px solid #ffccc7",
        borderRadius: "6px",
        fontFamily: "monospace",
        fontSize: "13px",
        whiteSpace: "pre-wrap",
        color: "#cf1322",
        lineHeight: "1.6"
      }
    }, ${escapedError});
  }
};
export default ${COMP_IDENTIFIER};
`;
}
```

**文件**: `src/vue2/techStack/sfc.ts`

```typescript
transformCode(raw, opts) {
  if (opts.type === 'code-block') {
    const js = compile({ code: raw, filename, id });

    // P0 Optimization: Generate error component instead of returning empty string
    if (Array.isArray(js)) {
      const errorMsg = js.map((e) => e.message || String(e)).join('\n');
      logger.error('[Vue2 SFC Compile Error]', errorMsg);
      const errorCode = createErrorComponentCode(errorMsg, raw);
      const code = wrapDemoWithFn(errorCode, { ... });
      return `(${code})()`;
    }
    // ...
  }
}
```

---

## 六、与 preset-vue 对比

| 功能         | preset-vue (Vue 3) | preset-vue2 (Vue 2)            |
| ------------ | ------------------ | ------------------------------ |
| HMR 热更新   | Vite 原生支持      | Webpack + vue-loader hotReload |
| 编译错误提示 | throw error        | throw error (已对齐)           |
| 编译缓存     | 无                 | LRU 缓存 (100 entries)         |
| 错误显示     | dumi LiveDemo 捕获 | dumi LiveDemo 捕获 (已对齐)    |

---

## 七、测试方法

### 测试编译错误提示

1. 打开 http://localhost:8000/components
2. 展开任意 demo 的代码编辑器
3. 输入语法错误，例如：
   ```vue
   <script>
   export default {
     data() {
       return {
         message: 'Hello' +++
       }
     }
   }
   </script>
   ```
4. 应该看到红色错误提示，如 `SyntaxError: Unexpected token`

### 测试编译缓存

1. 在 Live Editor 中修改代码
2. 撤销修改 (Ctrl+Z)
3. 第二次编译应该更快（命中缓存）

---

## 八、文件变更清单

| 文件                         | 变更类型 | 说明                            |
| ---------------------------- | -------- | ------------------------------- |
| `src/vue2/webpack/config.ts` | 修改     | 添加 `hotReload: isDev`         |
| `src/compiler/browser.ts`    | 修改     | 添加缓存、改为 throw error      |
| `src/compiler/shared.ts`     | 修改     | 添加 `createErrorComponentCode` |
| `src/vue2/techStack/sfc.ts`  | 修改     | 使用错误组件                    |
| `src/vue2/techStack/jsx.ts`  | 修改     | 使用错误组件                    |
