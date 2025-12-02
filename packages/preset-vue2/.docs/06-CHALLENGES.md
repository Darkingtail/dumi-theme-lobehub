# 技术难点与攻克

## 1. 难点概览

| 难点                           | 难度  | 描述                             |
| ------------------------------ | ----- | -------------------------------- |
| JSX/TSX 与 React 区分          | ★★★★☆ | 同一项目中 React 和 Vue JSX 共存 |
| PropType<T> 泛型提取           | ★★★★★ | vue-docgen-api 不支持泛型        |
| 浏览器端 SFC 编译              | ★★★★☆ | Node.js 工具无法在浏览器运行     |
| Scoped Styles 实现             | ★★★☆☆ | 浏览器端实现样式隔离             |
| Composition API setup 返回函数 | ★★★☆☆ | TSX 中 setup 返回渲染函数的处理  |
| HMR 增量更新                   | ★★★☆☆ | 组件变化时保持状态               |

## 2. 难点一：JSX/TSX 与 React 区分

### 2.1 问题描述

dumi 是基于 React 的文档框架，默认将 JSX 按 React 处理。当项目同时包含 React 代码（如 dumi 主题）和 Vue 2 组件时，需要准确区分：

```
项目结构:
├── .dumi/                 # React JSX (dumi 主题)
│   └── theme/
│       └── Layout.tsx     # React 组件
├── src/
│   └── components/
│       └── Button.tsx     # Vue 2 JSX 组件
└── docs/
    └── demo.tsx           # Vue 2 Demo
```

### 2.2 错误区分的后果

如果将 Vue 2 JSX 按 React 处理：

```tsx
// Vue 2 JSX
export default {
  render() {
    return <div on={{ click: this.handleClick }}>Click me</div>;
  },
};

// 错误地用 React Babel 编译后
React.createElement('div', { on: { click: this.handleClick } }, 'Click me');
// on 属性被当作普通 props，事件绑定失效
```

### 2.3 解决方案

**多层次判断策略**：

```typescript
function isVue2JSX(code: string, filePath: string, config: Vue2Config): boolean {
  // 1. 路径匹配（优先级最高）
  if (config.jsxIncludes) {
    if (config.jsxIncludes === true) {
      // 全部需要代码分析
    } else if (matchPath(filePath, config.jsxIncludes)) {
      return true;
    }
  }

  // 2. 排除 dumi 内部文件
  if (filePath.includes('.dumi/') || filePath.includes('node_modules')) {
    return false;
  }

  // 3. 代码特征分析
  return analyzeVueFeatures(code);
}

function analyzeVueFeatures(code: string): boolean {
  const score = {
    vue: 0,
    react: 0,
  };

  // Vue 特征
  if (/import\s+.*from\s+['"]vue['"]/.test(code)) score.vue += 10;
  if (/Vue\.extend/.test(code)) score.vue += 10;
  if (/defineComponent/.test(code)) score.vue += 5;
  if (/export\s+default\s*\{[\s\S]*?props\s*:/.test(code)) score.vue += 5;
  if (/on\s*=\s*\{\s*\{/.test(code)) score.vue += 3; // on={{ }}
  if (/\$emit/.test(code)) score.vue += 3;

  // React 特征
  if (/import\s+.*from\s+['"]react['"]/.test(code)) score.react += 10;
  if (/React\.(createElement|Component|FC)/.test(code)) score.react += 10;
  if (/useState|useEffect|useCallback|useMemo/.test(code)) score.react += 5;
  if (/onClick\s*=\s*\{/.test(code)) score.react += 3;

  return score.vue > score.react;
}
```

### 2.4 配置示例

```typescript
// .dumirc.ts
export default {
  vue2: {
    // 方式一：指定路径
    jsxIncludes: ['/src/components/', '/docs/'],

    // 方式二：正则匹配
    jsxIncludes: [/\/vue2?-/, /\.vue\.tsx$/],

    // 方式三：全部分析（默认）
    jsxIncludes: true,
  },
};
```

## 3. 难点二：PropType<T> 泛型提取

### 3.1 问题描述

vue-docgen-api 可以解析 Vue 2 组件的 props，但对 TypeScript 的 `PropType<T>` 泛型支持有限：

```typescript
// 组件定义
props: {
  user: {
    type: Object as PropType<User>,
    required: true,
  },
  items: {
    type: Array as PropType<Item[]>,
  },
  onChange: {
    type: Function as PropType<(value: string) => void>,
  },
}

// vue-docgen-api 输出
{
  user: { type: { name: 'object' } },       // 丢失 User 类型
  items: { type: { name: 'array' } },       // 丢失 Item[] 类型
  onChange: { type: { name: 'func' } },     // 丢失函数签名
}
```

### 3.2 解决方案

