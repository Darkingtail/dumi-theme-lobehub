# @dumijs/preset-vue2

Vue 2 preset for dumi, enabling Vue 2 component documentation with Live Editing and API auto-extraction.

## Features

- **Vue 2.7 Support** - Full support for Vue 2.7 with Composition API
- **SFC Live Editing** - Edit `.vue` files in browser with real-time preview
- **TSX/JSX Live Editing** - Edit `.tsx/.jsx` files with Vue JSX syntax
- **API Auto-Extraction** - Automatically extract Props, Events, Slots, Methods from components
- **TypeScript Support** - Full TypeScript support with PropType<T> generic extraction
- **LESS/SCSS Support** - Style preprocessors in both build and live editing
- **Scoped Styles** - Support for scoped CSS in Vue SFCs
- **HMR** - Hot Module Replacement for fast development

## Installation

```bash
pnpm add @dumijs/preset-vue2
```

## Quick Start

Add the preset to your `.dumirc.ts`:

```typescript
import presetVue2 from '@dumijs/preset-vue2';
import { defineConfig } from 'dumi';

export default defineConfig({
  presets: [presetVue2()],
});
```

## Configuration

```typescript
import presetVue2 from '@dumijs/preset-vue2';
import { defineConfig } from 'dumi';

export default defineConfig({
  presets: [presetVue2()],
  vue2: {
    // JSX/TSX file matching rules
    jsxIncludes: true, // Match all JSX/TSX files (default)
    // jsxIncludes: ['/vue2/', '/vue2-'], // Match specific paths
    // jsxIncludes: [/\/components\/.*\.tsx$/], // Use RegExp

    // Custom CDN URLs for browser-side compilation
    compiler: {
      babelStandaloneCDN: 'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.22.17/babel.min.js',
      lessCDN: 'https://cdn.bootcdn.net/ajax/libs/less.js/4.2.0/less.min.js',
      sassCDN: 'https://cdn.jsdelivr.net/npm/sass.js@0.11.1/dist/sass.sync.min.js',
    },

    // Additional modules available in live editing
    resolveMap: ['element-ui', 'lodash'],
  },
});
```

### Configuration Options

| Option                        | Type                           | Default  | Description                         |
| ----------------------------- | ------------------------------ | -------- | ----------------------------------- |
| `jsxIncludes`                 | `true \| (string \| RegExp)[]` | `true`   | JSX/TSX file matching rules         |
| `compiler.babelStandaloneCDN` | `string`                       | bootcdn  | Babel standalone CDN URL            |
| `compiler.lessCDN`            | `string`                       | bootcdn  | LESS compiler CDN URL               |
| `compiler.sassCDN`            | `string`                       | jsdelivr | Sass.js CDN URL                     |
| `resolveMap`                  | `string[]`                     | `[]`     | Additional modules for live editing |

## API Documentation

### Automatic API Extraction

The preset automatically extracts component API from Vue 2 components:

```vue
<script lang="ts">
import Vue, { PropType } from 'vue';

interface User {
  id: number;
  name: string;
}

export default Vue.extend({
  name: 'MyComponent',
  props: {
    /**
     * User object
     */
    user: {
      type: Object as PropType<User>,
      required: true,
    },
    /**
     * Button size
     */
    size: {
      type: String,
      default: 'medium',
      validator: (v) => ['small', 'medium', 'large'].includes(v),
    },
  },
  methods: {
    /**
     * Focus the input
     * @public
     */
    focus() {
      this.$refs.input.focus();
    },
  },
});
</script>
```

### Using API Tables

Display component API in your documentation:

```markdown
## Props

<API id="MyComponent" type="props"></API>

## Events

<API id="MyComponent" type="events"></API>

## Slots

<API id="MyComponent" type="slots"></API>

## Methods

<API id="MyComponent" type="imperative"></API>
```

### Supported Features

