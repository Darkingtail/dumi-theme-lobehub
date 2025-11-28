# preset-vue2 开发日志 - 2025-11-28

## 本次修复的问题

### 1. Vue.extend Live Editing 报错问题

#### 问题现象

使用 `Vue.extend()` 写法的组件（SFC 或 TSX），在正常渲染时工作正常，但在 Live Editing 模式下报错：

```
Uncaught TypeError: Cannot read properties of undefined (reading '_init')
    at VueComponent (vue.esm.js:5857:1)
```

#### 根本原因

**Vue.extend() 返回的是构造函数**：

```typescript
// Vue.extend 返回一个 VueComponent 构造函数
const MyComponent = Vue.extend({
  data() {
    return { count: 0 };
  },
  template: '<div>{{ count }}</div>',
});

// 正常使用需要用 new 调用
const instance = new MyComponent();
```

**dumi Live Editing 的运行机制**：

1. dumi 使用 React 来渲染 Vue 组件的预览
2. React 组件内部使用 `useState` 来存储编译后的 Vue 组件
3. 问题：当 `useState` 接收到一个函数时，React 会将其当作 **updater function** 调用

```typescript
// dumi 的 Previewer 内部类似这样的代码
const [Component, setComponent] = useState(compiledComponent);

// 如果 compiledComponent 是 Vue.extend() 返回的构造函数
// React 会这样调用它：
// Component = compiledComponent(prevState)  // 没有使用 new！
```

**构造函数被当作普通函数调用时**：

```typescript
function VueComponent(options) {
  this._init(options); // this 是 undefined 或 window，没有 _init 方法
}
```

#### 解决方案

在浏览器端编译器 (`browser.ts`) 中，将 `Vue.extend({...})` 替换为普通对象 `({...})`：

```typescript
// 修复前的编译输出
var _component = _vue['default'].extend({
  name: 'MyComponent',
  data() {
    return {};
  },
});

// 修复后的编译输出
var _component = {
  name: 'MyComponent',
  data() {
    return {};
  },
};
```

**为什么这样可行？**
Vue 2 的组件注册机制同时接受两种形式：

- 构造函数（Vue.extend 的返回值）
- 普通选项对象

Vue 内部会自动处理：

```typescript
// Vue 源码中的处理
if (typeof Ctor === 'object') {
  Ctor = Vue.extend(Ctor); // 自动调用 Vue.extend
}
```

#### 代码修改

**文件**: `src/compiler/browser.ts`

**SFC 编译路径** (第 397-404 行):

```typescript
const cjsResult = comp.toCommonJS(js);
let cjsCode = cjsResult?.code || js;

// Fix Vue.extend() issue in dumi's Live Editing environment for SFC files
cjsCode = cjsCode.replace(/_vue\["default"]\.extend\(\{/g, '({');
cjsCode = cjsCode.replace(/_vue\.default\.extend\(\{/g, '({');

return cjsCode;
```

**TSX/JSX 编译路径** (第 435-442 行):

```typescript
// Fix Vue.extend() issue in dumi's Live Editing environment
cjsCode = cjsCode.replace(/_vue\["default"]\.extend\({/g, '({');
cjsCode = cjsCode.replace(/_vue\.default\.extend\({/g, '({');
```

---

### 2. LobeHub 主题 Live Editing 按钮缺失

#### 问题现象

使用 LobeHub 主题的项目无法进行 Live Editing，因为编辑按钮不显示。

#### 根本原因

LobeHub 主题的 `PreviewerActions` 组件覆盖了 dumi 默认的实现，但只实现了部分功能按钮：

- CodeSandbox
- StackBlitz
- External (新窗口打开)
- Show/Hide Code

**缺失了编辑按钮**。

#### 解决方案

将 LobeHub 主题的 `PreviewerActions` 文件夹重命名为 `PreviewerActions.disabled`，让 dumi 使用默认的 PreviewerActions 组件。

---

## 关键技术点解析

### 为什么需要 `join(__dirname, '../package.json')`？

**文件**: `src/shared.ts`

