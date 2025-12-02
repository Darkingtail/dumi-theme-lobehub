# 调试与开发

## 1. 开发环境搭建

### 1.1 克隆项目

```bash
git clone https://github.com/lobehub/dumi-theme-lobehub.git
cd dumi-theme-lobehub
```

### 1.2 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 1.3 项目结构

```
dumi-theme-lobehub/
├── packages/
│   └── preset-vue2/           # Vue 2 Preset 包
│       ├── src/               # 源码
│       ├── dist/              # Node.js 构建产物
│       ├── lib/               # 浏览器构建产物
│       └── package.json
│
└── vue2-example/              # 示例项目
    ├── src/
    │   └── components/        # 示例组件
    ├── docs/                  # 文档
    └── .dumirc.ts             # dumi 配置
```

## 2. 开发命令

### 2.1 preset-vue2 开发

```bash
cd packages/preset-vue2

# 构建 Node.js 代码（dumi 插件）
pnpm build

# 构建浏览器运行时
pnpm build:lib

# 监听模式开发
pnpm dev

# 类型检查
pnpm type-check
```

### 2.2 示例项目开发

```bash
cd vue2-example

# 启动开发服务器
pnpm dev

# 构建文档站点
pnpm build

# 预览构建结果
pnpm preview
```

### 2.3 完整开发流程

```bash
# 1. 修改 preset-vue2 源码
cd packages/preset-vue2
pnpm build && pnpm build:lib

# 2. 在示例项目中测试
cd ../vue2-example
rm -rf .dumi/tmp node_modules/.cache
pnpm dev
```

## 3. 调试技巧

### 3.1 Node.js 侧调试

**方式一：console.log**

```typescript
// 在关键位置添加日志
export default (api: IApi) => {
  api.registerTechStack(() => {
    console.log('[preset-vue2] registerTechStack called');
    // ...
  });
};
```

**方式二：Node.js 调试器**

```bash
# 使用 --inspect 启动
node --inspect ./node_modules/.bin/dumi dev

# 然后在 Chrome 中打开 chrome://inspect
```

**方式三：VS Code 调试**

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug dumi",
      "cwd": "${workspaceFolder}/vue2-example",
      "program": "${workspaceFolder}/vue2-example/node_modules/.bin/dumi",
      "args": ["dev"],
      "skipFiles": ["<node_internals>/**"]
    }
  ],
  "version": "0.2.0"
}
```

### 3.2 浏览器侧调试

**方式一：浏览器开发者工具**

```typescript
// 在运行时代码中添加 debugger
export function compileVue2SFC(code: string) {
  debugger; // 浏览器会在此处暂停
  // ...
}
```

**方式二：全局变量暴露**

```typescript
// 将关键对象暴露到全局
if (typeof window !== 'undefined') {
  (window as any).__VUE2_PRESET__ = {
    compiler: browserCompiler,
    cache: compilationCache,
  };
}

