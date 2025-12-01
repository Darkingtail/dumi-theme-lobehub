# @dumijs/preset-vue2 开发总结

> 整合自 TODO.md、TODO1.md、TODO2.md

## 功能完成度总览

| 类别     | 完成率 | 说明                                 |
| -------- | ------ | ------------------------------------ |
| 核心功能 | 100%   | Live Editing、API 解析、HMR 全部完成 |
| 代码质量 | 90%    | 重构完成，少量 any 类型待优化        |
| 功能增强 | 40%    | TypeScript 增强完成，部分特性待开发  |

---

## 已完成功能

### 核心功能 (P0-P1)

| 功能                     | 说明                                | 完成日期   |
| ------------------------ | ----------------------------------- | ---------- |
| **SFC Live Editing**     | Vue SFC 实时编辑，含 scoped styles  | 2025-11-25 |
| **JSX/TSX Live Editing** | Composition API + Options API 支持  | 2025-11-27 |
| **LESS/SCSS 支持**       | Node + Browser 双端预处理器         | 2025-11-27 |
| **JSX 路径过滤**         | `jsxIncludes` 配置自定义匹配规则    | 2025-11-27 |
| **API 自动解析**         | Props/Events/Slots/Methods 自动提取 | 2025-11-28 |
| **HMR 热更新**           | vue-loader 启用 `hotReload: isDev`  | 2025-11-29 |
| **编译缓存**             | LRU 缓存 (100 entries) 加速编译     | 2025-11-29 |
| **编译错误提示**         | 双语错误信息，与 preset-vue 一致    | 2025-11-29 |

### 功能增强 (P1)

| 功能                   | 说明                                 | 完成日期   |
| ---------------------- | ------------------------------------ | ---------- |
| **API Table 类型显示** | Events/Slots/Methods 使用 Vue 3 格式 | 2025-11-30 |
| **TypeScript 增强**    | `PropType<T>` 泛型类型提取           | 2025-12-01 |

### 代码质量优化

| 优化项                | 说明                              | 状态 |
| --------------------- | --------------------------------- | ---- |
| 编译器代码重构        | 创建 shared.ts，减少 60% 重复代码 | ✅   |
| 统一错误类型          | CompileResult 类型定义            | ✅   |
| 正则匹配防御          | safeResolveFilename 函数          | ✅   |
| 文件读取保护          | 添加 try-catch 错误处理           | ✅   |
| Live Editing 错误恢复 | 语法错误后可正常恢复              | ✅   |
| 依赖版本问题          | @babel/plugin-syntax-jsx 重复     | ✅   |
| 构建配置重复          | tsup.config.ts 配置合并           | ✅   |
| 内存泄漏风险          | 样式注入清理策略                  | ✅   |

---

## 待开发功能

### 中优先级

| 功能                      | 说明                             | 复杂度 |
| ------------------------- | -------------------------------- | ------ |
| **modifyBabelPresetOpts** | 允许用户自定义 Babel 配置        | 中     |
| **API Table 更多特性**    | 支持 mixins, filters, directives | 高     |
| **组件预览增强**          | 移动端预览、多主题预览           | 中     |
| **源码高亮优化**          | 更精准的 Vue 语法高亮            | 低     |

### 低优先级

| 功能                 | 说明           | 复杂度 |
| -------------------- | -------------- | ------ |
| **CodeSandbox 导出** | 在线沙箱支持   | 中     |
| **StackBlitz 导出**  | 在线沙箱支持   | 中     |
| **过度使用 any**     | 加强类型检查   | 低     |
| **关键注释补充**     | 复杂逻辑文档化 | 低     |

### 待规划 (Backlog)

| 功能                      | 说明                                                    | 复杂度 | 备注                |
| ------------------------- | ------------------------------------------------------- | ------ | ------------------- |
| **Class Component 支持**  | vue-class-component + vue-property-decorator 装饰器解析 | 高     | 企业项目常用        |
| **Mixin 文档化**          | 提取 mixin 的 props/methods/data 并标注来源             | 高     | Vue 2 特色功能      |
| **provide/inject 文档**   | 依赖注入的类型和描述提取                                | 中     | 组件库常用          |
| **Directive 文档**        | 自定义指令的 binding 参数文档                           | 中     | vue-docgen-api 支持 |
| **Filter 文档**           | Vue 2 过滤器文档                                        | 低     | Vue 3 已废弃        |
| **modifyBabelPresetOpts** | 允许用户自定义 Babel 配置                               | 中     | 扩展性需求          |

