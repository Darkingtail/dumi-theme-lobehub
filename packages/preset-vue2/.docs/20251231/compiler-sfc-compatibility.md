# Vue 2.7 vs Vue 3 compiler-sfc 选型决策

> 日期: 2025-12-31
>
> 状态: 已决策

## 问题背景

preset-vue2 使用 `@vue/compiler-sfc` 来编译 Vue SFC 文件，存在两个选择：

- **Vue 2.7 的 compiler-sfc**: 完整支持 Vue 2 语法
- **Vue 3 的 compiler-sfc**: 支持 `<script setup>` 但不支持部分 Vue 2 语法

## 关键权衡

### Vue 3 compiler-sfc 不支持的 Vue 2 特性

| 特性    | Vue 2 写法                    | Vue 3 状态 | 替代方案                         |
| ------- | ----------------------------- | ---------- | -------------------------------- |
| Filters | `{{ msg \| capitalize }}`     | **已移除** | 方法调用 `{{ capitalize(msg) }}` |
| .sync   | `<child :value.sync="val" />` | **已移除** | 显式写法或 `v-model:value`       |
| .native | `@click.native="fn"`          | **已移除** | 组件内部正确处理事件透传         |

### Vue 2.7 compiler-sfc 的问题

**没有浏览器版本！** 内部依赖 `consolidate.js`，需要 Node.js 的 `fs`、`path` 模块。

这意味着：

- Node 端可以用 ✅
- Browser 端（Live Editing）不能用 ❌

## 最终决策

**使用 Vue 3 的 `@vue/compiler-sfc`**

理由：

1. **`<script setup>` 是 Vue 3 迁移的核心**
   - Composition API + `<script setup>` 是 Vue 3 的主流写法
   - 不支持它会严重阻碍未来迁移

2. **Filters、.sync、.native 在 Vue 3 中已被移除**
   - 用户迁移 Vue 3 时本来就要改
   - 不支持它们反而能强制用户写出 Vue 3 兼容的代码

3. **替代方案简单且清晰**
   - Filters → 方法调用（更直观）
   - .sync → 显式写法（语义更清晰）
   - .native → 正确的组件设计

## 替代方案详解

### Filters → 方法调用

```vue
<!-- ❌ Vue 2 Filters (不支持) -->
<template>
  {{ price | currency }}
  {{ date | formatDate('YYYY-MM-DD') }}
</template>

<!-- ✅ 替代方案 (Vue 2/3 通用) -->
<template>
  {{ formatCurrency(price) }}
  {{ formatDate(date, 'YYYY-MM-DD') }}
</template>

<script>
export default {
  methods: {
    formatCurrency(val) {
      return `$${val.toFixed(2)}`;
    },
    formatDate(date, format) {
      // ...
    },
  },
};
</script>
```

### .sync → 显式写法

```vue
<!-- ❌ Vue 2 .sync (不支持) -->
<child :value.sync="parentValue" />

<!-- ✅ 替代方案 (Vue 2/3 通用) -->
<child :value="parentValue" @update:value="(val) => (parentValue = val)" />

<!-- ✅ Vue 3 写法 (迁移时使用) -->
<child v-model:value="parentValue" />
```

### .native → 组件设计优化

```vue
<!-- ❌ Vue 2 .native (不支持) -->
<my-button @click.native="handleClick" />

<!-- ✅ 替代方案: 组件内部正确透传 -->
<!-- MyButton.vue -->
<template>
  <button v-on="$listeners">
    <slot />
  </button>
</template>

<!-- 使用时直接 @click -->
<my-button @click="handleClick" />
```

## 架构说明

```
┌────────────────────────────────────────────────────────────┐
│                        preset-vue2                         │
├────────────────────────────────────────────────────────────┤
│  使用 @vue/compiler-sfc@3.x                                │
│                                                            │
│  ✅ 支持:                      ❌ 不支持:                  │
│  - <script setup>              - {{ x | filter }}          │
│  - TypeScript                  - :prop.sync                │
│  - Composition API             - @event.native             │
│  - Scoped CSS                                              │
│  - LESS/SCSS                   这些是 Vue 3 移除的特性     │
│                                使用替代方案更利于迁移      │
└────────────────────────────────────────────────────────────┘
```

## 结论

**不支持 Filters、.sync、.native 不是限制，而是特性。**

这些语法在 Vue 3 中已被移除，preset-vue2 的目标是帮助用户：

1. 用 Vue 2.7 写代码
2. 日后以极小成本迁移到 Vue 3

强制使用 Vue 3 兼容的写法，才是正确的方向。
