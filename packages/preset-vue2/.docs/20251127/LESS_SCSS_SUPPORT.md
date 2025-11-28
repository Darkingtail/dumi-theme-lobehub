# LESS/SCSS 样式预处理支持

> 日期: 2025-11-27
> 作者: Claude Code

## 概述

本次更新为 `@dumijs/preset-vue2` 添加了对 LESS 和 SCSS/SASS 样式预处理器的完整支持，包括 Node.js 静态编译和浏览器端 Live Editing 两种场景。

## 问题背景

之前的实现中，SFC 的 `<style>` 标签仅支持原生 CSS：

```vue
<!-- 之前仅支持 -->
<style scoped>
.container {
  color: red;
}
</style>

<!-- 以下会触发警告，样式不会编译 -->
<style scoped lang="less">
.container {
  .inner {
    color: red;
  }
}
</style>
```

用户需要使用 LESS/SCSS 的嵌套语法、变量等特性，但 Live Editing 中无法正常工作。

## 解决方案

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Style Compilation                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │   Node.js 端    │         │   Browser 端    │            │
│  │  (静态编译)     │         │ (Live Editing)  │            │
│  └────────┬────────┘         └────────┬────────┘            │
│           │                           │                      │
│           ▼                           ▼                      │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │ less (npm)      │         │ less.js (CDN)   │            │
│  │ sass (npm)      │         │ sass.js (CDN)   │            │
│  └────────┬────────┘         └────────┬────────┘            │
│           │                           │                      │
│           └───────────┬───────────────┘                      │
│                       ▼                                      │
│              ┌─────────────────┐                             │
│              │ @vue/compiler-sfc│                            │
│              │   compileStyle  │                             │
│              └─────────────────┘                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 文件修改清单

| 文件路径                      | 修改内容                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `package.json`                | 添加 `less`、`sass` 依赖和 `@types/less` 类型声明         |
| `src/compiler/shared.ts`      | 添加预处理器相关类型和函数                                |
| `src/compiler/index.ts`       | Node.js 端预处理器实现（含 LESS 回调类型注解）            |
| `src/compiler/browser.ts`     | Browser 端异步预处理器实现（使用 window.less 运行时检查） |
| `src/shared.ts`               | 添加 CDN 常量                                             |
| `src/vue2/techStack/index.ts` | 加载 CDN 脚本                                             |

## 实现细节

### 1. 支持的样式语言

```typescript
// src/compiler/shared.ts
export const SUPPORTED_STYLE_LANGS = ['css', 'less', 'scss', 'sass'] as const;
```

### 2. 预处理器类型定义

```typescript
// src/compiler/shared.ts
export type StylePreprocessor = (source: string, lang: string) => string | Promise<string>;
```

### 3. Node.js 端预处理器

```typescript
// src/compiler/index.ts
import less from 'less';
import * as sass from 'sass';

const nodeStylePreprocessor: StylePreprocessor = (source: string, lang: string): string => {
  if (lang === 'less') {
    let result = '';
    let error: Error | null = null;
    less.render(source, { syncImport: true }, (err, output) => {
      if (err) {
        error = new Error(`LESS compile error: ${err.message}`);
      } else if (output) {
        result = output.css;
      }
    });
    if (error) throw error;
    return result;
  }

  if (lang === 'scss' || lang === 'sass') {
    const result = sass.compileString(source, {
      syntax: lang === 'sass' ? 'indented' : 'scss',
    });
    return result.css;
  }

  return source;
};
```

**注意**: LESS 的 `render` 方法是异步的，但通过 `syncImport: true` 选项和回调模式，在简单场景下可以同步获取结果。

### 4. Browser 端预处理器

```typescript
// src/compiler/browser.ts
// Global type declaration for sass.js (CDN-loaded library)
// Note: @types/less provides the global `less` type, so we only declare Sass here
declare global {
  // eslint-disable-next-line no-var
  var Sass:
    | {
        compile: (input: string) => string;
      }
    | undefined;
}

async function browserStylePreprocessor(source: string, lang: string): Promise<string> {
  if (lang === 'less') {
    // Check if less.js is loaded via CDN (runtime check)
    const lessLib = typeof window !== 'undefined' ? (window as any).less : undefined;
    if (!lessLib) {
      console.warn('[Vue2 Compiler] less.js not loaded. LESS styles will not be compiled.');
      return source;
    }
    try {
      const result = await lessLib.render(source);
      return result.css;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`LESS compile error: ${msg}`);
    }
  }

  if (lang === 'scss' || lang === 'sass') {
    if (typeof Sass === 'undefined') {
      console.warn('[Vue2 Compiler] sass.js not loaded. SCSS/SASS styles will not be compiled.');
      return source;
    }
    try {
      return Sass.compile(source);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`SCSS compile error: ${msg}`);
    }
  }

  return source;
}
```

