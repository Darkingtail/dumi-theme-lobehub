# @dumijs/preset-vue2

Vue 2 preset for dumi, enabling Vue 2 component documentation with Live Editing support.

## Features

- **Vue 2.7 Support** - Full support for Vue 2.7 with Composition API
- **SFC Live Editing** - Edit `.vue` files in browser with real-time preview
- **TSX/JSX Live Editing** - Edit `.tsx/.jsx` files with Vue JSX syntax
- **TypeScript Support** - Full TypeScript support in both SFC and TSX
- **Scoped Styles** - Support for scoped CSS in Vue SFCs
- **Element UI Compatible** - Works with Element UI and other Vue 2 component libraries

## Installation

```bash
pnpm add @dumijs/preset-vue2
```

## Usage

Add the preset to your `.dumirc.ts`:

```typescript
import presetVue2 from '@dumijs/preset-vue2';
import { defineConfig } from 'dumi';

export default defineConfig({
  presets: [presetVue2()],
  // ...other config
});
```

## Writing Demos

### Vue SFC Demo

```vue
<template>
  <div>{{ message }}</div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  setup() {
    const message = ref('Hello Vue 2!');
    return { message };
  },
});
</script>

<style scoped>
div {
  color: blue;
}
</style>
```

### TSX/JSX Demo

```tsx
import { defineComponent, h, ref } from 'vue';

export default defineComponent({
  name: 'MyComponent',
  setup() {
    const count = ref(0);

    return () => (
      <div>
        <p>Count: {count.value}</p>
        <button on={{ click: () => count.value++ }}>+1</button>
      </div>
    );
  },
});
```

> **Important**: When using TSX/JSX with Composition API `setup()`, you must explicitly import `h` from `vue`.

## Vue JSX Syntax

This preset uses `@vue/babel-preset-jsx` with `injectH: false`. Key syntax differences from React JSX:

| Feature | Vue JSX                                         | React JSX                |
| ------- | ----------------------------------------------- | ------------------------ |
| Props   | `props={{ value: 'foo' }}`                      | `value="foo"`            |
| Events  | `on={{ click: handler }}`                       | `onClick={handler}`      |
| v-model | `props={{ value }} on={{ input: setValue }}`    | N/A                      |
| Slots   | `<Button>{{ default: () => 'Click' }}</Button>` | `<Button>Click</Button>` |

## Development

### Build Commands

```bash
# Build Node.js code (dumi plugin, webpack config)
pnpm build

# Build browser runtime (compiler, renderer)
pnpm build:lib

# Build both
pnpm build && pnpm build:lib
```

### Project Structure

```
packages/preset-vue2/
├── src/
│   ├── compiler/           # SFC/TSX compiler
│   │   ├── browser.ts      # Browser-side compiler (Live Editing)
│   │   ├── node.ts         # Node.js compiler (build time)
│   │   └── index.ts        # Shared compiler logic
│   ├── vue2/
│   │   ├── techStack/      # dumi tech stack definitions
│   │   │   ├── sfc.ts      # Vue SFC tech stack
│   │   │   └── jsx.ts      # Vue TSX/JSX tech stack
│   │   ├── webpack/        # Webpack configuration
│   │   │   └── config.ts   # Vue 2 webpack rules
│   │   └── runtime/        # Browser runtime
│   │       ├── renderer.ts # Vue 2 component renderer
│   │       └── preflight.ts # Runtime initialization
│   └── index.ts            # Main entry point
├── dist/                   # Compiled Node.js code
├── lib/                    # Compiled browser runtime
└── docs/                   # Development documentation
```

## Technical Notes

### Babel Preset Order

Babel presets execute in **reverse order**. For Vue 2 TSX:

1. TypeScript preset runs first (strips type annotations)
2. Vue JSX preset runs second (transforms JSX to `h()` calls)

```javascript
presets: [
  ['@vue/babel-preset-jsx', { injectH: false }], // runs 2nd
  ['@babel/preset-typescript', { isTSX: true }], // runs 1st
];
```

### injectH: false

The `injectH: false` option is critical for Composition API. Without it, the plugin injects:

```javascript
const h = this.$createElement; // Fails in setup() where this is undefined
```

With `injectH: false`, users must import `h` explicitly:

```javascript
import { h } from 'vue';

// Works in both Options API and Composition API
```

## License

MIT