// 在控制台中查看
// > __VUE2_PRESET__.cache
```

**方式三：Source Maps**

确保构建配置开启 source maps：

```javascript
// webpack.lib.config.js
module.exports = {
  devtool: 'source-map',
  // ...
};
```

### 3.3 Atom Parser 调试

```typescript
// 打印解析结果
async parse() {
  const result = await this._doParse();

  console.log('[Vue2MetaParser] Components found:', Object.keys(result.components));

  for (const [id, asset] of Object.entries(result.components)) {
    console.log(`[${id}] Props:`, asset.propsConfig);
    console.log(`[${id}] Events:`, asset.eventsConfig);
  }

  return result;
}
```

### 3.4 编译器调试

```typescript
// 查看编译输入输出
export async function compileSFC(code: string) {
  console.group('[SFC Compiler]');
  console.log('Input:', code.slice(0, 200) + '...');

  const result = await _compile(code);

  console.log('Output:', result.code?.slice(0, 200) + '...');
  console.log('Styles:', result.styles);
  console.groupEnd();

  return result;
}
```

## 4. 常见问题排查

### 4.1 组件不显示

**症状**：Demo 区域空白或显示错误

**排查步骤**：

1. 打开浏览器控制台，查看错误信息
2. 检查 Tech Stack 是否正确识别
   ```typescript
   // 在 isSupported 中添加日志
   isSupported(node, lang) {
     console.log('[TechStack] isSupported:', { lang, code: node.value?.slice(0, 50) });
     // ...
   }
   ```
3. 检查编译结果
   ```typescript
   // 在浏览器控制台
   __VUE2_PRESET__.compiler.compile(code).then(console.log);
   ```

### 4.2 API Table 不显示

**症状**：`<API>` 组件显示 "Component not found"

**排查步骤**：

1. 检查组件 ID 是否正确

   ```markdown
   <!-- 确保 id 与组件的 name 属性匹配 -->

   <API id="Button" type="props"></API>
   ```

2. 查看 Atom Parser 输出

   ```bash
   # 在 dumi 启动日志中查找
   [Vue2MetaParser] Components found: [...]
   ```

3. 检查组件是否被正确解析
   ```typescript
   // 手动测试解析
   import { parseVueComponent } from 'vue-docgen-api';

   const doc = await parseVueComponent('/path/to/Button.vue');
   console.log(doc);
   ```

### 4.3 样式不生效

**症状**：Scoped Styles 或预处理器样式不工作

**排查步骤**：

1. 检查样式是否被编译

   ```typescript
   // 查看 styles 输出
   const result = await compileSFC(code);
   console.log('Compiled styles:', result.styles);
   ```

2. 检查 scopeId

   ```javascript
   // 在浏览器控制台检查元素
   // 应该有 data-v-xxxxx 属性
   document.querySelector('.my-component').attributes;
   ```

3. 检查 CDN 加载
   ```javascript
   // 查看 less/sass 是否加载
   console.log(window.less, window.Sass);
   ```

### 4.4 HMR 不工作

**症状**：修改代码后页面不更新

**排查步骤**：

1. 检查 Webpack HMR 状态

   ```javascript
   // 在控制台查看
   __webpack_require__.c; // 模块缓存
   ```

2. 清除缓存重试

   ```bash
   rm -rf .dumi/tmp node_modules/.cache
   pnpm dev
   ```

3. 检查文件监听
   ```typescript
   // 在 handleWatcher 中添加日志
   handleWatcher: (watcher, { parse, patch }) => {
     watcher.on('all', (event, path) => {
       console.log('[Watcher]', event, path);
     });
   };
   ```

## 5. 单元测试

### 5.1 测试结构

```
packages/preset-vue2/
├── src/
│   └── __tests__/
│       ├── atomParser.test.ts
│       ├── compiler.test.ts
│       └── transformer.test.ts
```

### 5.2 运行测试

```bash
cd packages/preset-vue2

# 运行所有测试
pnpm test

# 运行特定测试
pnpm test atomParser

# 监听模式
pnpm test --watch
```

### 5.3 测试示例

```typescript
// atomParser.test.ts
import { transformComponentDoc } from '../atomParser/transformer';

describe('transformComponentDoc', () => {
  it('should extract props correctly', () => {
    const doc = {
      displayName: 'Button',
      props: [
        {
          name: 'type',
          type: { name: 'string' },
          defaultValue: { value: "'default'" },
          description: 'Button type',
          required: false,
        },
      ],
    };

    const result = transformComponentDoc(doc, '/path/to/Button.vue');

    expect(result.id).toBe('Button');
    expect(result.propsConfig.type.type).toBe('string');
    expect(result.propsConfig.type.default).toBe("'default'");
  });

  it('should extract PropType<T> generics', () => {
    // ...
  });
});
```

## 6. 发布流程

### 6.1 版本更新

```bash
cd packages/preset-vue2

# 更新版本号
npm version patch # 0.0.1 -> 0.0.2
npm version minor # 0.1.0 -> 0.2.0
npm version major # 1.0.0 -> 2.0.0
```

### 6.2 构建发布

```bash
# 构建所有产物
pnpm build && pnpm build:lib

# 发布到 npm
npm publish
```

### 6.3 PR 提交检查清单

- [ ] 代码通过 ESLint 检查
- [ ] 类型检查通过
- [ ] 单元测试通过
- [ ] 示例项目运行正常
- [ ] README 已更新（如有新功能）
- [ ] CHANGELOG 已更新

## 7. 目录导航

| 文件/目录             | 说明         | 修改频率 |
| --------------------- | ------------ | -------- |
| `src/index.ts`        | Preset 入口  | 低       |
| `src/atomParser/`     | API 提取     | 中       |
| `src/compiler/`       | 编译器       | 中       |
| `src/vue2/techStack/` | Tech Stack   | 高       |
| `src/vue2/runtime/`   | 浏览器运行时 | 高       |
| `src/vue2/webpack/`   | Webpack 配置 | 低       |

## 8. 推荐开发工具

### 8.1 VS Code 插件

- **Volar** - Vue 语言支持
- **TypeScript Vue Plugin** - Vue TS 支持
- **ESLint** - 代码检查
- **Prettier** - 代码格式化

### 8.2 浏览器插件

- **Vue.js devtools** - Vue 调试
- **React Developer Tools** - dumi 本身是 React

### 8.3 命令行工具

```bash
# 监听文件变化
npx nodemon --watch src -e ts,tsx --exec "pnpm build"

# 分析构建产物
npx webpack-bundle-analyzer dist/stats.json
```

---

下一篇：[使用指南](./08-USAGE.md)
