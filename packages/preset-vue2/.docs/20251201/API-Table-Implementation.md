# preset-vue2 API Table 功能开发文档

## 概述

为 `@dumijs/preset-vue2` 包实现 API Table 自动解析功能，支持从 Vue 2 组件源码中自动提取 Props、Events、Slots、Methods 等文档信息，并在 dumi 文档站点中以表格形式展示。

---

## 一、技术需求

### 1.1 功能需求

| 功能         | 描述                                            |
| ------------ | ----------------------------------------------- |
| Props 解析   | 从 Vue 2 组件中提取属性定义、类型、默认值、描述 |
| Events 解析  | 提取组件 `$emit` 的事件及其参数说明             |
| Slots 解析   | 提取模板中定义的插槽及其描述                    |
| Methods 解析 | 提取公开方法（标记 `@public`）供外部调用        |
| 热更新支持   | 组件修改后自动更新 API 文档                     |

### 1.2 兼容性需求

- 支持 Vue 2.7.x SFC 单文件组件
- 支持 Options API (`export default {}`)
- 支持 `Vue.extend()` 写法
- 支持 `defineComponent()` 写法
- 支持 JSX/TSX 组件

### 1.3 使用方式

```markdown
<!-- 显示 Props -->

<API id="Button" type="props"></API>

<!-- 显示 Events -->

<API id="Button" type="events"></API>

<!-- 显示 Slots -->

<API id="Button" type="slots"></API>

<!-- 显示 Methods -->

<API id="Button" type="imperative"></API>
```

---

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      dumi 文档框架                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │  .dumirc.ts │───▶│ atomParser  │───▶│ atoms.ts 输出   │ │
│  │  配置入口    │    │  解析器注册  │    │ (元数据文件)    │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Vue2AtomAssetsParser                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ 文件扫描    │  │ vue-docgen  │  │ transformer │  │   │
│  │  │ (glob)     │─▶│   -api      │─▶│  转换器     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块

```
packages/preset-vue2/src/atomParser/
├── index.ts          # 解析器入口，注册到 dumi
├── transformer.ts    # 数据转换器，vue-docgen-api → dumi 格式
└── types.ts          # TypeScript 类型定义
```

### 2.3 数据流

```
Vue 组件源码
    │
    ▼ (vue-docgen-api 解析)
ComponentDoc {
  props, events, slots, methods, ...
}
    │
    ▼ (transformer 转换)
AtomComponentAsset {
  propsConfig, eventsConfig, slotsConfig, imperativeConfig
}
    │
    ▼ (dumi 输出)
.dumi/tmp/dumi/meta/atoms.ts
    │
    ▼ (dumi <API> 组件渲染)
API Table 表格展示
```

---

## 三、技术要点

### 3.1 解析器实现 (Vue2MetaParser)

```typescript
// packages/preset-vue2/src/atomParser/index.ts

export class Vue2MetaParser implements ILanguageMetaParser {
  private entryFile: string;
  private resolveDir: string;
  private components: Map<string, AtomComponentAsset> = new Map();

  async parse(): Promise<IAtomAssetsParserResult> {
    // 1. 扫描入口文件获取导出的组件
    // 2. 使用 vue-docgen-api 解析每个组件
    // 3. 转换为 dumi 格式
    return { components: Object.fromEntries(this.components) };
  }

  patch(file: IPatchFile): void {
    // 热更新：文件变化时增量更新
  }
}
```

### 3.2 数据转换器 (transformer)

#### Props 转换

```typescript
function transformProps(props: PropDescriptor[]): ObjectPropertySchema {
  const properties: Record<string, PropertySchema> = {};

  for (const prop of props) {
    properties[prop.name] = {
      type: convertType(prop.type), // string/number/boolean/...
      title: prop.name,
      description: prop.description, // JSDoc 描述
      default: parseDefaultValue(prop.defaultValue),
      enum: extractEnumValues(prop.type), // 联合类型枚举值
      className: prop.type?.name, // 原始类型名
    };
  }

  return { type: 'object', properties };
}
```

#### Events 转换

```typescript
function transformEvents(events: EventDescriptor[]): ObjectPropertySchema {
  // 事件签名格式: (arg1, arg2) => void
  const properties: Record<string, PropertySchema> = {};

  for (const event of events) {
    const args = event.properties?.map((p) => p.name).join(', ') || '';
    properties[event.name] = {
      type: 'function',
      description: event.description,
      className: `(${args}) => void`,
    };
  }

  return { type: 'object', properties };
}
```

