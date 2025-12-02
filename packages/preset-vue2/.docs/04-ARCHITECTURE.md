# 架构设计

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           @dumijs/preset-vue2                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Preset     │───▶│  Tech Stack  │───▶│  Atom Parser │               │
│  │   (入口)     │    │  (编译处理)   │    │  (API 提取)  │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│         │                   │                   │                        │
│         ▼                   ▼                   ▼                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      dumi 核心                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Node.js 侧 (构建时)           │  浏览器侧 (运行时)                       │
├────────────────────────────────┼────────────────────────────────────────┤
│  ┌────────────────────────┐    │    ┌────────────────────────┐          │
│  │  Compiler (Node)       │    │    │  Compiler (Browser)    │          │
│  │  ├─ SFC Compiler       │    │    │  ├─ SFC Parser         │          │
│  │  ├─ JSX Transformer    │    │    │  ├─ Babel Standalone   │          │
│  │  └─ Style Processor    │    │    │  └─ Style Compiler     │          │
│  └────────────────────────┘    │    └────────────────────────┘          │
│                                │                                         │
│  ┌────────────────────────┐    │    ┌────────────────────────┐          │
│  │  Webpack Config        │    │    │  Runtime Renderer      │          │
│  │  ├─ Vue 2 Loader       │    │    │  ├─ Component Mount    │          │
│  │  └─ Babel Config       │    │    │  ├─ Error Boundary     │          │
│  └────────────────────────┘    │    │  └─ HMR Handler        │          │
│                                │    └────────────────────────┘          │
└────────────────────────────────┴────────────────────────────────────────┘
```

## 2. 目录结构

```
packages/preset-vue2/
├── src/
│   ├── index.ts                 # Preset 入口
│   │
│   ├── atomParser/              # API 自动提取模块
│   │   ├── index.ts             # Vue2MetaParser 类
│   │   ├── transformer.ts       # 组件文档转换器
│   │   └── types.ts             # 类型定义
│   │
│   ├── compiler/                # 编译器模块
│   │   ├── browser.ts           # 浏览器端 SFC/JSX 编译
│   │   ├── node.ts              # Node.js 端编译辅助
│   │   └── shared.ts            # 共享工具函数
│   │
│   └── vue2/                    # Vue 2 集成模块
│       ├── techStack/           # dumi Tech Stack 实现
│       │   ├── index.ts         # Tech Stack 注册
│       │   ├── babelConfig.ts   # Babel 配置
│       │   └── generator.ts     # Demo 代码生成
│       │
│       ├── webpack/             # Webpack 配置
│       │   ├── index.ts         # 配置合并
│       │   └── rules.ts         # Loader 规则
│       │
│       └── runtime/             # 浏览器运行时
│           ├── index.ts         # 运行时入口
│           ├── renderer.ts      # 组件渲染器
│           ├── compiler.ts      # 运行时编译
│           └── styles.ts        # 样式处理
│
├── compiled/                    # 预编译依赖 (减少安装体积)
│   └── vue2-jsx-plugin.js       # Babel JSX 插件
│
├── dist/                        # Node.js 构建产物
│   ├── index.js                 # ESM 入口
│   └── index.cjs                # CJS 入口
│
├── lib/                         # 浏览器构建产物
│   ├── runtime.js               # UMD 运行时
│   └── compiler.js              # UMD 编译器
│
└── package.json
```

## 3. 模块设计

### 3.1 Preset 模块 (`src/index.ts`)

**职责**：作为 dumi preset 的入口，注册 Vue 2 相关能力

```typescript
import type { IApi } from 'dumi';

