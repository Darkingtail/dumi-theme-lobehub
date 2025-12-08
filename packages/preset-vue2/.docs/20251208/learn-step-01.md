preset-vue2 核心架构

┌─────────────────────────────────────────────────────────────────┐
│ dumi 框架 │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│ │ Preset │ │ Tech Stack │ │ Atom Parser │ │
│ │ (入口插件) │──▶│ (运行时渲染) │ │ (API 元数据提取) │ │
│ └──────────────┘ └──────────────┘ └──────────────────────┘ │
│ │ │ │ │
│ ▼ ▼ ▼ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│ │ Webpack │ │ Compiler │ │ vue-docgen-api │ │
│ │ Config │ │ (编译器) │ │ (解析 Vue 组件) │ │
│ └──────────────┘ └──────────────┘ └──────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────┘

让我逐一讲解核心模块：

⏺ Read(packages/preset-vue2/src/index.ts)
⎿  Read 32 lines

⏺ Read(packages/preset-vue2/src/vue2/index.ts)
⎿  Read 57 lines

⏺ 一、整体架构

preset-vue2 由 4 个核心模块组成：

src/
├── index.ts # Preset 入口（注册插件）
├── vue2/
│ ├── index.ts # 主插件（组装各模块）
│ ├── techStack/ # Tech Stack（运行时渲染）
│ │ ├── sfc.ts # Vue SFC 处理
│ │ └── jsx.ts # Vue JSX/TSX 处理
│ ├── webpack/ # Webpack 配置
│ └── runtime/ # 浏览器端运行时
├── compiler/ # 编译器
│ ├── node.ts # Node.js 端编译
│ └── browser.ts # 浏览器端编译
└── atomParser/ # API 元数据提取
├── index.ts # 解析器入口
└── transformer.ts # 数据转换

---

二、核心机制：Tech Stack

Tech Stack 是 dumi 的核心抽象，它定义了如何处理特定技术栈的代码：

// src/vue2/techStack/sfc.ts
export const Vue2SfcTechStack = () => defineTechStack({
name: 'vue2-sfc',

    // 1️⃣ 判断是否支持该文件
    isSupported(node, lang) {
      return lang === 'vue';  // 只处理 .vue 文件
    },

    // 2️⃣ 构建时：将 Vue 代码编译为 JS
    transformCode(raw, opts) {
      // 调用 Node.js 端编译器
      const js = compile({ code: raw, filename, id });
      // 包装成可执行函数
      return wrapDemoWithFn(js, { ... });
    },

    // 3️⃣ 运行时配置：告诉浏览器如何渲染
    runtimeOpts: {
      compilePath: '/path/to/compiler.mjs',   // 浏览器端编译器
      rendererPath: '/path/to/renderer.mjs',  // Vue 渲染器
    },

});

数据流：

┌─────────────┐ ┌──────────────┐ ┌─────────────┐
│ .vue 文件 │────▶│ isSupported │────▶│ Vue2 Stack │
└─────────────┘ │ 判断是否处理 │ │ 处理 │
└──────────────┘ └─────────────┘
│
┌──────▼──────┐
│ React Stack │
│ (默认) │
└─────────────┘

---

三、编译流程

3.1 SFC 编译 (Node.js 端)

⏺ Read(packages/preset-vue2/src/compiler/node.ts)
⎿  Read 80 lines

⏺ SFC 编译流程：

┌─────────────────────────────────────────────────────────────────────┐
│ Vue SFC 编译流程 │
├─────────────────────────────────────────────────────────────────────┤
│ │
│ <template>...</template> ──▶ render 函数 │
│ <script>...</script> ──▶ 组件选项对象 │
│ <style scoped>...</style> ──▶ CSS + scopeId │
│ │
│ ┌─────────────┐ ┌───────────────┐ ┌─────────────────┐ │
│ │ @vue/ │ │ Babel │ │ 输出 JS 代码 │ │
│ │ compiler- │───▶│ Transform │───▶│ │ │
│ │ utils │ │ (TS → JS) │ │ + CSS 字符串 │ │
│ └─────────────┘ └───────────────┘ └─────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────────┘

关键代码解析：

// compiler/index.ts - createCompiler
export function createCompiler(config) {
return {
// 编译 SFC
compileSFC(options) {
const { code, filename, id } = options;

        // 1. 解析 SFC 结构
        const descriptor = parseComponent(code);  // @vue/compiler-utils

        // 2. 编译 <template> → render 函数
        const template = compileTemplate({
          source: descriptor.template.content,
          compiler: require('vue-template-compiler'),
        });

        // 3. 编译 <script> → JS
        const script = babel.transform(descriptor.script.content, {
          presets: ['typescript', 'vue2-jsx'],
        });

        // 4. 处理 <style scoped>
        const styles = descriptor.styles.map(style =>
          compileStyle({ source: style.content, scoped: style.scoped, id })
        );

        return { js: ..., css: ... };
      },

      // 转换 JSX/TSX
      transformTS(code, filename, options) {
        return babel.transform(code, {
          presets: ['typescript', 'vue2-jsx'],
        });
      },
    };

}