#### Slots 转换

```typescript
function transformSlots(slots: SlotDescriptor[]): ObjectPropertySchema {
  // 插槽绑定格式: { binding1, binding2 }
  const properties: Record<string, PropertySchema> = {};

  for (const slot of slots) {
    const bindings = slot.bindings?.map((b) => b.name).join(', ');
    properties[slot.name] = {
      type: 'object',
      description: slot.description,
      className: bindings ? `{ ${bindings} }` : undefined,
    };
  }

  return { type: 'object', properties };
}
```

#### Methods 转换 (Imperative API)

```typescript
function transformMethods(methods: MethodDescriptor[]): ObjectPropertySchema {
  // 只转换标记 @public 的方法
  const properties: Record<string, PropertySchema> = {};

  for (const method of methods) {
    const params = method.params?.map((p) => `${p.name}: ${p.type?.name || 'any'}`).join(', ');
    const returnType = method.returns?.type?.name || 'void';

    properties[method.name] = {
      type: 'function',
      description: method.description,
      className: `(${params || ''}) => ${returnType}`,
    };
  }

  return { type: 'object', properties };
}
```

### 3.3 插件注册

```typescript
// packages/preset-vue2/src/vue2/index.ts

api.onCheckPkgJSON(async () => {
  if (!api.config.apiParser) return;

  // 注册自定义 atomParser
  api.service.atomParser = new Vue2AtomAssetsParser({
    entryFile: resolve(api.cwd, api.config.resolve?.entryFile || './src/index.ts'),
    resolveDir: api.cwd,
    resolveFilter: apiParserConfig.resolveFilter,
    parseOptions: apiParserConfig.parseOptions,
    unpkgHost: apiParserConfig.unpkgHost,
  });

  console.log('[preset-vue2] Vue 2 atomParser registered');
});
```

### 3.4 Vue 组件注释规范

```vue
<template>
  <!-- @slot icon - 图标插槽 -->
  <slot name="icon"></slot>
  <!-- @slot default - 默认内容插槽 -->
  <slot>{{ text }}</slot>
</template>

<script>
/**
 * 按钮组件
 * @displayName Button
 */
export default {
  name: 'Button',
  props: {
    /**
     * 按钮类型
     * @values primary, secondary, danger
     */
    type: {
      type: String,
      default: 'primary',
    },
  },
  methods: {
    /**
     * 聚焦按钮
     * @public
     */
    focus() {
      this.$refs.buttonRef?.focus();
    },

    handleClick(event) {
      /**
       * 点击事件
       * @event click
       * @param {MouseEvent} event - 鼠标事件对象
       */
      this.$emit('click', event);
    },
  },
};
</script>
```

---

## 四、技术难点

### 4.1 vue-docgen-api 与 dumi 类型系统对接

**问题**: vue-docgen-api 输出的 `ComponentDoc` 与 dumi 的 `AtomComponentAsset` 结构不同。

**解决方案**: 实现 `transformer.ts` 进行数据结构映射：

| vue-docgen-api | dumi AtomComponentAsset       |
| -------------- | ----------------------------- |
| `props`        | `propsConfig.properties`      |
| `events`       | `eventsConfig.properties`     |
| `slots`        | `slotsConfig.properties`      |
| `methods`      | `imperativeConfig.properties` |

### 4.2 @public 标签解析

**问题**: vue-docgen-api 将 `@public` 解析为 `tags.access` 而非 `tags.public`。

```javascript
// vue-docgen-api 输出
method.tags = {
  access: [{ description: 'public', title: 'access' }],
};

// 而非期望的
method.tags = { public: true };
```

**解决方案**: 修改过滤逻辑：

```typescript
const publicMethods = doc.methods.filter((method) => {
  const accessTags = method.tags?.access as Array<{ description?: string }>;
  return accessTags?.some((a) => a.description === 'public');
});
```

### 4.3 dumi BaseAtomAssetsParser 集成

**问题**: dumi 的 `BaseAtomAssetsParser` 需要特定接口实现，且文件监听类型不兼容。

**解决方案**:

1. 实现 `ILanguageMetaParser` 接口
2. 使用 `any` 类型绑定 chokidar watcher

