# Vue 2 Live Editing 完整实施方案

## 目标

让所有 Vue 2 demo 文件支持 Live Editing（实时编辑预览）：

| 文件类型     | 当前状态 | 目标状态 | 实现阶段 |
| ------------ | -------- | -------- | -------- |
| `.vue` (SFC) | ❌ 禁用  | ✅ 支持  | 第一阶段 |
| `.tsx` (TSX) | ❌ 禁用  | ✅ 支持  | 第二阶段 |
| `.jsx` (JSX) | ❌ 禁用  | ✅ 支持  | 第二阶段 |

---

## 第一阶段：启用 SFC Live Editing

### 1.1 技术方案

**已有能力**：

- `@vue/component-compiler-utils` - 浏览器端 SFC 解析
- `vue-template-compiler` - 模板编译
- `@babel/standalone` - 浏览器端 Babel

**工作流程**：

```
用户编辑 .vue 代码
       ↓
browser.ts compile()
       ↓
┌──────────────────────────────┐
│  1. parse() 解析 SFC         │
│  2. compileTemplate() 编译模板│
│  3. compileStyle() 编译样式   │
│  4. transformTS() 转换脚本   │
│  5. toCommonJS() 转为 CJS    │
└──────────────────────────────┘
       ↓
renderer.ts 挂载组件
       ↓
实时更新预览
```

### 1.2 修改清单

1. **techStack/index.ts**
   - 恢复 `COMPILE_FILENAME` 常量
   - 恢复 `compilePath` 配置
   - 恢复 Babel standalone 脚本加载
   - 恢复 externals 配置

2. **compiler/browser.ts**
   - 恢复 `compile()` 函数的 SFC 编译逻辑
   - TSX/JSX 文件仍显示"不支持"提示

3. **测试验证**
   - LoginFormSFC.vue 可以 Live Editing
   - LoginFormSetup.vue 可以 Live Editing

---

## 第二阶段：打包 Vue JSX 插件到浏览器

### 2.1 技术挑战

`@babel/standalone` 不包含 `@vue/babel-preset-jsx`，需要：

1. 将 Vue JSX 插件打包为浏览器可用的 bundle
2. 使用 `Babel.registerPlugin()` 注册插件
3. 在编译时使用这些插件

### 2.2 @vue/babel-preset-jsx 结构

```
@vue/babel-preset-jsx
├── @vue/babel-plugin-transform-vue-jsx      (核心：JSX → h() 转换)
├── @vue/babel-sugar-inject-h                (自动注入 h)
├── @vue/babel-sugar-v-model                 (v-model 语法糖)
├── @vue/babel-sugar-v-on                    (v-on 语法糖)
├── @vue/babel-sugar-functional-vue          (函数式组件)
├── @vue/babel-sugar-composition-api-inject-h
└── @vue/babel-sugar-composition-api-render-instance
```

### 2.3 实现方案

**方案：创建 vue-jsx-browser-plugins.ts**

```typescript
// 新文件：src/compiler/vue-jsx-browser-plugins.ts
// 使用 tsup 打包为浏览器可用的 bundle
import transformVueJsx from '@vue/babel-plugin-transform-vue-jsx';
import sugarCompositionInjectH from '@vue/babel-sugar-composition-api-inject-h';
import sugarCompositionRenderInstance from '@vue/babel-sugar-composition-api-render-instance';
import sugarFunctional from '@vue/babel-sugar-functional-vue';
import sugarInjectH from '@vue/babel-sugar-inject-h';
import sugarVModel from '@vue/babel-sugar-v-model';
import sugarVOn from '@vue/babel-sugar-v-on';

export function registerVueJsxPlugins(Babel: any) {
  Babel.registerPlugin('vue-jsx', transformVueJsx);
  Babel.registerPlugin('vue-sugar-inject-h', sugarInjectH);
  Babel.registerPlugin('vue-sugar-v-model', sugarVModel);
  Babel.registerPlugin('vue-sugar-v-on', sugarVOn);
  Babel.registerPlugin('vue-sugar-functional', sugarFunctional);
  Babel.registerPlugin('vue-sugar-composition-inject-h', sugarCompositionInjectH);
  Babel.registerPlugin('vue-sugar-composition-render-instance', sugarCompositionRenderInstance);
}

export const vueJsxPluginList = [
  'vue-jsx',
  'vue-sugar-inject-h',
  // ... 根据需要启用
];
```

### 2.4 打包配置

修改 `tsup.config.ts`：

```typescript
export default defineConfig([
  // 现有配置...
  {
    entry: {
      'vue-jsx-plugins': 'src/compiler/vue-jsx-browser-plugins.ts',
    },
    outDir: 'lib',
    format: ['esm'],
    platform: 'browser',
    external: [], // 不排除任何依赖，全部打包进来
    noExternal: [/@vue\/babel-/], // 强制打包 Vue 相关
  },
]);
```

### 2.5 加载流程

```
页面加载
   ↓
1. 加载 @babel/standalone (CDN)
   ↓
2. 加载 vue-jsx-plugins.mjs (我们打包的)
   ↓
3. registerVueJsxPlugins(Babel) 注册插件
   ↓
4. 用户编辑 TSX 代码
   ↓
5. Babel.transform() 使用注册的插件编译
   ↓
6. renderer.ts 挂载组件
```

### 2.6 修改清单

1. **新建 src/compiler/vue-jsx-browser-plugins.ts**
   - 导入所有 Vue JSX Babel 插件
   - 导出 registerVueJsxPlugins 函数

2. **修改 tsup.config.ts**
   - 添加 vue-jsx-plugins 打包入口
   - 配置正确的打包选项

3. **修改 techStack/index.ts**
   - 加载 vue-jsx-plugins.mjs
   - 在 Babel 加载后注册插件

4. **修改 compiler/browser.ts**
   - TSX/JSX 使用注册的 Vue JSX 插件编译
   - 移除"不支持"提示

---

## 风险与应对

### 风险 1：Vue JSX 插件可能有 Node.js 依赖

**应对**：

- 使用 rollup/tsup 的 polyfill 功能
- 必要时 mock 掉 Node.js API
- 实在不行，考虑精简插件（只用核心的 transform-vue-jsx）

### 风险 2：打包后体积过大

**应对**：

- 分析各插件体积，按需加载
- 考虑 tree-shaking
- 必要时只打包核心插件

### 风险 3：插件版本兼容性

**应对**：

- 锁定与 @vue/babel-preset-jsx@1.4.0 相同的版本
- 充分测试各种 JSX 写法

---

## 时间计划

| 阶段     | 任务                  | 预计时间 |
| -------- | --------------------- | -------- |
| 第一阶段 | 启用 SFC Live Editing | 30 分钟  |
| 第二阶段 | 打包 Vue JSX 插件     | 1-2 小时 |
| 测试     | 所有 demo 测试        | 30 分钟  |

---

## 开始实施

确认方案后，按以下顺序执行：

1. ✅ 方案确认
2. ⬜ 第一阶段实施
3. ⬜ 第一阶段测试
4. ⬜ 第二阶段实施
5. ⬜ 第二阶段测试
6. ⬜ 完成
