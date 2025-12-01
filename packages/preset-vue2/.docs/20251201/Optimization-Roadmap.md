# preset-vue2 优化路线图

## 一、与 preset-vue 对比分析

| 功能维度            | preset-vue (Vue 3)        | preset-vue2 (Vue 2)        | 差距      |
| ------------------- | ------------------------- | -------------------------- | --------- |
| **HMR 热更新**      | Vite 原生支持，状态保留   | Webpack HMR，常需刷新      | ⚠️ 中     |
| **TypeScript**      | 完整 TS + TSX 支持        | 基础 TS 支持               | ⚠️ 中     |
| **API Table**       | Props/Events/Slots/Expose | Props/Events/Slots/Methods | ✅ 已对齐 |
| **Live Editing**    | 支持                      | 支持                       | ✅ 已对齐 |
| **Composition API** | 原生支持                  | 需 @vue/composition-api    | ⚠️ 低     |
| **编译速度**        | esbuild 快速编译          | Babel 编译较慢             | ⚠️ 中     |
| **错误提示**        | 友好的编译错误            | 错误信息不够清晰           | ⚠️ 中     |
| **调试体验**        | Vue Devtools 完整支持     | 支持但功能有限             | ⚠️ 低     |
| **Bundle 体积**     | Tree-shaking 优秀         | 体积较大                   | ⚠️ 中     |
| **文档生成**        | 自动生成完整文档          | 基础文档支持               | ⚠️ 中     |

---

## 二、优化优先级

### 🔴 P0 - 核心体验（立即优化）

#### 1. HMR 热更新优化

**现状**: 源文件修改后经常需要完整页面刷新
**目标**: 实现组件级热更新，保留页面状态

```typescript
// 方案：增强 vue-loader 的 HMR 配置
// packages/preset-vue2/src/vue2/webpack/config.ts

export function configureHMR(config: WebpackConfig) {
  // 1. 配置 vue-loader 的 hotReload 选项
  config.module.rules.push({
    test: /\.vue$/,
    loader: 'vue-loader',
    options: {
      hotReload: true,
      // 保留组件状态
      preserveWhitespace: false,
    },
  });

  // 2. 添加 HMR 运行时代码
  config.plugins.push(new webpack.HotModuleReplacementPlugin());
}
```

**实现步骤**:

1. 检查当前 vue-loader 配置
2. 添加 HMR 专用配置
3. 在 runtime 中注入 HMR 接受逻辑
4. 测试状态保留效果

#### 2. 编译错误提示优化

**现状**: 编译错误信息不够友好，难以定位问题
**目标**: 提供清晰的错误位置和修复建议

```typescript
// packages/preset-vue2/src/vue2/techStack/sfc.ts

function formatCompileError(error: Error, source: string): string {
  return `
╭─────────────────────────────────────────────────╮
│  Vue 2 编译错误                                  │
├─────────────────────────────────────────────────┤
│  文件: ${error.filename}                         │
│  行号: ${error.line}:${error.column}            │
├─────────────────────────────────────────────────┤
│  ${error.message}                               │
├─────────────────────────────────────────────────┤
│  ${highlightErrorLine(source, error.line)}      │
╰─────────────────────────────────────────────────╯
  `;
}
```

#### 3. Live Editing 性能优化

**现状**: 每次修改都重新编译整个组件
**目标**: 增量编译，只更新变化部分

```typescript
// 方案：实现编译缓存
const compilationCache = new Map<string, CompiledResult>();

function compileWithCache(code: string, options: CompileOptions) {
  const hash = createHash(code);

  if (compilationCache.has(hash)) {
    return compilationCache.get(hash);
  }

  const result = compile(code, options);
  compilationCache.set(hash, result);

  return result;
}
```

---

### 🟡 P1 - 功能增强（短期优化）

#### 4. TypeScript 增强支持

**现状**: TSX 支持基础，类型推断有限
**目标**: 完整的 TypeScript 支持，包括类型检查

```typescript
// 增强 TSX 类型支持
// 1. 添加 @vue/runtime-dom 类型声明
// 2. 配置 tsconfig 的 jsx 选项
// 3. 支持 defineComponent 的类型推断

// packages/preset-vue2/src/vue2/techStack/jsx.ts
export function enhanceTSXSupport() {
  return {
    // 使用 @babel/preset-typescript
    presets: [
      [
        '@babel/preset-typescript',
        {
          isTSX: true,
          allExtensions: true,
        },
      ],
    ],
    // Vue JSX 插件
    plugins: ['@vue/babel-plugin-jsx'],
  };
}
```

#### 5. API Table 增强

**现状**: 基础的 Props/Events/Slots/Methods 解析
**目标**: 更丰富的文档信息

```typescript
// 增强内容：
// 1. 类型详情展示（泛型、联合类型展开）
// 2. 示例代码自动生成
// 3. 相关组件链接
// 4. 版本历史标记 (@since, @deprecated)

interface EnhancedPropertySchema extends PropertySchema {
  since?: string; // 添加版本
  deprecated?: string; // 废弃说明
  examples?: string[]; // 使用示例
  see?: string[]; // 相关链接
}
```

#### 6. 组件预览增强

**现状**: 基础预览功能
**目标**: 交互式 Props 控制面板

```typescript
// 类似 Storybook 的 Controls 功能
// packages/preset-vue2/src/builtins/PropsPanel.tsx

export function PropsPanel({ component, propsConfig }) {
  return (
    <div className="props-panel">
      {Object.entries(propsConfig.properties).map(([name, schema]) => (
        <PropControl
          key={name}
          name={name}
          schema={schema}
          onChange={(value) => updateProp(name, value)}
        />
      ))}
    </div>
  );
}
```