| Feature    | Support | Notes                                             |
| ---------- | ------- | ------------------------------------------------- |
| Props      | ✅      | Type, default, required, description, enum values |
| Events     | ✅      | Event name, arguments with types                  |
| Slots      | ✅      | Named slots, scoped slot bindings                 |
| Methods    | ✅      | Public methods (use `@public` or `@expose` tag)   |
| TypeScript | ✅      | PropType<T> generic extraction                    |
| JSDoc Tags | ✅      | @deprecated, @since, @version, @author            |

### TypeScript Support

The preset extracts TypeScript types from `PropType<T>`:

```typescript
// Extracted as { type: "reference", name: "User" }
user: {
  type: Object as PropType<User>;
}

// Extracted as { type: "array", items: { type: "reference", name: "User" } }
users: {
  type: Array as PropType<User[]>;
}

// Extracted as { type: "function", signature: {...} }
onSelect: {
  type: Function as PropType<(user: User) => void>;
}
```

## Writing Demos

### Vue SFC Demo

````markdown
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

<style scoped lang="less">
div {
  color: blue;
}
</style>
```
````

### TSX/JSX Demo

````markdown
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
````

> **Important**: When using TSX/JSX with Composition API `setup()`, you must explicitly import `h` from `vue`.

## Vue JSX Syntax

This preset uses `@vue/babel-preset-jsx`. Key syntax differences from React JSX:

| Feature | Vue JSX                                         | React JSX                |
| ------- | ----------------------------------------------- | ------------------------ |
| Props   | `props={{ value: 'foo' }}`                      | `value="foo"`            |
| Events  | `on={{ click: handler }}`                       | `onClick={handler}`      |
| v-model | `props={{ value }} on={{ input: setValue }}`    | N/A                      |
| Slots   | `<Button>{{ default: () => 'Click' }}</Button>` | `<Button>Click</Button>` |

## Style Preprocessors

Both LESS and SCSS/SASS are supported:

```vue
<style scoped lang="less">
@primary-color: #1890ff;

.button {
  color: @primary-color;
}
</style>
```

```vue
<style scoped lang="scss">
$primary-color: #1890ff;

.button {
  color: $primary-color;
}
</style>
```

## Known Limitations

| Feature              | Status | Notes                                 |
| -------------------- | ------ | ------------------------------------- |
| `<style module>`     | ❌     | CSS Modules not supported             |
| Pug templates        | ❌     | Only HTML templates                   |
| Custom blocks        | ❌     | Only template/script/style            |
| Class Component      | ❌     | vue-class-component not supported yet |
| Mixins documentation | ❌     | Mixin props not extracted             |

## Comparison with @dumijs/preset-vue

| Feature        | preset-vue2         | preset-vue               |
| -------------- | ------------------- | ------------------------ |
| Vue Version    | 2.6 - 2.7           | 3.x                      |
| API Extraction | vue-docgen-api      | @dumijs/vue-meta         |
| TypeScript     | PropType<T> parsing | Full TS language service |
| Live Editing   | ✅                  | ✅                       |
| HMR            | ✅                  | ✅                       |
| LESS/SCSS      | ✅ (with CDN)       | ✅                       |

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
│   ├── atomParser/         # API extraction
│   │   ├── index.ts        # Vue2MetaParser class
│   │   ├── transformer.ts  # Component doc transformer
│   │   └── types.ts        # TypeScript interfaces
│   ├── compiler/           # SFC/TSX compiler
│   │   ├── browser.ts      # Browser-side compiler
│   │   ├── node.ts         # Node.js compiler
│   │   └── shared.ts       # Shared utilities
│   ├── vue2/
│   │   ├── techStack/      # dumi tech stack
│   │   ├── webpack/        # Webpack config
│   │   └── runtime/        # Browser runtime
│   └── index.ts            # Main entry
├── dist/                   # Compiled Node.js code
└── lib/                    # Compiled browser runtime
```

## Roadmap

See [.docs/TODOS.md](./.docs/TODOS.md) for development roadmap and planned features.

## License

MIT
