# Dumi 集成机制

## 1. dumi 核心概念

在深入 preset-vue2 的集成细节之前，先了解 dumi 的几个核心概念：

### 1.1 Preset（预设）

Preset 是 dumi 的插件集合机制，用于打包一组相关的插件：

```typescript
// preset 结构
export default function myPreset() {
  return {
    plugins: [require.resolve('./plugin-a'), require.resolve('./plugin-b')],
  };
}
```

### 1.2 Tech Stack（技术栈）

Tech Stack 告诉 dumi 如何处理不同语言的代码块：

```typescript
interface IDumiTechStack {
  name: string;
  isSupported(node: any, lang: string): boolean;
  transformCode(opts: TransformOpts): string;
  generateSources?(opts: any): Source[];
  generateMetadata?(opts: any): Metadata;
}
```

### 1.3 Atom Parser（原子解析器）

Atom Parser 负责从源码中提取组件的 API 元数据：

```typescript
interface ILanguageMetaParser {
  parse(): Promise<IAtomAssetsParserResult>;
  patch(file: IPatchFile): void;
  destroy(): Promise<void>;
}
```

## 2. preset-vue2 的集成架构

```
┌─────────────────────────────────────────────────────────────┐
│                        dumi 核心                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │   Umi API   │   │   dumi API  │   │ Webpack API │        │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘        │
│         │                 │                 │               │
│         └────────────┬────┴────────────────┘               │
│                      │                                      │
│                      ▼                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 preset-vue2                          │   │
│  │                                                      │   │
│  │   ┌──────────────────────────────────────────────┐  │   │
│  │   │  api.registerTechStack('vue2', {...})        │  │   │
│  │   └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │   ┌──────────────────────────────────────────────┐  │   │
│  │   │  api.register({ key: 'atomParser', ... })    │  │   │
│  │   └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │   ┌──────────────────────────────────────────────┐  │   │
│  │   │  api.modifyWebpackConfig(config => {...})    │  │   │
│  │   └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 3. Tech Stack 集成

### 3.1 注册 Tech Stack

```typescript
// src/vue2/techStack/index.ts
import type { IApi } from 'dumi';

