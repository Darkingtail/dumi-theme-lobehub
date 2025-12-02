# 需求分析

## 1. 功能需求

### 1.1 核心功能

#### F1: Vue 2 SFC 编译与渲染

| 需求项 | 优先级 | 描述                                               |
| ------ | ------ | -------------------------------------------------- |
| F1.1   | P0     | 支持 `.vue` 单文件组件的编译                       |
| F1.2   | P0     | 支持 `<template>` + `<script>` + `<style>` 结构    |
| F1.3   | P0     | 支持 Options API (`export default {}`)             |
| F1.4   | P0     | 支持 `Vue.extend()` 模式                           |
| F1.5   | P1     | 支持 Composition API (`defineComponent` + `setup`) |
| F1.6   | P1     | 支持 `<script setup>` (Vue 2.7+)                   |
| F1.7   | P2     | 支持 `<script lang="ts">` TypeScript               |

#### F2: JSX/TSX 编译与渲染

| 需求项 | 优先级 | 描述                                          |
| ------ | ------ | --------------------------------------------- |
| F2.1   | P0     | 支持 `.tsx` 和 `.jsx` 文件编译                |
| F2.2   | P0     | 支持 Vue 2 JSX 语法 (`@vue/babel-preset-jsx`) |
| F2.3   | P1     | 智能区分 React JSX 和 Vue JSX                 |
| F2.4   | P1     | 支持 JSX 路径过滤配置                         |

#### F3: Live Editing（浏览器端实时编辑）

| 需求项 | 优先级 | 描述                         |
| ------ | ------ | ---------------------------- |
| F3.1   | P0     | 浏览器端 SFC 编译和预览      |
| F3.2   | P0     | 浏览器端 JSX/TSX 编译和预览  |
| F3.3   | P1     | 编译错误友好提示（中英双语） |
| F3.4   | P1     | 编译结果缓存（LRU 策略）     |

#### F4: 样式支持

| 需求项 | 优先级 | 描述                                   |
| ------ | ------ | -------------------------------------- |
| F4.1   | P0     | 支持普通 CSS                           |
| F4.2   | P0     | 支持 Scoped Styles (`<style scoped>`)  |
| F4.3   | P1     | 支持 LESS (`<style lang="less">`)      |
| F4.4   | P1     | 支持 SCSS/SASS (`<style lang="scss">`) |
| F4.5   | P2     | 支持 CSS Modules (`<style module>`)    |

#### F5: API 自动提取

| 需求项 | 优先级 | 描述                                        |
| ------ | ------ | ------------------------------------------- |
| F5.1   | P0     | 提取 Props（类型、默认值、必填、描述）      |
| F5.2   | P0     | 提取 Events（事件名、参数类型）             |
| F5.3   | P0     | 提取 Slots（插槽名、作用域插槽绑定）        |
| F5.4   | P1     | 提取 Methods（公开方法，需 `@public` 标记） |
| F5.5   | P1     | 支持 TypeScript `PropType<T>` 泛型提取      |
| F5.6   | P2     | 支持 JSDoc 标签（@deprecated、@since 等）   |

#### F6: 开发体验

| 需求项 | 优先级 | 描述                          |
| ------ | ------ | ----------------------------- |
| F6.1   | P0     | HMR 热模块替换                |
| F6.2   | P0     | 文件监听与增量更新            |
| F6.3   | P1     | 外部模块解析（element-ui 等） |
| F6.4   | P2     | 源码高亮与行号                |

### 1.2 需求优先级说明

- **P0（必须）**：核心功能，没有这些功能产品无法使用
- **P1（重要）**：提升用户体验的重要功能
- **P2（增强）**：锦上添花的功能，可后续迭代

## 2. 非功能需求

### 2.1 性能需求

| 需求项 | 指标   | 描述                   |
| ------ | ------ | ---------------------- |
| NF1.1  | <500ms | 单个 SFC 编译时间      |
| NF1.2  | <200ms | 缓存命中时的响应时间   |
| NF1.3  | <50MB  | 浏览器端编译器内存占用 |
| NF1.4  | 1000+  | LRU 缓存容量           |

### 2.2 兼容性需求

| 需求项 | 描述                                            |
| ------ | ----------------------------------------------- |
| NF2.1  | 支持 Vue 2.6.x 和 2.7.x                         |
| NF2.2  | 支持 dumi 2.x                                   |
| NF2.3  | 支持主流浏览器（Chrome、Firefox、Safari、Edge） |
| NF2.4  | 支持 Node.js 16+                                |

### 2.3 可维护性需求

| 需求项 | 描述                      |
| ------ | ------------------------- |
| NF3.1  | 代码结构清晰，模块化设计  |
| NF3.2  | TypeScript 编写，类型完整 |
| NF3.3  | 关键逻辑有注释说明        |
| NF3.4  | 错误信息清晰，便于排查    |

### 2.4 可扩展性需求