> **注意**: 这里使用 `(window as any).less` 而非直接使用全局 `less`，是因为 `@types/less` 将 `less` 声明为始终存在，但在 CDN 加载场景下可能尚未加载完成。详见下方"遇到的问题与解决方案"章节。

### 5. CDN 配置

```typescript
// src/shared.ts
export const LESS_CDN = 'https://cdn.bootcdn.net/ajax/libs/less.js/4.2.0/less.min.js';
export const SASS_CDN = 'https://cdn.jsdelivr.net/npm/sass.js@0.11.1/dist/sass.sync.min.js';
```

### 6. 脚本加载

```typescript
// src/vue2/techStack/index.ts
api.addHTMLHeadScripts(() => {
  return [
    { src: vue2Config?.compiler?.babelStandaloneCDN || BABEL_STANDALONE_CDN },
    { src: vue2Config?.compiler?.lessCDN || LESS_CDN },
    { src: vue2Config?.compiler?.sassCDN || SASS_CDN },
  ];
});
```

### 7. 异步样式编译

Browser 端需要异步编译样式，因此 `compileSFC` 改为异步函数：

```typescript
// src/compiler/browser.ts
async function compileSFC(options: CompileOptions): Promise<CompileResult> {
  // ...
  if (!skipStyleCompile && descriptor.styles.length > 0) {
    const styleResult = await compileStylesAsync(
      id,
      descriptor.styles,
      filename,
      browserStylePreprocessor,
    );
    if (Array.isArray(styleResult)) {
      return styleResult;
    }
    css = styleResult;
  }
  // ...
}
```

## 用户配置

用户可以通过 `.dumirc.ts` 自定义 CDN 地址：

```typescript
// .dumirc.ts
export default {
  vue2: {
    compiler: {
      babelStandaloneCDN: 'https://your-cdn.com/babel.min.js',
      lessCDN: 'https://your-cdn.com/less.min.js',
      sassCDN: 'https://your-cdn.com/sass.sync.min.js',
    },
  },
};
```

## 使用示例

### LESS 示例

```vue
<template>
  <div class="container">
    <span class="title">Hello</span>
  </div>
</template>

<style scoped lang="less">
@primary-color: #1890ff;

.container {
  padding: 16px;

  .title {
    color: @primary-color;
    font-size: 18px;

    &:hover {
      color: darken(@primary-color, 10%);
    }
  }
}
</style>
```

### SCSS 示例

```vue
<template>
  <div class="card">
    <h2 class="card-title">Title</h2>
    <p class="card-content">Content</p>
  </div>
</template>

<style scoped lang="scss">
$border-radius: 8px;
$shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

.card {
  border-radius: $border-radius;
  box-shadow: $shadow;
  padding: 16px;

  &-title {
    margin: 0 0 8px;
    font-size: 20px;
  }

  &-content {
    margin: 0;
    color: #666;
  }
}
</style>
```

## 遇到的问题与解决方案

在实现过程中遇到了以下 TypeScript 类型相关的问题：

### 问题 1: 缺少 LESS 类型声明

**错误信息:**

```
TS7016: Could not find a declaration file for module 'less'.
```

**原因:** `less` 包没有内置 TypeScript 类型声明。

**解决方案:** 在 `package.json` 的 `devDependencies` 中添加 `@types/less`:

```json
{
  "devDependencies": {
    "@types/less": "^3.0.6"
  }
}
```

### 问题 2: LESS 回调参数隐式 any 类型

**错误信息:**

```
TS7006: Parameter 'err' implicitly has an 'any' type.
TS7006: Parameter 'output' implicitly has an 'any' type.
```

**原因:** `less.render()` 的回调函数参数没有显式类型注解。