```typescript
export function getCurrentPkgName(): string {
  const pkgJsonPath = join(__dirname, '../package.json');
  try {
    const pkg = require(pkgJsonPath);
    if (!pkg.name) {
      throw new Error('[preset-vue2] package.json does not have a "name" field');
    }
    return pkg.name;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[preset-vue2] Failed to read package.json from ${pkgJsonPath}: ${msg}\n__dirname: ${__dirname}`,
    );
  }
}
```

#### 背景

preset-vue2 是一个 dumi 插件，它需要：

1. 在运行时找到自己的 `lib/` 目录
2. 从 `lib/` 目录复制 `compiler.mjs`、`renderer.mjs` 等文件到 dumi 的临时目录

#### 为什么不能硬编码包名？

```typescript
// ❌ 错误做法：硬编码包名
const pkgName = '@anthropic/preset-vue2';
const pkgPath = getPkgPath(pkgName, api.cwd);
```

问题：

1. **可维护性差**：如果包改名，需要同时修改代码
2. **fork 项目问题**：用户 fork 后可能使用不同的包名
3. **monorepo 问题**：在 monorepo 中可能有多个版本

#### 解决方案：动态获取包名

```typescript
// ✅ 正确做法：从自己的 package.json 读取
function getCurrentPkgName(): string {
  const pkgJsonPath = join(__dirname, '../package.json');
  return require(pkgJsonPath).name;
}
```

#### `__dirname` 的工作原理

```
项目结构:
preset-vue2/
├── package.json        ← 需要读取这个文件
├── src/
│   └── shared.ts       ← 源码位置
└── dist/
    └── shared.js       ← 编译后位置，__dirname 指向这里
```

在 **编译后的代码** 中：

- `__dirname` = `/path/to/preset-vue2/dist`
- `join(__dirname, '../package.json')` = `/path/to/preset-vue2/package.json`

#### 使用场景

```typescript
// src/vue2/techStack/index.ts
function registerTechStack(api: IApi) {
  // 1. 获取当前包名（动态）
  const pkgName = getCurrentPkgName(); // 例如: "@anthropic/preset-vue2"

  // 2. 通过包名找到包的安装路径
  const pkgPath = getPkgPath(pkgName, api.cwd);
  // 例如: /path/to/project/node_modules/@anthropic/preset-vue2

  // 3. 定位 lib 目录
  const libPath = join(pkgPath, '/lib');
  // 例如: /path/to/project/node_modules/@anthropic/preset-vue2/lib

  // 4. 复制运行时文件
  api.onGenerateFiles(() => {
    const content = fsExtra.readFileSync(join(libPath, 'compiler.mjs'), 'utf8');
    api.writeTmpFile({ content, path: 'compiler.mjs' });
  });
}
```

#### 为什么不直接用 `__dirname`？

```typescript
// ❌ 这样不行
const libPath = join(__dirname, '../lib');
```

问题：`__dirname` 在不同场景下指向不同位置：

1. **开发时**（源码）: `preset-vue2/src/vue2/techStack/`
2. **构建后**（dist）: `preset-vue2/dist/vue2/techStack/`
3. **用户项目中**（node_modules）: `node_modules/@xxx/preset-vue2/dist/vue2/techStack/`

使用 `getPkgPath(pkgName, api.cwd)` 可以正确地从用户项目的 `node_modules` 中找到包的位置。

---

## 测试文件

### Vue.extend SFC 测试

- 文件: `vue2-example/docs/vue2demo/demos/LoginFormSFCExtend.vue`
- 使用 `export default Vue.extend({...})` 模式

### Vue.extend TSX 测试

- 文件: `vue2-example/docs/vue2demo/demos/LoginFormExtend.tsx`
- 使用 `export default Vue.extend({...})` 模式配合 JSX render 函数

---

## 相关文件清单

| 文件                          | 说明                                        |
| ----------------------------- | ------------------------------------------- |
| `src/compiler/browser.ts`     | 浏览器端 Vue 2 编译器，包含 Vue.extend 修复 |
| `src/shared.ts`               | 共享工具函数，包含 `getCurrentPkgName()`    |
| `src/vue2/techStack/index.ts` | 技术栈注册，使用动态包名查找                |
| `lib/compiler.mjs`            | 编译后的浏览器端编译器（ESM 格式）          |
| `lib/renderer.mjs`            | Vue 2 组件渲染器                            |
