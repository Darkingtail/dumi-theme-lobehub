---
title: React Demos
nav:
  title: React Demos
  order: 2
---

# React TSX Demos

These demos are React components located in `/react-demos/` folder.

When `jsxIncludes` is configured to only include `vue2demo`, these files will NOT be processed by the Vue 2 preset, and will be handled by dumi's default React tech stack instead.

## React Button Demo

<code src="./demos/ReactButton.tsx"></code>

## React Counter Demo

<code src="./demos/ReactCounter.tsx"></code>

---

## jsxIncludes Configuration

Current configuration in `.dumirc.ts`:

```ts
vue2: {
  jsxIncludes: ['vue2demo'],  // Only process TSX files in paths containing 'vue2demo'
}
```

This means:

- `/docs/vue2demo/demos/*.tsx` - **Processed by Vue 2 preset**
- `/docs/react-demos/demos/*.tsx` - **NOT processed by Vue 2 preset** (uses React)