**解决方案:** 为回调参数添加显式类型注解：

```typescript
// src/compiler/index.ts
less.render(
  source,
  { syncImport: true },
  (err: Less.RenderError | undefined, output: Less.RenderOutput | undefined) => {
    if (err) {
      error = new Error(`LESS compile error: ${err.message}`);
    } else if (output) {
      result = output.css;
    }
  },
);
```

### 问题 3: 全局变量 less 重复声明

**错误信息:**

```
TS2403: Subsequent variable declarations must have the same type.
Variable 'less' must be of type 'LessStatic', but here has type '{ render: ... }'.
```

**原因:** `@types/less` 已经在全局声明了 `less` 变量，而 `browser.ts` 中又手动声明了一个不同类型的 `less`，导致类型冲突。

**解决方案:** 移除 `browser.ts` 中对 `less` 的全局声明，只保留 `Sass` 的声明（因为 sass.js 没有官方类型定义）：

```typescript
// src/compiler/browser.ts
// Global type declaration for sass.js (CDN-loaded library)
// Note: @types/less provides the global `less` type, so we only declare Sass here
declare global {
  // eslint-disable-next-line no-var
  var Sass:
    | {
        compile: (input: string) => string;
      }
    | undefined;
}
```

### 问题 4: CDN 加载场景下 less 可能未定义

**问题:** `@types/less` 将 `less` 声明为始终存在的全局变量，但在浏览器 CDN 加载场景下，`less` 可能尚未加载完成。使用 `typeof less === 'undefined'` 检查会被 TypeScript 认为永远为 false。

**解决方案:** 使用 `window` 对象进行运行时检查，绕过 TypeScript 的静态类型分析：

```typescript
// src/compiler/browser.ts
async function browserStylePreprocessor(source: string, lang: string): Promise<string> {
  if (lang === 'less') {
    // Check if less.js is loaded via CDN (runtime check)
    const lessLib = typeof window !== 'undefined' ? (window as any).less : undefined;
    if (!lessLib) {
      console.warn('[Vue2 Compiler] less.js not loaded. LESS styles will not be compiled.');
      return source;
    }
    try {
      const result = await lessLib.render(source);
      return result.css;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`LESS compile error: ${msg}`);
    }
  }
  // ...
}
```

**关键点:**

- 使用 `(window as any).less` 进行运行时检查
- 将结果存入局部变量 `lessLib`，后续使用该变量调用方法
- 这样既保证了运行时安全，又避免了 TypeScript 类型错误

### 总结

| 问题               | 解决方案                                                |
| ------------------ | ------------------------------------------------------- |
| 缺少 LESS 类型声明 | 安装 `@types/less`                                      |
| 回调参数隐式 any   | 添加 `Less.RenderError` 和 `Less.RenderOutput` 类型注解 |
| 全局变量重复声明   | 移除自定义 `less` 声明，使用 `@types/less` 提供的类型   |
| CDN 场景运行时检查 | 使用 `(window as any).less` 绕过静态类型检查            |

## 限制与注意事项

1. **浏览器端性能**: LESS/SCSS 在浏览器端编译会有一定性能开销，仅建议在开发阶段使用
2. **sass.js 限制**: sass.js 是 LibSass 的浏览器移植版本，不支持 Dart Sass 的一些新特性
3. **@import 不支持**: 浏览器端不支持 `@import` 外部文件
4. **CDN 依赖**: Live Editing 功能依赖 CDN 可用性

## 测试验证

测试文件:

- `vue2-example/docs/vue2demo/demos/LoginFormSFC.vue` - LESS 样式
- `vue2-example/docs/vue2demo/demos/LoginFormSetup.vue` - SCSS 样式

验证步骤:

1. 运行 `pnpm build:lib` 构建库文件
2. 进入 `vue2-example` 目录运行 `pnpm dev`
3. 访问 http://localhost:8000/vue2demo
4. 测试 Live Editing 功能，修改样式代码验证实时更新

## 相关文件

- `src/compiler/shared.ts` - 共享工具函数
- `src/compiler/index.ts` - Node.js 编译器
- `src/compiler/browser.ts` - Browser 编译器
- `src/shared.ts` - CDN 常量
- `src/vue2/techStack/index.ts` - TechStack 注册
