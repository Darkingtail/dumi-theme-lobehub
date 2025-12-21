# vue2-jsx-browser

Browser-compatible Vue 2 JSX Babel plugins for use with @babel/standalone.

## Features

- Fixed version of `@vue/babel-plugin-transform-vue-jsx` (handles `on:click` bug)
- Bundled sugar plugins (v-model, v-on, functional)
- Works with @babel/standalone in browser
- ESM and CommonJS support

## Installation

```bash
npm install vue2-jsx-browser
# or
pnpm add vue2-jsx-browser
```

## Usage

### With @babel/standalone

```javascript
import { transform } from '@babel/standalone';
import { createVue2JsxPreset } from 'vue2-jsx-browser';

const jsxPreset = createVue2JsxPreset(null, {});

const result = transform(code, {
  plugins: jsxPreset.plugins,
  presets: [['typescript', { isTSX: true, allExtensions: true }]],
});
```

### Individual Plugins

```javascript
import {
  babelPluginTransformVueJsx,
  babelSugarFunctionalVue,
  babelSugarVModel,
  babelSugarVOn,
} from 'vue2-jsx-browser';
```

## Options

```typescript
interface Vue2JsxPresetOptions {
  functional?: boolean; // Enable functional component sugar (default: true)
  vModel?: boolean; // Enable v-model sugar (default: true)
  vOn?: boolean; // Enable v-on sugar (default: true)
}
```

## License

MIT