---

四、Live Editing 实现（浏览器端编译）

这是最复杂的部分。当用户在文档页面编辑代码时，需要在浏览器中实时编译 Vue 代码：

⏺ Read(packages/preset-vue2/src/vue2/runtime/renderer.ts)
⎿  Read 65 lines

⏺ Live Editing 完整流程：

┌─────────────────────────────────────────────────────────────────────────┐
│ Live Editing 工作流程 │
├─────────────────────────────────────────────────────────────────────────┤
│ │
│ 用户编辑代码 ──▶ compiler.mjs ──▶ renderer.mjs ──▶ 页面更新 │
│ │ │ │ │
│ │ 浏览器端编译 Vue 渲染器 │
│ │ │ │ │
│ ▼ ▼ ▼ │
│ ┌─────────┐ ┌───────────────┐ ┌─────────────────┐ │
│ │ 源代码 │ │ Babel │ │ new Vue({ │ │
│ │ (.vue) │──▶│ Standalone │──▶│ render: h => │ │
│ │ │ │ + vue- │ │ h(component) │ │
│ │ │ │ template- │ │ }).$mount() │ │
│ │ │ │ compiler │ └─────────────────┘ │
│ └─────────┘ └───────────────┘ │
│ │
│ ❗ 核心挑战：在浏览器中运行 Vue 编译器（无 Node.js 环境） │
│ │
│ 解决方案： │
│ 1. Babel Standalone (CDN) - 浏览器端 Babel 转换 │
│ 2. vue-template-compiler (bundle) - 模板编译 │
│ 3. less.js / sass.js (CDN) - 样式预处理 │
│ │
└─────────────────────────────────────────────────────────────────────────┘

浏览器端编译器核心代码：

// compiler/browser.ts (简化版)
export async function compile(source: string, filename: string) {
// 1. 解析 SFC 结构
const { template, script, styles } = parseSFC(source);

    // 2. 编译模板 → render 函数
    const { render, staticRenderFns } = VueTemplateCompiler.compile(template);

    // 3. 使用 Babel Standalone 转换 TypeScript/JSX
    const js = window.Babel.transform(script, {
      presets: ['typescript'],
      plugins: ['vue-jsx'],
    }).code;

    // 4. 编译样式（LESS/SCSS）
    let css = '';
    for (const style of styles) {
      if (style.lang === 'less') {
        css += await window.less.render(style.content);
      } else if (style.lang === 'scss') {
        css += await Sass.compile(style.content);
      }

      // 处理 scoped
      if (style.scoped) {
        css = scopeCSS(css, scopeId);
      }
    }

    // 5. 组装组件对象
    return {
      ...evalScript(js),
      render,
      staticRenderFns,
      __css__: css,
      __id__: scopeId,
    };

}

---

五、API 提取（Atom Parser）

用于生成 <API> 组件所需的 Props/Events/Slots 文档：

// atomParser/index.ts
export class Vue2MetaParser {
async parse() {
// 1. 查找所有 Vue 组件文件
const files = glob(['**/*.vue', '**/index.tsx'], { cwd: resolveDir });

      // 2. 使用 vue-docgen-api 解析每个组件
      for (const file of files) {
        const doc = await parseVueComponent(file);
        //    ↑ vue-docgen-api
        //    解析出 { props, events, slots, methods, ... }

        // 3. 转换为 dumi 格式
        const asset = transformComponentDoc(doc, file);

        result.components[asset.id] = asset;
      }

      return result;
    }

}

vue-docgen-api 解析示例：

// 输入: Button.vue
export default Vue.extend({
props: {
/** 按钮类型 \*/
type: {
type: String as PropType<'primary' | 'default'>,
default: 'default',
},
},
methods: {
/** @public 聚焦按钮 \*/
focus() { ... }
}
});

// vue-docgen-api 输出:
{
displayName: 'Button',
props: [{
name: 'type',
type: { name: 'string' },
defaultValue: { value: "'default'" },
description: '按钮类型',
}],
methods: [{
name: 'focus',
description: '聚焦按钮',
modifiers: ['public'],
}],
}

// 转换后 (dumi 格式):
{
id: 'Button',
propsConfig: {
type: { type: 'string', default: "'default'", description: '按钮类型' }
},
imperative: {
focus: { description: '聚焦按钮' }
}
}

---

六、核心技术难点总结

| 难点          | 解决方案                                        |
| ------------- | ----------------------------------------------- |
| JSX/TSX 区分  | 路径匹配 + 代码特征分析（React hooks 检测）     |
|               |
| 浏览器端编译  | Babel Standalone + vue-template-compiler bundle |
| Scoped Styles | 生成 scopeId，在选择器前添加属性选择器          |
|               |
| PropType 提取 | 自研 TypeScript AST 解析，从泛型参数提取类型    |
|               |
| 绝对/相对路径 | 使用 path.relative(cwd, filePath) 转换后匹配    |

---
