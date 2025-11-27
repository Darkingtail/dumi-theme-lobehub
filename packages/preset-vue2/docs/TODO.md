# dumi-preset-vue2 功能增强 Roadmap

## 优先级列表

| 优先级 | 任务                            | 状态      | 说明                                                     |
| ------ | ------------------------------- | --------- | -------------------------------------------------------- |
| P1     | 实现实时编辑                    | ⏸️ 跳过   | 需要主题支持 LiveEditor 组件                             |
| P2     | 放宽 JSX 路径限制               | ✅ 完成   | 支持 `jsxIncludes` 配置自定义规则                        |
| P3     | 添加 modifyBabelPresetOpts 配置 | ⏳ 待开始 | 允许用户自定义 Babel 配置                                |
| P4     | 集成 API 自动解析               | ⏳ 待开始 | 找到 Vue 2 兼容的元数据库实现 atomParser                 |
| P5     | 启用在线沙箱                    | ⏳ 待开始 | 调试 runtimePlugin 导出问题，支持 CodeSandbox/StackBlitz |

## 详细进度

### P1: 实现实时编辑

**目标**: 让用户可以在文档页面实时修改 Vue 2 组件代码并看到效果

**技术方案**:

1. 使用 `vue-template-compiler` 浏览器版本解析和编译 SFC
2. 使用 `@babel/standalone` 通过 CDN 加载，编译 script 部分
3. 打包 vue-template-compiler 到 compiler.mjs (171KB)
4. 启用 compilePath 配置，让 dumi 调用浏览器端编译器

**已完成的修改**:

- `src/compiler/browser.ts` - 完全重写，使用 vue-template-compiler 浏览器 API
- `src/vue2/techStack/index.ts` - 启用 compilePath、CDN 注入、externals 配置
- `tsup.config.ts` - 将 vue-template-compiler 打包进 compiler.mjs

**限制**:

- SFC 中的 `<style scoped>` 在实时编辑时不生效（显示警告）
- 不支持预处理器（Sass/Less/Pug）
- JSX 支持需要额外的浏览器端 Vue 2 JSX 插件（待实现）

**状态**: ✅ 实现完成，待用户测试

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

- **2025-01-XX**: 创建 Roadmap，开始 P1 任务