**自研 TypeScript AST 解析增强**：

```typescript
import * as ts from 'typescript';

function extractPropTypeGeneric(sourceCode: string, propName: string): TypeInfo | null {
  const sourceFile = ts.createSourceFile('temp.ts', sourceCode, ts.ScriptTarget.Latest, true);

  let result: TypeInfo | null = null;

  // 遍历 AST 查找 PropType<T>
  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText();
      if (name === propName) {
        // 查找 type 属性
        const typeProperty = findTypeProperty(node);
        if (typeProperty) {
          result = extractGenericType(typeProperty);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

function extractGenericType(node: ts.Node): TypeInfo {
  // 查找 as PropType<T> 模式
  if (ts.isAsExpression(node)) {
    const typeRef = node.type;
    if (ts.isTypeReferenceNode(typeRef)) {
      const typeName = typeRef.typeName.getText();
      if (typeName === 'PropType' && typeRef.typeArguments) {
        const genericArg = typeRef.typeArguments[0];
        return parseTypeNode(genericArg);
      }
    }
  }
  return { type: 'unknown' };
}

function parseTypeNode(node: ts.TypeNode): TypeInfo {
  // 引用类型: PropType<User>
  if (ts.isTypeReferenceNode(node)) {
    return {
      type: 'reference',
      name: node.typeName.getText(),
    };
  }

  // 数组类型: PropType<User[]>
  if (ts.isArrayTypeNode(node)) {
    return {
      type: 'array',
      items: parseTypeNode(node.elementType),
    };
  }

  // 函数类型: PropType<(value: string) => void>
  if (ts.isFunctionTypeNode(node)) {
    return {
      type: 'function',
      signature: {
        params: node.parameters.map((p) => ({
          name: p.name.getText(),
          type: p.type ? parseTypeNode(p.type) : { type: 'any' },
        })),
        returns: node.type ? parseTypeNode(node.type) : { type: 'void' },
      },
    };
  }

  // 联合类型: PropType<'a' | 'b' | 'c'>
  if (ts.isUnionTypeNode(node)) {
    return {
      type: 'union',
      types: node.types.map(parseTypeNode),
    };
  }

  // 字面量类型
  if (ts.isLiteralTypeNode(node)) {
    return {
      type: 'literal',
      value: node.literal.getText(),
    };
  }

  return { type: node.getText() };
}
```

### 3.3 类型显示优化

```typescript
// 将 TypeInfo 转换为用户友好的显示
function formatTypeForDisplay(typeInfo: TypeInfo): string {
  switch (typeInfo.type) {
    case 'reference':
      return typeInfo.name; // User

    case 'array':
      return `${formatTypeForDisplay(typeInfo.items)}[]`; // User[]

    case 'function':
      const params = typeInfo.signature.params
        .map((p) => `${p.name}: ${formatTypeForDisplay(p.type)}`)
        .join(', ');
      const returns = formatTypeForDisplay(typeInfo.signature.returns);
      return `(${params}) => ${returns}`; // (value: string) => void

    case 'union':
      return typeInfo.types.map(formatTypeForDisplay).join(' | '); // 'a' | 'b'

    case 'literal':
      return typeInfo.value;

    default:
      return typeInfo.type;
  }
}
```

## 4. 难点三：浏览器端 SFC 编译

### 4.1 问题描述

Vue 2 的 SFC 编译工具（vue-template-compiler）是 Node.js 包，无法在浏览器中直接使用。Live Editing 需要在浏览器中实时编译 `.vue` 代码。

### 4.2 解决方案

**自研浏览器端 SFC 编译器**：

```typescript
// SFC 解析器
interface SFCDescriptor {
  template: string | null;
  script: string | null;
  styles: Array<{
    content: string;
    lang: string;
    scoped: boolean;
  }>;
}

function parseSFC(source: string): SFCDescriptor {
  const descriptor: SFCDescriptor = {
    template: null,
    script: null,
    styles: [],
  };

  // 使用正则提取各个块
  const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (templateMatch) {
    descriptor.template = templateMatch[1].trim();
  }

  const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    descriptor.script = scriptMatch[1].trim();
  }

  const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/g;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(source)) !== null) {
    const attrs = styleMatch[1];
    descriptor.styles.push({
      content: styleMatch[2].trim(),
      lang: extractLang(attrs),
      scoped: attrs.includes('scoped'),
    });
  }

  return descriptor;
}

function extractLang(attrs: string): string {
  const langMatch = attrs.match(/lang=["'](\w+)["']/);
  return langMatch ? langMatch[1] : 'css';
}
```

### 4.3 模板编译