| 需求项 | 描述                  |
| ------ | --------------------- |
| NF4.1  | 支持自定义 CDN 地址   |
| NF4.2  | 支持扩展外部模块映射  |
| NF4.3  | 预留 Babel 插件扩展点 |
| NF4.4  | 预留 API 解析器扩展点 |

## 3. 与 preset-vue (Vue 3) 的对齐需求

### 3.1 功能对齐矩阵

| 功能            | preset-vue       | preset-vue2      | 对齐状态 |
| --------------- | ---------------- | ---------------- | -------- |
| SFC 编译        | ✅               | ✅               | 已对齐   |
| JSX/TSX 编译    | ✅               | ✅               | 已对齐   |
| Live Editing    | ✅               | ✅               | 已对齐   |
| Scoped Styles   | ✅               | ✅               | 已对齐   |
| LESS/SCSS       | ✅               | ✅               | 已对齐   |
| Props 提取      | ✅               | ✅               | 已对齐   |
| Events 提取     | ✅               | ✅               | 已对齐   |
| Slots 提取      | ✅               | ✅               | 已对齐   |
| Methods 提取    | ✅               | ✅               | 已对齐   |
| HMR             | ✅               | ✅               | 已对齐   |
| TypeScript 支持 | 完整 TS 语言服务 | PropType<T> 解析 | 部分对齐 |
| Computed 提取   | ✅               | ❌               | 待开发   |
| Lifecycle 文档  | ✅               | ❌               | 待开发   |

### 3.2 差异化需求

由于 Vue 2 和 Vue 3 的技术差异，部分功能需要差异化实现：

| 功能     | Vue 3 方案                     | Vue 2 方案            |
| -------- | ------------------------------ | --------------------- |
| API 提取 | @dumijs/vue-meta (TS 语言服务) | vue-docgen-api        |
| JSX 转换 | @vue/babel-plugin-jsx          | @vue/babel-preset-jsx |
| SFC 编译 | @vue/compiler-sfc              | vue-template-compiler |
| 响应式   | Proxy                          | Object.defineProperty |

## 4. 用户场景

### 4.1 场景一：组件库开发者

**用户画像**：企业内部组件库维护者，需要为 Vue 2 组件库编写文档

**使用流程**：

1. 安装 `@dumijs/preset-vue2`
2. 配置 `.dumirc.ts`
3. 编写组件 demo（.vue 或 .tsx）
4. 使用 `<API>` 标签展示组件 API
5. 发布文档站点

**期望**：

- 快速上手，配置简单
- Demo 可实时编辑预览
- API 文档自动生成，无需手动维护

### 4.2 场景二：技术迁移规划者

**用户画像**：技术负责人，规划 Vue 2 → Vue 3 迁移

**使用流程**：

1. 使用 preset-vue2 为现有 Vue 2 组件库建立文档
2. 同时评估 Vue 3 组件库的文档方案
3. 渐进式迁移，文档系统保持一致

**期望**：

- 与 preset-vue 保持相似的使用体验
- 迁移时文档结构可复用
- 降低团队学习成本

### 4.3 场景三：开源项目维护者

**用户画像**：Vue 2 组件库的开源作者

**使用流程**：

1. 为开源组件库添加 dumi 文档
2. 提供在线 Demo 和 API 文档
3. 部署到 GitHub Pages 或其他平台

**期望**：

- 专业的文档站点外观
- 支持自定义主题
- 与 dumi 生态兼容

## 5. 需求范围

### 5.1 包含（In Scope）

- Vue 2.6/2.7 SFC 和 JSX/TSX 支持
- 完整的 Live Editing 功能
- Props/Events/Slots/Methods API 提取
- LESS/SCSS 样式预处理
- HMR 和文件监听
- 基本的 TypeScript 支持

### 5.2 不包含（Out of Scope）

- Vue 2.5 及更早版本
- vue-class-component (Class API)
- CSS Modules (`<style module>`)
- Pug 模板
- 自定义块 (Custom Blocks)
- Mixin 的 API 提取
- provide/inject 文档化

## 6. 验收标准

### 6.1 功能验收

- [ ] 能够编译和渲染 Vue 2 SFC
- [ ] 能够编译和渲染 Vue 2 JSX/TSX
- [ ] Live Editing 在浏览器中正常工作
- [ ] Scoped Styles 正确隔离
- [ ] LESS/SCSS 正确编译
- [ ] API Table 正确显示 Props/Events/Slots/Methods
- [ ] PropType<T> 类型正确提取
- [ ] HMR 正常工作

### 6.2 兼容性验收

- [ ] Vue 2.6 项目正常运行
- [ ] Vue 2.7 项目正常运行
- [ ] Element UI 组件正确渲染
- [ ] Chrome/Firefox/Safari 正常显示

### 6.3 性能验收

- [ ] 首次编译 < 1s
- [ ] 增量编译 < 200ms
- [ ] 无明显内存泄漏

---

下一篇：[技术选型](./03-TECH_STACK.md)
