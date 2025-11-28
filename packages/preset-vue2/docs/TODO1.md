# dumi-preset-vue2 优化

## 已完成 (2025-11-27)

| 问题                  | 位置                   | 解决方案                      | 状态 |
| --------------------- | ---------------------- | ----------------------------- | ---- |
| 编译器代码重复        | index.ts vs browser.ts | 创建 shared.ts 提取公共代码   | Done |
| 错误类型不一致        | 编译器返回值           | 统一 CompileResult 类型定义   | Done |
| 正则匹配无防御        | 文件名解析             | 添加 safeResolveFilename 函数 | Done |
| 文件读取无try-catch   | techStack/index.ts     | 添加完整错误处理              | Done |
| Live Editing 错误恢复 | renderer.ts            | 修复错误后不再重新抛出异常    | Done |
| LESS/SCSS 样式支持    | SFC style 标签         | 添加 LESS/SCSS 预处理器支持   | Done |

## 高优先级问题 (待处理)

| 问题   | 位置 | 影响 |
| ------ | ---- | ---- |
| (暂无) |      |      |

## 中优先级问题

| 问题         | 说明                           | 状态     |
| ------------ | ------------------------------ | -------- |
| 过度使用 any | 削弱类型检查                   | 部分完成 |
| 缺乏关键注释 | 复杂逻辑难以理解               | 部分完成 |
| 依赖版本问题 | @babel/plugin-syntax-jsx 重复  | Done     |
| 构建配置重复 | tsup.config.ts 4个配置大量重复 | Done     |
| 内存泄漏风险 | 样式注入没有清理策略           | 已改善   |

## 优化详情

### 2025-11-27 更新

#### 1. 编译器代码重构

- 创建 `src/compiler/shared.ts` 提取公共代码
- 统一常量、类型、工具函数
- 减少 Node/Browser 编译器代码重复约 60%

#### 2. Live Editing 错误恢复

- 修复语法错误后组件无法恢复的问题
- renderer.ts 不再重新抛出错误
- browser.ts 添加顶层 try-catch 保护

#### 3. LESS/SCSS 样式预处理支持

- Node 端使用 `less` 和 `sass` 包
- Browser 端通过 CDN 加载 less.js 和 sass.js
- 支持 `<style lang="less">` 和 `<style lang="scss">`
- 详细文档: [LESS_SCSS_SUPPORT.md](./20251127/LESS_SCSS_SUPPORT.md)

## 相关文档

- [20251125/DEVELOPMENT.md](./20251125/DEVELOPMENT.md) - 开发指南
- [20251125/PRESET_VUE_PRINCIPLES.md](./20251125/PRESET_VUE_PRINCIPLES.md) - 设计原则
- [20251127/TSX_LIVE_EDITING_FIX.md](./20251127/20251127_TSX_LIVE_EDITING_FIX.md) - TSX Live Editing 修复
- [20251127/LESS_SCSS_SUPPORT.md](./20251127/LESS_SCSS_SUPPORT.md) - LESS/SCSS 支持
