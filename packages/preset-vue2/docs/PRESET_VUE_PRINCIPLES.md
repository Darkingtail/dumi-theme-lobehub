# dumi @dumijs/preset-vue 原理深入解析

> 本文档深入分析 dumi 官方 Vue 3 预设插件 `@dumijs/preset-vue` 的设计原理和实现机制，帮助理解 dumi 技术栈扩展体系。

## 目录

1. [架构概览](#架构概览)
2. [核心概念](#核心概念)
3. [TechStack 机制](#techstack-机制)
4. [编译器架构](#编译器架构)
5. [运行时渲染](#运行时渲染)
6. [Live Editing 实现](#live-editing-实现)
7. [构建流程](#构建流程)

---

## 架构概览

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         dumi 核心                                │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │ registerTech│    │   Webpack    │    │   Runtime API   │    │
│  │   Stack     │◄───│   Plugin     │    │  (IDemoCancel-  │    │
│  │    API      │    │   System     │    │   ableFn)       │    │
│  └──────┬──────┘    └──────────────┘    └────────┬────────┘    │
└─────────┼───────────────────────────────────────┼──────────────┘
          │                                        │
          ▼                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    @dumijs/preset-vue                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Tech Stack Layer                        │   │
│  │  ┌─────────────────┐      ┌─────────────────────────┐    │   │
│  │  │  VueJSXTechStack│      │    VueSfcTechStack      │    │   │
│  │  │  (.jsx/.tsx)    │      │    (.vue)               │    │   │
│  │  │  stage: 0       │      │    stage: 1             │    │   │
│  │  └────────┬────────┘      └───────────┬─────────────┘    │   │
│  └───────────┼───────────────────────────┼──────────────────┘   │
│              │                           │                       │
│              ▼                           ▼                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Compiler Layer                          │   │
│  │  ┌─────────────────────┐    ┌─────────────────────────┐  │   │
│  │  │    Node Compiler    │    │   Browser Compiler      │  │   │
│  │  │  (构建时 SSR)        │    │   (Live Editing)        │  │   │
│  │  │  vue/compiler-sfc   │    │   @babel/standalone     │  │   │
│  │  └─────────────────────┘    └─────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Runtime Layer                           │   │
│  │  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐  │   │
│  │  │   renderer    │  │  preflight  │  │ runtimePlugin  │  │   │
│  │  │  (组件挂载)    │  │  (预检)     │  │  (Vue 插件)     │  │   │
│  │  └───────────────┘  └─────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 文件结构

```
@dumijs/preset-vue/
├── src/
│   ├── index.ts                 # 插件入口
│   ├── shared.ts                # 共享常量
│   ├── compiler/
│   │   ├── index.ts             # 编译器核心逻辑
│   │   ├── node.ts              # Node.js 端编译器
│   │   └── browser.ts           # 浏览器端编译器
│   └── vue/
│       ├── index.ts             # Vue 插件入口
│       ├── techStack/
│       │   ├── index.ts         # Tech Stack 注册
│       │   ├── sfc.ts           # SFC Tech Stack
│       │   └── jsx.ts           # JSX Tech Stack
│       ├── runtime/
│       │   ├── renderer.ts      # 运行时渲染器
│       │   ├── preflight.ts     # 预检函数
│       │   └── runtimePlugin.ts # Vue 运行时插件
│       └── webpack/
│           └── config.ts        # Webpack 配置
├── lib/                         # 浏览器端构建产物
└── dist/                        # Node.js 端构建产物
```

---

## 核心概念

### 1. 双端编译架构

dumi preset-vue 采用双端编译架构：

| 端         | 用途             | 编译器                    | 时机   |
| ---------- | ---------------- | ------------------------- | ------ |
| Node.js 端 | SSR / 构建时编译 | `vue/compiler-sfc`        | 构建时 |
| 浏览器端   | Live Editing     | `@babel/standalone` + SFC | 运行时 |

**为什么需要双端编译？**

```typescript
// 构建时：Node.js 端编译 SFC
// - 性能好，完整的编译能力
// - 输出预编译的 JavaScript

// 运行时：浏览器端编译（Live Editing）
// - 用户实时修改代码后重新编译
// - 受限于浏览器环境，能力有限
```

### 2. Tech Stack 概念

dumi 通过 Tech Stack 机制支持多种技术栈：

```typescript
interface IDumiTechStack {
  name: string; // 技术栈名称
  runtimeOpts: RuntimeOptions; // 运行时配置
  isSupported(node, lang): boolean; // 是否支持该文件
  onBlockLoad(args): Result; // 文件加载处理
  transformCode(raw, opts): string; // 代码转换
}
```

### 3. Runtime Options 配置

```typescript
interface IDumiTechStackRuntimeOpts {
  compilePath?: string; // 浏览器端编译器路径（Live Editing）
  rendererPath: string; // 组件渲染器路径
  preflightPath?: string; // 预检函数路径
  pluginPath?: string; // Vue 运行时插件路径
}
```

---

## TechStack 机制

### 注册流程

```typescript
// src/vue/techStack/index.ts
export default function registerTechStack(api: IApi) {
  // 1. 获取配置
  const vueConfig = api.userConfig?.vue;
  const pkgPath = getPkgPath('@dumijs/preset-vue', api.cwd);
  const libPath = join(pkgPath, '/lib');

  // 2. 生成运行时文件到 .dumi 目录
  api.onGenerateFiles(() => {
    api.writeTmpFile({
      path: COMPILE_FILENAME,
      content: fsExtra.readFileSync(join(libPath, COMPILE_FILENAME), 'utf8'),
    });
    api.writeTmpFile({
      path: RENDERER_FILENAME,
      content: fsExtra.readFileSync(join(libPath, RENDERER_FILENAME), 'utf8'),
    });
    api.writeTmpFile({
      path: PREFLIGHT_FILENAME,
      content: fsExtra.readFileSync(join(libPath, PREFLIGHT_FILENAME), 'utf8'),
    });
  });

  // 3. 配置运行时选项
  const runtimeOpts = {
    compilePath: getPluginPath(api, COMPILE_FILENAME), // 启用 Live Editing
    rendererPath: getPluginPath(api, RENDERER_FILENAME),
    preflightPath: getPluginPath(api, PREFLIGHT_FILENAME),
    pluginPath: join(libPath, 'runtimePlugin.mjs'),
  };

  // 4. 加载 Babel standalone（用于浏览器端编译）
  api.addHTMLHeadScripts(() => [
    {
      src: vueConfig?.compiler?.babelStandaloneCDN || BABEL_STANDALONE_CDN,
      async: true,
    },
  ]);

  // 5. 配置 Babel 为外部依赖
  api.modifyConfig((memo) => {
    memo.externals = {
      ...memo.externals,
      '@babel/standalone': 'Babel',
    };
    return memo;
  });

  // 6. 注册 Tech Stack（JSX 优先级更高）
  api.register({
    key: 'registerTechStack',
    stage: 0, // 优先级 0
    fn: () => VueJSXTechStack(runtimeOpts),
  });

  api.register({
    key: 'registerTechStack',
    stage: 1, // 优先级 1
    fn: () => VueSfcTechStack(runtimeOpts),
  });
}
```

### SFC Tech Stack 实现

```typescript
// src/vue/techStack/sfc.ts
export const VueSfcTechStack = (runtimeOpts: IDumiTechStackRuntimeOpts) =>
  defineTechStack({
    name: 'vue3-sfc',
    runtimeOpts,

    // 判断是否支持该文件类型
    isSupported(_, lang: string) {
      return ['vue'].includes(lang);
    },

    // 文件加载时的处理（构建时）
    onBlockLoad(args) {
      if (!args.path.endsWith('.vue')) return null;

      // 使用 Node.js 端编译器编译 SFC
      const result = compiler.compileSFC({
        id: args.path,
        code: args.entryPointCode,
        filename: args.filename,
      });

      return {
        type: 'tsx', // 告诉 dumi 输出类型
        content: Array.isArray(result) ? '' : result.js,
      };
    },

    // 代码转换（用于 code block）
    transformCode(raw, opts) {
      if (opts.type === 'code-block') {
        const filename = opts.fileAbsPath;
        const id = hashId(raw);

        // 编译代码
        const js = compile({ id, filename, code: raw });
        if (Array.isArray(js)) {
          logger.error(js);
          return '';
        }

        // 包装为 IIFE 函数
        const code = wrapDemoWithFn(js, {
          filename,
          parserConfig: { syntax: 'ecmascript' },
        });

        return `(${code})()`;
      }
      return raw;
    },
  });
```

### Stage 优先级机制

```
stage: 0  →  VueJSXTechStack (.jsx/.tsx)  ← 优先匹配
stage: 1  →  VueSfcTechStack (.vue)
stage: 2+ →  其他 Tech Stack
```

**为什么 JSX 优先级更高？**

- JSX/TSX 文件可能被 React Tech Stack 误匹配
- Vue JSX 需要特殊的 `@vue/babel-plugin-jsx` 处理
- 通过 stage 确保 Vue JSX 先被正确识别

---

## 编译器架构

### 编译器核心（createCompiler）

```typescript
// src/compiler/index.ts
export function createCompiler({
  babel,
  availablePlugins = {},
  availablePresets = {},
}: CreateCompilerContext) {
  // 1. ES Module 转 CommonJS
  function toCommonJS(es: string) {
    return babel.transformSync(es, {
      presets: [[availablePresets['env'] ?? 'env', { modules: 'cjs' }]],
    });
  }

  // 2. TypeScript/JSX 转换
  function transformTS(src, filename, options = {}) {
    const { lang, plugins = [], presets = [] } = options;

    // 处理 TypeScript
    if (lang === 'ts' || lang === 'tsx') {
      presets.push([
        availablePresets['typescript'] ?? 'typescript',
        { isTSX: lang === 'tsx', allExtensions: true, onlyRemoveTypeImports: true },
      ]);
    }

    // 处理 Vue JSX
    if (lang === 'tsx' || lang === 'jsx') {
      plugins.push(availablePlugins['vue-jsx'] ?? 'vue-jsx');
    }

    return babel.transformSync(src, { filename, presets, plugins })?.code || '';
  }

  // 3. 编译 SFC Script 部分
  function doCompileScript(id, descriptor, hasScoped, lang) {
    const { template, script, scriptSetup } = descriptor;

    // 使用 vue/compiler-sfc 的 compileScript
    if (script || scriptSetup) {
      const { content } = compileScript(descriptor, {
        id,
        inlineTemplate: !!scriptSetup, // <script setup> 内联模板
        templateOptions: {
          compilerOptions: { expressionPlugins },
        },
      });

      // 重写 export default 为变量赋值
      sfcCode = transformTS(rewriteDefault(content, COMP_IDENTIFIER, expressionPlugins), filename, {
        lang,
      });
    }

    // 非 setup 组件需要单独编译模板
    if (!hasSetup && templateContent) {
      const { code, errors } = compileTemplate({
        id,
        filename,
        source: templateContent,
        scoped: hasScoped,
      });

      sfcCode += `\n${code}`;
      sfcCode += `\n${COMP_IDENTIFIER}.render = render;`;
    }

    return sfcCode;
  }

  // 4. 编译 SFC Style 部分
  function doCompileStyle(id, descriptor) {
    for (const style of descriptor.styles) {
      const { code, errors } = compileStyle({
        source: style.content,
        filename,
        id,
        scoped: style.scoped,
      });
      styleList.push(code);
    }
    return styleList.join('\n');
  }

  // 5. 完整 SFC 编译流程
  function compileSFC(options: CompileOptions): CompileResult {
    // 解析 SFC
    const { descriptor, errors } = parse(code, { filename });

    // 编译 Script
    const scriptResult = doCompileScript(id, descriptor, hasScoped, scriptLang);

    // 编译 Style
    const styleResult = doCompileStyle(id, descriptor);

    // 添加 scopeId
    if (hasScoped) {
      js += `\n${COMP_IDENTIFIER}.__scopeId = "data-v-${id}";`;
    }

    return { js, css };
  }

  return { toCommonJS, transformTS, compileSFC };
}
```

### SFC 编译流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    Vue SFC 源码                              │
│  <template>...</template>                                   │
│  <script lang="ts">...</script>                             │
│  <style scoped>...</style>                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    parse() 解析                              │
│              返回 SFCDescriptor                              │
│  { template, script, scriptSetup, styles, customBlocks }   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ compileScript│ │compileTemplate│ │ compileStyle │
│              │ │              │ │              │
│ - TypeScript │ │ - 模板编译    │ │ - Scoped CSS │
│ - JSX        │ │ - render 函数 │ │ - CSS 变量   │
│ - setup 语法 │ │ - SSR 优化   │ │              │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    输出结果                                  │
│                                                             │
│  js: "const __sfc__ = {...}; __sfc__.render = render;      │
│       export default __sfc__;"                              │
│                                                             │
│  css: ".component[data-v-xxxx] { ... }"                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 运行时渲染

### Renderer 实现

```typescript
// src/vue/runtime/renderer.ts
import type { IDemoCancelableFn } from 'dumi/dist/client/theme-api';
import { createApp } from 'vue';

const renderer: IDemoCancelableFn = async function (canvas, component) {
  // 1. 注入 CSS
  if (component.__css__) {
    setTimeout(() => {
      // 移除旧样式
      document.querySelectorAll(`style[css-${component.__id__}]`).forEach((el) => el.remove());

      // 插入新样式
      document.head.insertAdjacentHTML(
        'beforeend',
        `<style css-${component.__id__}>${component.__css__}</style>`,
      );
    }, 1);
  }

  // 2. 创建 Vue 应用
  const app = createApp(component);

  // 3. 错误处理
  app.config.errorHandler = function (err) {
    // 抛出到 React 层处理
    throw err;
  };

  // 4. 挂载到 canvas
  app.mount(canvas);

  // 5. 返回清理函数
  return () => {
    app.unmount();
  };
};

export default renderer;
```

### 渲染流程

```
┌─────────────────────────────────────────────────────────────┐
│                   dumi Demo 容器                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    canvas (DOM)                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │              Vue App Instance                │    │   │
│  │  │                                              │    │   │
│  │  │  app.config.errorHandler → React Error      │    │   │
│  │  │  app.mount(canvas)                          │    │   │
│  │  │                                              │    │   │
│  │  │  ┌────────────────────────────────────┐     │    │   │
│  │  │  │       Compiled Component           │     │    │   │
│  │  │  │                                    │     │    │   │
│  │  │  │  __css__: ".scoped[data-v-xxx]"   │     │    │   │
│  │  │  │  __id__: "hash-id"                │     │    │   │
│  │  │  │  render: function() {...}         │     │    │   │
│  │  │  └────────────────────────────────────┘     │    │   │
│  │  │                                              │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                <head>                                │   │
│  │  <style css-hash-id>.scoped[data-v-xxx]{...}</style>│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Live Editing 实现

### 工作原理

```
用户修改代码
     │
     ▼
┌─────────────────────────────────────────┐
│         浏览器端 Compiler                 │
│                                          │
│  1. @babel/standalone 加载               │
│  2. 使用 Babel.transform() 编译          │
│  3. 输出 CommonJS 格式代码                │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│         dumi evalCommonJS               │
│                                          │
│  1. 创建沙箱环境                          │
│  2. 执行 CommonJS 代码                   │
│  3. 获取 module.exports                  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│         Renderer 重新渲染                │
│                                          │
│  1. 清理旧组件实例                        │
│  2. 注入新 CSS                           │
│  3. 创建新 Vue App                       │
│  4. 挂载到 canvas                        │
└─────────────────────────────────────────┘
```

### 浏览器端编译器

```typescript
// src/compiler/browser.ts
import type * as Babel from '@babel/standalone';
import jsx from '@vue/babel-plugin-jsx';

// Vue 3 JSX 插件

const { compileSFC, transformTS, toCommonJS } = createCompiler({
  babel: {
    transformSync(...args) {
      // @babel/standalone 使用 transform（非 transformSync）
      return Babel.transform(...args);
    },
  },
  availablePlugins: {
    'vue-jsx': jsx, // 关键：Vue JSX 插件在浏览器中可用
  },
});

export default function compile(code, { filename }) {
  const { lang } = resolveFilename(filename);

  // JSX/TSX 文件
  if (['js', 'jsx', 'ts', 'tsx'].includes(lang)) {
    return transformTS(code, filename, {
      lang,
      presets: [['env', { modules: 'cjs' }]], // 转为 CommonJS
    });
  }

  // SFC 文件
  const id = hashId(filename);
  const compiled = compileSFC({ id, filename, code });

  let { js, css } = compiled;

  // 附加 CSS 和 ID
  if (css) {
    js += `\n${COMP_IDENTIFIER}.__css__ = ${JSON.stringify(css)};`;
  }
  js += `\n${COMP_IDENTIFIER}.__id__ = "${id}";`;
  js += `\nexport default ${COMP_IDENTIFIER};`;

  // 转为 CommonJS
  return toCommonJS(js)?.code || '';
}
```

### 关键依赖

| 依赖                  | 用途                       | 环境   |
| --------------------- | -------------------------- | ------ |
| @babel/standalone     | 浏览器端 Babel             | 浏览器 |
| @vue/babel-plugin-jsx | Vue 3 JSX 转换             | 两端   |
| vue/compiler-sfc      | SFC 编译                   | 两端   |
| vue-template-compiler | Vue 2 模板编译（仅 Vue 2） | 两端   |

---

## 构建流程

### 双构建系统

```
┌─────────────────────────────────────────────────────────────┐
│                    源码 (src/)                               │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐
│   father 构建        │      │    tsup 构建        │
│                     │      │                     │
│   目标: Node.js     │      │   目标: 浏览器       │
│   输出: dist/       │      │   输出: lib/        │
│   格式: CJS/ESM     │      │   格式: ESM         │
│                     │      │                     │
│   包含:             │      │   包含:             │
│   - 插件入口        │      │   - compiler.mjs    │
│   - Tech Stack      │      │   - renderer.mjs    │
│   - Node 编译器     │      │   - preflight.mjs   │
│   - Webpack 配置    │      │   - runtimePlugin   │
└─────────────────────┘      └─────────────────────┘
```

### tsup 配置示例

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      compiler: 'src/compiler/browser.ts',
      renderer: 'src/vue/runtime/renderer.ts',
      preflight: 'src/vue/runtime/preflight.ts',
      runtimePlugin: 'src/vue/runtime/runtimePlugin.ts',
    },
    outDir: 'lib',
    format: ['esm'],
    dts: false,
    splitting: false,
    clean: true,
    external: ['vue', '@babel/standalone'],
    esbuildOptions(options) {
      options.alias = {
        '@': './src',
      };
    },
  },
]);
```

---

## 面试要点总结

### 1. 为什么需要 Tech Stack 机制？

- dumi 设计为框架无关的文档工具
- 通过 Tech Stack 抽象不同技术栈的差异
- 支持 React、Vue、Svelte 等多种框架共存

### 2. Live Editing 的技术挑战？

- 浏览器环境缺少 Node.js API
- @babel/standalone 与 Node.js Babel API 差异
- Vue SFC 需要 `vue/compiler-sfc` 在浏览器运行
- JSX 转换需要对应框架的 Babel 插件

### 3. 双端编译的设计考量？

- Node.js 端：完整编译能力，用于 SSR 和生产构建
- 浏览器端：受限但必要，用于 Live Editing
- 共享核心逻辑（createCompiler），差异化依赖注入

### 4. Stage 优先级的作用？

- 解决多 Tech Stack 的匹配冲突
- 数字越小优先级越高
- Vue JSX (stage 0) 优先于 Vue SFC (stage 1)

### 5. CSS Scoped 如何工作？

- 编译时为选择器添加 `[data-v-{id}]` 属性选择器
- 渲染时将 CSS 注入 `<head>` 并标记 `css-{id}`
- 组件卸载时清理对应样式