```typescript
// 简化版模板编译器（实际使用 vue-template-compiler 的浏览器版本）
function compileTemplate(template: string): string {
  // 使用 vue-template-compiler 的编译输出格式
  // 这里使用预编译的 render 函数字符串

  // 处理插值
  let code = template.replace(/\{\{(.*?)\}\}/g, '"+($1)+"');

  // 处理指令（简化处理）
  code = processDirectives(code);

  return `function render() {
    with(this) {
      return _c('div', [${code}])
    }
  }`;
}

// 实际实现中，我们使用了 vue-template-compiler 的在线编译 API
// 或者将其打包为浏览器可用的版本
```

### 4.4 脚本编译

```typescript
async function compileScript(script: string, options: CompileOptions): Promise<string> {
  // 确保 Babel Standalone 已加载
  await ensureBabelLoaded();

  // 提取 export default
  const exportMatch = script.match(/export\s+default\s+(\{[\s\S]*\}|\w+)/);
  if (!exportMatch) {
    throw new Error('No default export found');
  }

  // 使用 Babel 转换
  const result = window.Babel.transform(script, {
    presets: [['env', { modules: false }], 'typescript'],
    plugins: [['transform-vue-jsx', { injectH: false }]],
  });

  return result.code;
}
```

### 4.5 样式编译

```typescript
async function compileStyles(styles: SFCDescriptor['styles'], scopeId: string): Promise<string> {
  const compiledStyles: string[] = [];

  for (const style of styles) {
    let css = style.content;

    // 预处理器编译
    if (style.lang === 'less') {
      css = await compileLess(css);
    } else if (style.lang === 'scss' || style.lang === 'sass') {
      css = await compileScss(css);
    }

    // Scoped 处理
    if (style.scoped) {
      css = scopeCSS(css, scopeId);
    }

    compiledStyles.push(css);
  }

  return compiledStyles.join('\n');
}

async function compileLess(code: string): Promise<string> {
  await ensureLessLoaded();
  const result = await window.less.render(code);
  return result.css;
}

async function compileScss(code: string): Promise<string> {
  await ensureSassLoaded();
  return new Promise((resolve, reject) => {
    window.Sass.compile(code, (result: any) => {
      if (result.status === 0) {
        resolve(result.text);
      } else {
        reject(new Error(result.message));
      }
    });
  });
}
```

## 5. 难点四：Scoped Styles 实现

### 5.1 问题描述

Vue 的 Scoped Styles 在构建时由 vue-loader 处理。浏览器端需要自行实现：

```vue
<style scoped>
.button {
  color: red;
}
</style>
```

需要转换为：

```css
.button[data-v-xxxxx] {
  color: red;
}
```

同时组件需要添加 `data-v-xxxxx` 属性。

### 5.2 解决方案

```typescript
// 生成唯一 scopeId
function generateScopeId(source: string): string {
  // 使用源码 hash 生成稳定的 ID
  const hash = simpleHash(source);
  return `data-v-${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

// CSS Scoped 处理
function scopeCSS(css: string, scopeId: string): string {
  // 匹配选择器并添加属性选择器
  return css.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, (match, selector, after) => {
    // 跳过 @keyframes, @media 等
    if (selector.trim().startsWith('@')) {
      return match;
    }

    // 处理选择器
    const scopedSelector = addScopeToSelector(selector.trim(), scopeId);
    return scopedSelector + after;
  });
}

function addScopeToSelector(selector: string, scopeId: string): string {
  // 处理组合选择器
  return selector
    .split(/\s+/)
    .map((part, index, arr) => {
      // 在最后一个选择器上添加 scope
      if (index === arr.length - 1) {
        // 处理伪类
        const pseudoMatch = part.match(/^([^:]+)(:.+)?$/);
        if (pseudoMatch) {
          return `${pseudoMatch[1]}[${scopeId}]${pseudoMatch[2] || ''}`;
        }
        return `${part}[${scopeId}]`;
      }
      return part;
    })
    .join(' ');
}
```

### 5.3 组件属性注入

```typescript
function injectScopeId(component: any, scopeId: string): any {
  const originalRender = component.render;

  component.render = function (h: any) {
    const vnode = originalRender.call(this, h);

    // 为根元素添加 scopeId
    if (vnode && vnode.data) {
      vnode.data.attrs = vnode.data.attrs || {};
      vnode.data.attrs[scopeId] = '';
    }

    return vnode;
  };

  // 为子组件也添加 scopeId
  component._scopeId = scopeId;

  return component;
}
```

## 6. 难点五：Composition API setup 返回函数

### 6.1 问题描述

在 Vue 2.7 的 Composition API 中，`setup` 可以返回渲染函数：

```tsx
import { defineComponent, h, ref } from 'vue';