```typescript
export class Vue2AtomAssetsParser extends BaseAtomAssetsParser<Vue2MetaParser> {
  constructor(opts: Vue2MetaParserOptions) {
    super({
      ...opts,
      parser: new Vue2MetaParser(opts),
      handleWatcher: (watcher: any, { parse, patch, watchArgs }: any) => {
        watcher
          .on('add', (path: string) => patch({ event: 'add', path }))
          .on('change', (path: string) => patch({ event: 'change', path }))
          .on('unlink', (path: string) => patch({ event: 'unlink', path }));
      },
    });
  }
}
```

### 4.4 PropertySchema 类型约束

**问题**: dumi 的 `PropertySchema` 是联合类型，包含 `ReferencePropertySchema` 需要 `$ref` 属性。

**解决方案**: 使用类型断言：

```typescript
const schema: PropertySchema = {
  type: propType || 'string',
} as PropertySchema;
```

### 4.5 第三方组件库限制

**问题**: 无法解析 Element UI 等第三方组件库的 API。

**原因**: vue-docgen-api 需要访问组件源码，而第三方库发布的是编译后的代码。

**结论**: API Table 功能仅适用于项目内部定义的组件。

---

## 五、配置说明

### 5.1 .dumirc.ts 配置

```typescript
export default {
  // 启用 API 解析
  apiParser: {},

  // 指定组件入口文件
  resolve: {
    entryFile: './src/index.ts',
  },

  // 使用 Vue 2 preset
  presets: [require.resolve('@dumijs/preset-vue2')],
};
```

### 5.2 组件入口文件

```typescript
// src/index.ts
export { default as Button } from './components/Button.vue';
export { default as Input } from './components/Input.vue';
```

### 5.3 文档使用

```markdown
## Button API

### Props

<API id="Button" type="props"></API>

### Events

<API id="Button" type="events"></API>

### Slots

<API id="Button" type="slots"></API>

### Methods

<API id="Button" type="imperative"></API>
```

---

## 六、输出示例

### 6.1 生成的 atoms.ts

```typescript
// .dumi/tmp/dumi/meta/atoms.ts
export const components = {
  Button: {
    id: 'Button',
    title: 'Button',
    type: 'COMPONENT',
    propsConfig: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: '按钮类型',
          default: "'primary'",
          className: 'string',
        },
      },
    },
    eventsConfig: {
      type: 'object',
      properties: {
        click: {
          type: 'function',
          description: '点击事件',
          className: '(event) => void',
        },
      },
    },
    slotsConfig: {
      type: 'object',
      properties: {
        default: {
          type: 'object',
          description: '默认内容插槽',
        },
      },
    },
    imperativeConfig: {
      type: 'object',
      properties: {
        focus: {
          type: 'function',
          description: '聚焦按钮',
          className: '() => void',
        },
      },
    },
  },
};
```

---

## 七、依赖说明

| 依赖包            | 版本     | 用途               |
| ----------------- | -------- | ------------------ |
| vue-docgen-api    | ^4.79.2  | Vue 组件文档解析   |
| glob              | ^10.3.10 | 文件模式匹配       |
| chokidar          | ^3.5.3   | 文件监听（热更新） |
| dumi-assets-types | ^2.4.14  | dumi 类型定义      |

---

## 八、文件清单

| 文件路径                        | 描述             |
| ------------------------------- | ---------------- |
| `src/atomParser/index.ts`       | 解析器主入口     |
| `src/atomParser/transformer.ts` | 数据转换器       |
| `src/atomParser/types.ts`       | 类型定义         |
| `src/vue2/index.ts`             | 插件注册（更新） |

---

## 九、后续优化

1. **类型推断增强**: 支持从 TypeScript 类型定义中提取更精确的类型信息
2. **缓存优化**: 添加解析结果缓存，提升大型项目构建速度
3. **错误提示**: 组件解析失败时提供友好的错误信息
4. **自定义模板**: 支持自定义 API Table 渲染模板

---

## 十、参考资料

- [dumi 官方文档](https://d.umijs.org/)
- [vue-docgen-api](https://github.com/vue-styleguidist/vue-styleguidist/tree/dev/packages/vue-docgen-api)
- [dumi-assets-types](https://github.com/umijs/dumi/tree/master/packages/dumi-assets-types)
- [preset-vue (Vue 3 版本)](https://github.com/nicepkg/dumi-plugin-vue)