export default function presetVue2() {
  return {
    plugins: [
      // 注册 Tech Stack
      require.resolve('./vue2/techStack'),
      // 注册 Atom Parser
      require.resolve('./atomParser'),
      // 配置 Webpack
      require.resolve('./vue2/webpack'),
    ],
  };
}
```

**设计要点**：

- 遵循 dumi preset 规范
- 模块化拆分，职责单一
- 支持按需加载

### 3.2 Tech Stack 模块 (`src/vue2/techStack/`)

**职责**：告诉 dumi 如何处理 Vue 2 文件

```typescript
// Tech Stack 接口
interface IDumiTechStack {
  name: string; // 技术栈名称
  isSupported(node: any, lang: string): boolean; // 判断是否支持
  transformCode(opts: TransformOpts): string; // 代码转换
  generateSources?(opts: any): Source[]; // 生成源码
  generateMetadata?(opts: any): Metadata; // 生成元数据
}
```

**实现**：

```typescript
export const vue2TechStack: IDumiTechStack = {
  name: 'vue2',

  // 判断代码块是否为 Vue 2
  isSupported(node, lang) {
    if (lang === 'vue') return true;
    if (['tsx', 'jsx'].includes(lang)) {
      return isVueJSX(node.value); // 检测是否为 Vue JSX
    }
    return false;
  },

  // 转换 Demo 代码
  transformCode({ code, lang, id }) {
    if (lang === 'vue') {
      return transformSFC(code, id);
    }
    return transformJSX(code, id);
  },
};
```

### 3.3 Atom Parser 模块 (`src/atomParser/`)

**职责**：从 Vue 2 组件源码提取 API 元数据

```typescript
// 解析器接口
interface ILanguageMetaParser {
  parse(): Promise<IAtomAssetsParserResult>;
  patch(file: IPatchFile): void;
  destroy(): Promise<void>;
}

// 解析结果
interface IAtomAssetsParserResult {
  components: Record<string, AtomComponentAsset>;
  functions: Record<string, AtomFunctionAsset>;
}
```

**实现流程**：

```
组件源码 (.vue / .tsx)
        ↓
  vue-docgen-api 解析
        ↓
  ComponentDoc 对象
        ↓
  transformer 转换
        ↓
  AtomComponentAsset (dumi 格式)
```

**Transformer 核心逻辑**：

```typescript
export function transformComponentDoc(doc: ComponentDoc, filePath: string): AtomComponentAsset {
  return {
    id: doc.displayName || path.basename(filePath),
    type: 'COMPONENT',
    propsConfig: transformProps(doc.props),
    eventsConfig: transformEvents(doc.events),
    slotsConfig: transformSlots(doc.slots),
    imperativeConfig: transformMethods(doc.methods),
  };
}
```

### 3.4 Compiler 模块 (`src/compiler/`)

**职责**：编译 Vue 2 SFC 和 JSX/TSX

#### Node.js 编译器

```typescript
// node.ts
export async function compileSFC(code: string, filename: string) {
  const { parse } = require('@vue/component-compiler-utils');
  const descriptor = parse({ source: code, filename });

  // 编译 template
  const template = compileTemplate(descriptor.template);

  // 编译 script
  const script = compileScript(descriptor.script);

  // 编译 styles
  const styles = await compileStyles(descriptor.styles);

  return { template, script, styles };
}
```

#### 浏览器编译器

```typescript
// browser.ts
export async function compileInBrowser(code: string, type: 'sfc' | 'jsx', options: CompileOptions) {
  // 加载外部依赖
  await loadBabelStandalone();

  if (type === 'sfc') {
    return compileSFCInBrowser(code, options);
  }
  return compileJSXInBrowser(code, options);
}

async function compileSFCInBrowser(code: string, options: CompileOptions) {
  // 1. 解析 SFC
  const { template, script, styles } = parseSFC(code);

  // 2. 编译模板为 render 函数
  const render = compileTemplate(template);

  // 3. 编译脚本
  const compiledScript = await Babel.transform(script, {
    presets: [['vue2-jsx', { injectH: true }]],
  });

  // 4. 编译样式
  const compiledStyles = await compileStyles(styles, options.scopeId);

  // 5. 合并为组件对象
  return mergeComponent(render, compiledScript, compiledStyles);
}
```

### 3.5 Runtime 模块 (`src/vue2/runtime/`)

**职责**：在浏览器中渲染 Vue 2 组件

```typescript
// renderer.ts
export class Vue2Renderer {
  private container: HTMLElement;
  private vueInstance: Vue | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // 渲染组件
  render(Component: ComponentOptions) {
    // 销毁旧实例
    this.destroy();

    // 创建新实例
    this.vueInstance = new Vue({
      render: (h) => h(Component),
    }).$mount();

    // 挂载到容器
    this.container.appendChild(this.vueInstance.$el);
  }