export default (api: IApi) => {
  // 注册 Vue 2 技术栈
  api.registerTechStack(() => ({
    name: 'vue2',

    // 判断代码块是否为 Vue 2
    isSupported(node, lang) {
      // .vue 文件
      if (lang === 'vue') return true;

      // JSX/TSX 需要进一步判断
      if (['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
        return isVue2JSX(node.value, api.userConfig.vue2?.jsxIncludes);
      }

      return false;
    },

    // 转换代码为可执行模块
    transformCode(opts) {
      const { code, lang, id } = opts;
      return generateDemoCode(code, lang, id);
    },

    // 生成源码文件
    generateSources(opts) {
      return [
        {
          filename: `${opts.id}.vue`,
          content: opts.code,
        },
      ];
    },

    // 生成元数据
    generateMetadata(opts) {
      return {
        techStack: 'vue2',
        componentName: extractComponentName(opts.code),
      };
    },
  }));
};
```

### 3.2 Vue 2 JSX 判断逻辑

```typescript
// 判断是否为 Vue 2 JSX
function isVue2JSX(code: string, jsxIncludes: any): boolean {
  // 1. 检查配置
  if (jsxIncludes === true) {
    // 全部匹配，需要代码分析
    return analyzeCodeForVue(code);
  }

  if (Array.isArray(jsxIncludes)) {
    // 路径匹配
    return jsxIncludes.some((pattern) => {
      if (typeof pattern === 'string') {
        return code.includes(pattern);
      }
      if (pattern instanceof RegExp) {
        return pattern.test(code);
      }
      return false;
    });
  }

  return false;
}

// 代码分析
function analyzeCodeForVue(code: string): boolean {
  // 检测 Vue 特征
  const vuePatterns = [
    /import\s+.*\s+from\s+['"]vue['"]/, // import from 'vue'
    /import\s+Vue\s+from/, // import Vue from
    /Vue\.extend/, // Vue.extend
    /defineComponent/, // defineComponent
    /export\s+default\s*\{[\s\S]*props\s*:/, // export default { props: }
  ];

  // 检测 React 特征
  const reactPatterns = [
    /import\s+.*\s+from\s+['"]react['"]/,
    /React\.(createElement|Component)/,
    /useState|useEffect|useCallback/,
  ];

  const hasVue = vuePatterns.some((p) => p.test(code));
  const hasReact = reactPatterns.some((p) => p.test(code));

  // 有 Vue 特征且无 React 特征
  return hasVue && !hasReact;
}
```

### 3.3 Demo 代码生成

```typescript
// 生成可在浏览器执行的 Demo 代码
function generateDemoCode(code: string, lang: string, id: string): string {
  if (lang === 'vue') {
    return generateSFCDemo(code, id);
  }
  return generateJSXDemo(code, id);
}

function generateSFCDemo(code: string, id: string): string {
  // 转换为可执行的模块代码
  return `
    import { defineComponent } from 'vue';
    import { compileVue2SFC } from '@dumijs/preset-vue2/runtime';

    const code = ${JSON.stringify(code)};
    const scopeId = 'data-v-${id}';

    export default compileVue2SFC(code, scopeId);
  `;
}

function generateJSXDemo(code: string, id: string): string {
  return `
    import { compileVue2JSX } from '@dumijs/preset-vue2/runtime';

    const code = ${JSON.stringify(code)};

    export default compileVue2JSX(code);
  `;
}
```

## 4. Atom Parser 集成

### 4.1 注册 Atom Parser

```typescript
// src/atomParser/index.ts
import type { IApi } from 'dumi';
import { BaseAtomAssetsParser } from 'dumi/dist/assetParsers/BaseParser';

export default (api: IApi) => {
  // 注册原子资产解析器
  api.register({
    key: 'atomParser',
    fn: () => ({
      name: 'vue2',

      // 创建解析器实例
      create(opts: any) {
        return new Vue2AtomAssetsParser({
          entryFile: opts.entryFile,
          resolveDir: opts.resolveDir,
          resolveFilter: opts.resolveFilter,
        });
      },

      // 匹配条件
      match: (filePath: string) => {
        return /\.(vue|tsx?|jsx?)$/.test(filePath);
      },
    }),
  });
};
```

### 4.2 Vue2AtomAssetsParser 实现

```typescript
export class Vue2AtomAssetsParser extends BaseAtomAssetsParser<Vue2MetaParser> {
  constructor(opts: Vue2MetaParserOptions) {
    const parser = new Vue2MetaParser(opts);

    super({
      entryFile: opts.entryFile,

      // 处理文件监听
      handleWatcher: (watcher, { parse, patch }) => {
        watcher.on('all', (event: string, filePath: string) => {
          // 过滤非组件文件
          if (
            /\.(vue|tsx?|jsx?)$/.test(filePath) &&
            !filePath.includes('node_modules') &&
            !filePath.endsWith('.d.ts')
          ) {
            patch({
              event: event as IPatchFile['event'],
              fileName: filePath,
            });
            parse(); // 触发重新解析
          }
        });
        return watcher;
      },

      parser,
      resolveDir: opts.resolveDir,

      watchOptions: {
        ignored: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
      },
    });
  }
}
```

### 4.3 Vue2MetaParser 实现

```typescript
export class Vue2MetaParser implements ILanguageMetaParser {
  private resolveDir: string;
  private cachedResult: IAtomAssetsParserResult | null = null;

  async parse(): Promise<IAtomAssetsParserResult> {
    const result: IAtomAssetsParserResult = {
      components: {},
      functions: {},
    };

    // 查找所有组件文件
    const patterns = ['**/*.vue', '**/index.tsx', '**/index.ts'];
    const files = await glob(patterns, {
      cwd: this.resolveDir,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });

    // 解析每个文件
    for (const filePath of files) {
      try {
        const doc = await parseVueComponent(filePath);
        const asset = transformComponentDoc(doc, filePath);
        result.components[asset.id] = asset;
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    this.cachedResult = result;
    return result;
  }

  patch(file: IPatchFile): void {
    // 文件变化时清除缓存
    this.cachedResult = null;
  }

  async destroy(): Promise<void> {
    this.cachedResult = null;
  }
}
```

## 5. Webpack 配置集成

### 5.1 修改 Webpack 配置

```typescript
// src/vue2/webpack/index.ts
import type { IApi } from 'dumi';
import { VueLoaderPlugin } from 'vue-loader';

export default (api: IApi) => {
  // 修改 Webpack 配置
  api.modifyWebpackConfig((config) => {
    // 添加 Vue Loader
    config.module.rules.push({
      test: /\.vue$/,
      loader: require.resolve('vue-loader'),
      options: {
        compilerOptions: {
          preserveWhitespace: false,
        },
      },
    });

    // 添加 JSX/TSX Babel 规则
    config.module.rules.push({
      test: /\.[jt]sx$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              [
                require.resolve('@vue/babel-preset-jsx'),
                {
                  injectH: true,
                  compositionAPI: true,
                },
              ],
            ],
          },
        },
      ],
    });

    // 添加 Vue Loader Plugin
    config.plugins.push(new VueLoaderPlugin());

    // 配置别名
    config.resolve.alias = {
      ...config.resolve.alias,
      vue$: 'vue/dist/vue.esm.js',
    };

    // 添加扩展名
    config.resolve.extensions = ['.vue', ...config.resolve.extensions];

    return config;
  });
};
```

### 5.2 添加运行时代码

```typescript
// src/vue2/webpack/index.ts (续)
export default (api: IApi) => {
  // 添加入口文件
  api.addEntryCode(
    () => `
    // 加载 Vue 2 运行时
    import '@dumijs/preset-vue2/lib/runtime.js';
  `,
  );

  // 添加 HTML 脚本
  api.addHTMLScripts(() => {
    const { compiler } = api.userConfig.vue2 || {};
    return [
      // Babel Standalone
      {
        src:
          compiler?.babelStandaloneCDN ||
          'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.22.17/babel.min.js',
      },
    ];
  });
};
```

## 6. 配置读取

### 6.1 用户配置定义

```typescript
// src/types.ts
export interface Vue2Config {
  // JSX 匹配规则
  jsxIncludes?: true | (string | RegExp)[];

  // 编译器 CDN
  compiler?: {
    babelStandaloneCDN?: string;
    lessCDN?: string;
    sassCDN?: string;
  };

  // 外部模块映射
  resolveMap?: string[];
}
```

### 6.2 配置注册

```typescript
// src/index.ts
import type { IApi } from 'dumi';

export default (api: IApi) => {
  // 注册配置 schema
  api.describe({
    key: 'vue2',
    config: {
      schema(joi) {
        return joi.object({
          jsxIncludes: joi
            .alternatives()
            .try(
              joi.boolean(),
              joi.array().items(joi.alternatives().try(joi.string(), joi.object())),
            ),
          compiler: joi.object({
            babelStandaloneCDN: joi.string(),
            lessCDN: joi.string(),
            sassCDN: joi.string(),
          }),
          resolveMap: joi.array().items(joi.string()),
        });
      },
      default: {
        jsxIncludes: true,
      },
    },
  });
};
```

### 6.3 配置使用

```typescript
// 在其他模块中读取配置
api.modifyWebpackConfig((config) => {
  const vue2Config = api.userConfig.vue2 || {};

  // 使用配置
  if (vue2Config.resolveMap) {
    // 添加外部模块别名
    vue2Config.resolveMap.forEach((module) => {
      config.resolve.alias[module] = require.resolve(module);
    });
  }

  return config;
});
```

## 7. 生命周期钩子

### 7.1 dumi 启动流程

```
1. 加载 .dumirc.ts
       ↓
2. 解析 presets 和 plugins
       ↓
3. 执行 preset-vue2
   ├─ registerTechStack('vue2')
   ├─ register({ key: 'atomParser' })
   └─ modifyWebpackConfig()
       ↓
4. Webpack 编译开始
       ↓
5. Atom Parser 解析组件
       ↓
6. 生成文档站点
```

### 7.2 关键钩子

| 钩子                  | 时机       | preset-vue2 用途  |
| --------------------- | ---------- | ----------------- |
| `onStart`             | 启动时     | 初始化配置        |
| `modifyWebpackConfig` | 编译前     | 添加 Vue 2 Loader |
| `addEntryCode`        | 编译时     | 注入运行时代码    |
| `addHTMLScripts`      | 生成 HTML  | 添加 CDN 脚本     |
| `onGenerateFiles`     | 文件生成时 | 生成临时文件      |

## 8. 与 dumi 组件的交互

### 8.1 API Table 渲染

dumi 的 `<API>` 组件会读取 Atom Parser 生成的元数据：

```tsx
// dumi 内部 API 组件（简化）
function API({ id, type }: { id: string; type: string }) {
  // 从 atomAssets 获取组件元数据
  const assets = useAtomAssets();
  const component = assets.components[id];

  if (!component) return <div>Component not found</div>;

  switch (type) {
    case 'props':
      return <PropsTable data={component.propsConfig} />;
    case 'events':
      return <EventsTable data={component.eventsConfig} />;
    case 'slots':
      return <SlotsTable data={component.slotsConfig} />;
    case 'imperative':
      return <MethodsTable data={component.imperativeConfig} />;
  }
}
```

### 8.2 Demo 渲染

dumi 的 Demo 渲染器会调用 Tech Stack 的 transformCode：

```tsx
// dumi 内部 Demo 组件（简化）
function Demo({ code, lang }: { code: string; lang: string }) {
  // 获取对应的 Tech Stack
  const techStack = useTechStack(lang);

  // 转换代码
  const Component = useMemo(() => {
    const transformedCode = techStack.transformCode({ code, lang });
    return evalCode(transformedCode);
  }, [code]);

  // 渲染组件
  return (
    <Previewer>
      <Component />
    </Previewer>
  );
}
```

## 9. 调试技巧

### 9.1 查看注册的 Tech Stack

```typescript
// 在 preset 中添加调试日志
api.registerTechStack(() => {
  console.log('[preset-vue2] Tech Stack registered');
  return { ... };
});
```

### 9.2 查看 Atom Parser 输出

```typescript
// 在解析后打印结果
async parse() {
  const result = await this._parse();
  console.log('[preset-vue2] Atom Parser result:', result);
  return result;
}
```

### 9.3 查看 Webpack 配置

```bash
# 导出 Webpack 配置
DEBUG=umi* dumi dev
```

---

下一篇：[技术难点与攻克](./06-CHALLENGES.md)