---

### 🟢 P2 - 体验提升（中期优化）

#### 7. 构建性能优化

**目标**: 减少首次编译和增量编译时间

```typescript
// 方案：
// 1. 使用 esbuild 预编译依赖
// 2. 启用持久化缓存
// 3. 并行编译多个组件

// webpack 配置
{
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  optimization: {
    moduleIds: 'deterministic',
  },
}
```

#### 8. Bundle 体积优化

**目标**: 减少文档站点的最终体积

```typescript
// 方案：
// 1. Vue 2 按需引入
// 2. 组件代码分割
// 3. 移除开发时代码

// 配置示例
{
  externals: {
    vue: 'Vue',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vue: {
          test: /[\\/]node_modules[\\/]vue[\\/]/,
          name: 'vue',
          priority: 20,
        },
      },
    },
  },
}
```

#### 9. 多主题支持

**目标**: 支持组件在不同主题下的预览

```typescript
// packages/preset-vue2/src/builtins/ThemeSwitcher.tsx
export function ThemeSwitcher({ themes, currentTheme, onChange }) {
  return (
    <div className="theme-switcher">
      {themes.map(theme => (
        <button
          key={theme.name}
          className={theme.name === currentTheme ? 'active' : ''}
          onClick={() => onChange(theme.name)}
        >
          {theme.label}
        </button>
      ))}
    </div>
  );
}
```

---

### 🔵 P3 - 创新功能（长期目标，超越 preset-vue）

#### 10. 可视化组件编辑器

**目标**: 拖拽式组件配置，生成代码

```
┌─────────────────────────────────────────────────────┐
│  [组件预览区]              │  [Props 配置面板]      │
│                            │  ┌─────────────────┐  │
│     ┌──────────────┐       │  │ type: [primary▼]│  │
│     │   Button     │       │  │ size: [medium▼] │  │
│     │   Click Me   │       │  │ disabled: [ ]   │  │
│     └──────────────┘       │  └─────────────────┘  │
│                            │                       │
├─────────────────────────────────────────────────────┤
│  [生成代码预览]                                     │
│  <Button type="primary" size="medium">Click Me     │
│  </Button>                                          │
└─────────────────────────────────────────────────────┘
```

#### 11. AI 文档助手

**目标**: 自动生成组件使用示例和最佳实践

```typescript
// 基于组件 API 自动生成示例
async function generateExamples(component: AtomComponentAsset) {
  const prompt = `
    根据以下 Vue 2 组件 API，生成 3 个使用示例：
    - Props: ${JSON.stringify(component.propsConfig)}
    - Events: ${JSON.stringify(component.eventsConfig)}
    - Slots: ${JSON.stringify(component.slotsConfig)}
  `;

  return await ai.generate(prompt);
}
```

#### 12. 组件测试集成

**目标**: 文档中直接运行单元测试

```typescript
// packages/preset-vue2/src/builtins/TestRunner.tsx
export function TestRunner({ componentId, tests }) {
  const [results, setResults] = useState([]);

  const runTests = async () => {
    const results = await Promise.all(
      tests.map(test => executeTest(test))
    );
    setResults(results);
  };

  return (
    <div className="test-runner">
      <button onClick={runTests}>Run Tests</button>
      <TestResults results={results} />
    </div>
  );
}
```

#### 13. 组件性能分析

**目标**: 展示组件渲染性能指标

```typescript
// 集成 Vue Performance Devtools
function measureComponentPerformance(component) {
  return {
    renderTime: performance.measure('render'),
    updateTime: performance.measure('update'),
    memoryUsage: performance.memory,
    rerenderCount: getRerenderCount(),
  };
}
```

#### 14. 国际化文档支持

**目标**: 组件文档多语言自动切换

```markdown
<!-- Button.zh-CN.md -->

## 按钮组件

用于触发操作的基础组件

<!-- Button.en-US.md -->

## Button Component

A basic component for triggering actions
```

---

## 三、实施计划

### 第一阶段（1-2周）- 核心优化

- [ ] HMR 热更新优化
- [ ] 编译错误提示优化
- [ ] Live Editing 性能优化

### 第二阶段（2-4周）- 功能增强

- [ ] TypeScript 增强支持
- [ ] API Table 增强
- [ ] 组件预览增强（Props Panel）

### 第三阶段（1-2月）- 体验提升

- [ ] 构建性能优化
- [ ] Bundle 体积优化
- [ ] 多主题支持

### 第四阶段（长期）- 创新功能

- [ ] 可视化组件编辑器
- [ ] AI 文档助手
- [ ] 组件测试集成
- [ ] 组件性能分析
- [ ] 国际化文档支持

---

## 四、技术栈升级建议

| 当前           | 建议升级           | 收益             |
| -------------- | ------------------ | ---------------- |
| Webpack 5      | 保持 (dumi 限制)   | -                |
| Babel          | 部分使用 esbuild   | 编译速度 +50%    |
| vue-loader     | vue-loader + cache | HMR 更稳定       |
| vue-docgen-api | 增强解析器         | 更完整的类型信息 |

---

## 五、差异化竞争优势

preset-vue2 可以在以下方面超越 preset-vue：

1. **更好的企业级支持**: Vue 2 仍是很多企业的主力框架
2. **迁移辅助工具**: 提供 Vue 2 → Vue 3 迁移建议
3. **兼容性文档**: 标注 API 在不同 Vue 版本的差异
4. **性能基准测试**: 展示组件在 Vue 2 环境下的性能数据
5. **Element UI 集成**: 更好地支持 Element UI 等 Vue 2 生态组件库