### 远期目标 (探索性)

| 功能                   | 说明                              |
| ---------------------- | --------------------------------- |
| 可视化编辑器           | 拖拽式组件编辑，实时预览          |
| Vue 2 → Vue 3 迁移建议 | 分析代码，给出升级建议            |
| 性能分析面板           | 组件渲染性能分析                  |
| 交互式教程             | 内置 Vue 2 学习教程               |
| Props 交互式编辑       | 在文档中直接修改 props 值查看效果 |
| 组件依赖图             | 可视化组件间引用关系              |
| API 变更对比           | 版本间 API 差异高亮               |

---

## 技术实现详情

### Live Editing 关键修复

1. **TSX/JSX `h is not defined` 错误**
   - 原因：`@vue/babel-preset-jsx` 默认注入 `const h = this.$createElement`，在 `setup()` 中 `this` 是 `undefined`
   - 解决：添加 `{ injectH: false }` 选项

2. **Babel preset 执行顺序**
   - 原因：Babel presets 按逆序执行
   - 解决：TypeScript preset 放最后（先执行），Vue JSX preset 放前面（后执行）

3. **resourceQuery 过滤**
   - 原因：Vue JSX preset 应用到所有 tsx 会破坏 React JSX
   - 解决：添加 `resourceQuery(/techStack=vue2-tsx/)` 只处理 Vue demo

### TypeScript 增强实现

```typescript
// 辅助函数
isPrimitiveType(typeName)  // 检测原始类型
isArrayType(typeName)      // 检测数组类型
isFunctionType(typeName)   // 检测函数类型

// 类型映射
PropType<User>        → { type: "reference", name: "User" }
PropType<User[]>      → { type: "array", items: { type: "reference", name: "User" } }
PropType<() => void>  → { type: "function", signature: {...} }
```

### API Table 格式 (与 preset-vue 一致)

```typescript
// Events
{ type: "function", signature: { arguments: [{ key: "event", schema: { type: "reference", name: "MouseEvent" } }] } }

// Slots
{ type: "reference", name: "VNodeChild" }

// Methods
{ type: "function", title: "methodName", signature: { arguments: [...], returnType: {...} } }
```

---

## 与 preset-vue (Vue 3) 对比

### 已达到功能对等

- SFC/JSX/TSX 编译
- Props/Events/Slots/Methods 提取
- TypeScript 支持
- CSS/SCSS/LESS 预处理
- HMR 热更新
- Live Editing

### preset-vue2 独有优势

- React/Vue 代码自动区分
- JSX 路径过滤配置
- 浏览器端 LESS/SCSS 编译
- LRU 编译缓存
- 双语错误提示
- Vue.extend() 兼容

### preset-vue 独有 (差距)

- 完整 TypeScript 语言服务（使用 @dumijs/vue-meta）
- Computed 属性自动提取
- 生命周期钩子文档

---

## 相关文档

- [DEVELOPMENT.md](./20251125/DEVELOPMENT.md) - 开发指南
- [PRESET_VUE_PRINCIPLES.md](./20251125/PRESET_VUE_PRINCIPLES.md) - 设计原则
- [TSX_LIVE_EDITING_FIX.md](./20251127/20251127_TSX_LIVE_EDITING_FIX.md) - TSX Live Editing 修复
- [LESS_SCSS_SUPPORT.md](./20251127/LESS_SCSS_SUPPORT.md) - LESS/SCSS 支持

---

## 更新日志

| 日期       | 内容                                          |
| ---------- | --------------------------------------------- |
| 2025-12-01 | TypeScript 增强完成，PropType<T> 泛型提取     |
| 2025-11-30 | API Table 类型显示优化 (Events/Slots/Methods) |
| 2025-11-29 | HMR 热更新、编译缓存、错误提示优化            |
| 2025-11-28 | API 自动解析 (atomParser) 实现                |
| 2025-11-27 | TSX/JSX Live Editing 修复、LESS/SCSS 支持     |
| 2025-11-25 | SFC Live Editing 实现、JSX 路径过滤           |
