# dumi-preset-vue2 功能增强 Roadmap

## 优先级列表

| 优先级 | 任务                            | 状态      | 说明                                                     |
| ------ | ------------------------------- | --------- | -------------------------------------------------------- |
| P1     | 实现实时编辑                    | ✅ 完成   | SFC + TSX/JSX Live Editing 均已实现                      |
| P2     | 放宽 JSX 路径限制               | ✅ 完成   | 支持 `jsxIncludes` 配置自定义规则                        |
| P3     | 添加 modifyBabelPresetOpts 配置 | ⏳ 待开始 | 允许用户自定义 Babel 配置                                |
| P4     | 集成 API 自动解析               | ⏳ 待开始 | 找到 Vue 2 兼容的元数据库实现 atomParser                 |
| P5     | 启用在线沙箱                    | ⏳ 待开始 | 调试 runtimePlugin 导出问题，支持 CodeSandbox/StackBlitz |

## 详细进度

### P1: 实现实时编辑

**目标**: 让用户可以在文档页面实时修改 Vue 2 组件代码并看到效果

**技术方案**:

1. 使用 `@vue/compiler-sfc` (Vue 3) 解析 SFC，兼容 Vue 2.7
2. 使用 `@babel/standalone` 通过 CDN 加载，编译 script 部分
3. 打包浏览器端编译器到 compiler.mjs
4. 启用 compilePath 配置，让 dumi 调用浏览器端编译器

**已完成的修改**:

- `src/compiler/browser.ts` - 浏览器端 SFC/TSX/JSX 编译器
- `src/compiler/node.ts` - Node.js 端编译器，添加 `injectH: false`
- `src/vue2/webpack/config.ts` - 修复 Babel preset 顺序和 resourceQuery 过滤
- `src/vue2/techStack/index.ts` - 启用 compilePath、CDN 注入、externals 配置
- `tsup.config.ts` - 打包浏览器端编译器

**关键修复 (2025-11-27)**:

1. **TSX/JSX `h is not defined` 错误**
   - 原因：`@vue/babel-preset-jsx` 默认 `injectH: true` 会注入 `const h = this.$createElement`，在 Composition API 的 `setup()` 中 `this` 是 `undefined`
   - 解决：在 node.ts 和 config.ts 中添加 `{ injectH: false }` 选项

2. **Babel preset 执行顺序**
   - 原因：Babel presets 按**逆序**执行（数组最后的先执行）
   - 解决：调整顺序，TypeScript preset 放最后（先执行剥离类型），Vue JSX preset 放前面（后执行转换 JSX）

3. **resourceQuery 过滤**
   - 原因：Vue JSX preset 应用到所有 tsx 文件会破坏 React JSX
   - 解决：添加 `resourceQuery(/techStack=vue2-tsx/)` 只处理 Vue demo 文件

**支持的功能**:

- ✅ Vue SFC Live Editing（含 scoped styles）
- ✅ TSX/JSX Live Editing（Composition API + Options API）
- ✅ TypeScript 支持
- ✅ `<script setup>` 语法

**限制**:

- 不支持预处理器（Sass/Less/Pug）
- 不支持 `<style module>`

**状态**: ✅ 完成

---

### P2: 放宽 JSX 路径限制

**目标**: 允许用户自定义 JSX/TSX 文件的识别规则

**已实现**:

- 添加 `vue2.jsxIncludes` 配置项
- 支持三种模式：
  - `true`: 匹配所有 JSX/TSX 文件
  - `string[]`: 字符串数组，子串匹配
  - `(string | RegExp)[]`: 支持正则表达式

**使用示例**:

```ts
// .dumirc.ts
export default {
  vue2: {
    // 默认值，只匹配 /vue2/ 或 /vue2- 目录
    jsxIncludes: ['/vue2/', '/vue2-'],

    // 匹配所有 JSX/TSX
    jsxIncludes: true,

    // 自定义路径
    jsxIncludes: ['/components/', '/demos/'],

    // 使用正则
    jsxIncludes: [/\/src\/.*\.tsx$/],
  },
};
```

**修改文件**:

- `src/index.ts` - 添加配置 schema
- `src/vue2/techStack/index.ts` - 传递配置
- `src/vue2/techStack/jsx.ts` - 实现匹配逻辑

**状态**: ✅ 完成

---

### P3: 添加 modifyBabelPresetOpts 配置

**目标**: 允许用户自定义 Babel 配置

**当前问题**:

- Babel 配置硬编码，无法扩展

**技术方案**: 待规划

**状态**: ⏳ 待开始

---

### P4: 集成 API 自动解析

**目标**: 自动从 Vue 2 组件中提取 props、events、slots 等 API 文档

**当前问题**:

- 缺少 atomParser 实现
- 需要找到 Vue 2 兼容的元数据提取库

**技术方案**: 待规划

**状态**: ⏳ 待开始

---

### P5: 启用在线沙箱

**目标**: 支持将 demo 导出到 CodeSandbox/StackBlitz

**当前问题**:

- runtimePlugin 被禁用，报 "invalid key default" 错误
- 缺少 getPreviewerData 实现

**技术方案**: 待规划

**状态**: ⏳ 待开始

---

## 更新日志

- **2025-11-27**: P1 完成 - 修复 TSX/JSX Live Editing `h is not defined` 错误
- **2025-11-25**: P1 SFC Live Editing 实现完成
- **2025-01-XX**: 创建 Roadmap，P2 完成