export default defineComponent({
  setup() {
    const count = ref(0);

    // 返回渲染函数
    return () => (
      <div>
        <span>{count.value}</span>
        <button on={{ click: () => count.value++ }}>+1</button>
      </div>
    );
  },
});
```

这需要特殊处理，因为：

1. 需要正确注入 `h` 函数
2. JSX 需要转换为 Vue 2 的 `h` 调用格式
3. 响应式数据需要正确追踪

### 6.2 解决方案

```typescript
// Babel 插件：处理 setup 返回的渲染函数
const setupRenderPlugin = ({ types: t }: any) => ({
  visitor: {
    // 查找 setup 方法
    ObjectMethod(path: any) {
      if (path.node.key.name !== 'setup') return;

      // 检查是否返回函数
      path.traverse({
        ReturnStatement(returnPath: any) {
          if (
            t.isArrowFunctionExpression(returnPath.node.argument) ||
            t.isFunctionExpression(returnPath.node.argument)
          ) {
            // 确保 h 被正确注入
            injectHFunction(path);
          }
        },
      });
    },
  },
});

function injectHFunction(setupPath: any) {
  const { types: t } = babel;

  // 在 setup 函数体开头添加 h 的获取
  const hDeclaration = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('h'),
      t.callExpression(t.memberExpression(t.identifier('Vue'), t.identifier('prototype')), [
        t.identifier('$createElement'),
      ]),
    ),
  ]);

  setupPath.node.body.body.unshift(hDeclaration);
}
```

### 6.3 运行时处理

```typescript
// 渲染器中处理 setup 返回函数的情况
function createComponent(options: any): any {
  if (typeof options.setup === 'function') {
    const originalSetup = options.setup;

    options.setup = function (props: any, context: any) {
      const result = originalSetup.call(this, props, context);

      // 如果 setup 返回函数，转换为 render
      if (typeof result === 'function') {
        // 返回对象，让 Vue 知道这是渲染函数
        return {
          render: result,
        };
      }

      return result;
    };
  }

  return options;
}
```

## 7. 难点六：HMR 增量更新

### 7.1 问题描述

实现热更新时需要：

1. 检测文件变化
2. 只重新编译变化的组件
3. 保持组件状态（如果可能）
4. 优雅地替换组件

### 7.2 解决方案

```typescript
// HMR 处理器
class HMRHandler {
  private componentMap: Map<string, any> = new Map();
  private stateCache: Map<string, any> = new Map();

  // 注册组件
  register(id: string, component: any) {
    this.componentMap.set(id, component);
  }

  // 热更新组件
  async update(id: string, newCode: string) {
    const oldComponent = this.componentMap.get(id);

    // 保存状态
    if (oldComponent && oldComponent.$data) {
      this.stateCache.set(id, { ...oldComponent.$data });
    }

    // 编译新组件
    const newComponent = await compileComponent(newCode);

    // 恢复状态
    const savedState = this.stateCache.get(id);
    if (savedState && newComponent.data) {
      const originalData = newComponent.data;
      newComponent.data = function () {
        const data = typeof originalData === 'function' ? originalData.call(this) : originalData;
        return { ...data, ...savedState };
      };
    }

    // 替换组件
    this.componentMap.set(id, newComponent);

    // 触发重新渲染
    this.triggerRerender(id);
  }

  private triggerRerender(id: string) {
    // 通过 Vue 的响应式系统触发更新
    const event = new CustomEvent('vue2-hmr-update', {
      detail: { id },
    });
    window.dispatchEvent(event);
  }
}
```

### 7.3 Webpack HMR 集成

```typescript
// webpack.config.js 中的 HMR 配置
if (module.hot) {
  module.hot.accept('./components/Button.vue', () => {
    // 获取新模块
    const newModule = require('./components/Button.vue');

    // 触发 Vue 组件热更新
    const api = require('vue-hot-reload-api');
    api.reload('Button', newModule.default);
  });
}
```

## 8. 踩坑记录

### 8.1 Babel Standalone 版本兼容

**问题**：某些版本的 Babel Standalone 与 Vue JSX 插件不兼容

**解决**：锁定 Babel Standalone 版本为 7.22.x

```typescript
const BABEL_CDN = 'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.22.17/babel.min.js';
```

### 8.2 less.js 全局污染

**问题**：less.js 会修改全局 `less` 变量，可能与其他代码冲突

**解决**：使用命名空间隔离

```typescript
const originalLess = window.less;
await loadLess();
const lessCompiler = window.less;
window.less = originalLess; // 恢复
```

### 8.3 Scoped Styles 选择器优先级

**问题**：添加属性选择器后，某些选择器优先级不足

**解决**：确保属性选择器添加在正确位置

```css
/* 错误：属性选择器在最前面 */
[data-v-xxx].button {
}

/* 正确：属性选择器在元素选择器后面 */
.button[data-v-xxx] {
}
```

---

下一篇：[调试与开发](./07-DEVELOPMENT.md)