  // 销毁组件
  destroy() {
    if (this.vueInstance) {
      this.vueInstance.$destroy();
      this.vueInstance = null;
    }
  }

  // 热更新
  hotReload(Component: ComponentOptions) {
    this.render(Component);
  }
}
```

### 3.6 Webpack 配置模块 (`src/vue2/webpack/`)

**职责**：配置 Webpack 以支持 Vue 2 编译

```typescript
// index.ts
export function getWebpackConfig(api: IApi) {
  return {
    module: {
      rules: [
        // Vue SFC
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        // JSX/TSX
        {
          test: /\.[jt]sx$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@vue/babel-preset-jsx'],
              },
            },
          ],
        },
      ],
    },
    resolve: {
      alias: {
        vue$: 'vue/dist/vue.esm.js',
      },
      extensions: ['.vue', '.tsx', '.jsx'],
    },
    plugins: [new VueLoaderPlugin()],
  };
}
```

## 4. 数据流

### 4.1 构建时数据流

```
用户组件源码
      │
      ▼
┌─────────────────┐
│  Webpack 编译   │
│  (vue-loader)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  JS Bundle      │────▶│  浏览器加载      │
└─────────────────┘     └─────────────────┘

同时：

┌─────────────────┐
│  Atom Parser    │
│  (vue-docgen)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  API 元数据      │────▶│  API Table 渲染  │
└─────────────────┘     └─────────────────┘
```

### 4.2 Live Editing 数据流

```
用户编辑代码
      │
      ▼
┌─────────────────┐
│  编辑器 onChange │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  浏览器编译器    │────▶│  LRU 缓存检查    │
│  (Babel + SFC)  │     └────────┬────────┘
└────────┬────────┘              │
         │                       │ 命中
         │ 未命中                 ▼
         │              ┌─────────────────┐
         ▼              │  返回缓存结果    │
┌─────────────────┐     └─────────────────┘
│  编译并缓存      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Runtime 渲染   │
│  (Vue 实例)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DOM 更新       │
└─────────────────┘
```

## 5. 错误处理

### 5.1 错误分类

| 类型       | 触发场景         | 处理方式            |
| ---------- | ---------------- | ------------------- |
| 编译错误   | SFC/JSX 语法错误 | 显示友好错误组件    |
| 运行时错误 | 组件执行报错     | Error Boundary 捕获 |
| 加载错误   | CDN 资源加载失败 | 重试 + 降级提示     |

### 5.2 错误组件

```typescript
export function createErrorComponent(error: CompileError) {
  return {
    name: 'CompileError',
    render(h) {
      return h('div', { class: 'compile-error' }, [
        h('h3', '编译错误 / Compile Error'),
        h('pre', error.message),
        h('p', `位置: 第 ${error.line} 行, 第 ${error.column} 列`),
      ]);
    },
  };
}
```

## 6. 扩展点设计

### 6.1 配置扩展

```typescript
// .dumirc.ts
export default {
  vue2: {
    // JSX 路径匹配
    jsxIncludes: ['/components/', /vue2/],

    // 编译器 CDN
    compiler: {
      babelStandaloneCDN: 'https://custom-cdn/babel.js',
      lessCDN: 'https://custom-cdn/less.js',
    },

    // 外部模块
    resolveMap: ['element-ui', 'lodash'],
  },
};
```

### 6.2 API 解析扩展（预留）

```typescript
// 未来支持自定义解析器
vue2: {
  atomParser: {
    // 自定义 script handler
    addScriptHandlers: [myCustomHandler],
    // 扩展类型别名
    alias: { '@': './src' },
  },
};
```

## 7. 性能优化

### 7.1 编译优化

- **LRU 缓存**：缓存编译结果，避免重复编译
- **增量更新**：文件变化时只重新编译变化部分
- **异步加载**：CDN 资源按需加载

### 7.2 运行时优化

- **组件复用**：相同配置的组件复用实例
- **样式去重**：相同 scopeId 的样式只插入一次
- **懒加载**：Demo 进入视口时才编译

---

下一篇：[Dumi 集成机制](./05-DUMI_INTEGRATION.md)
