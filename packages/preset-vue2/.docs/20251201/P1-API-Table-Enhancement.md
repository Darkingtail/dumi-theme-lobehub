# P1 API Table Enhancement

> Date: 2025-12-01
> Goal: Enhance API Table parsing capabilities

---

## Overview

| Enhancement                    | Status  | File             |
| ------------------------------ | ------- | ---------------- |
| Enum values from validator     | ✅ Done | `transformer.ts` |
| JSDoc tags enhancement         | ✅ Done | `transformer.ts` |
| Methods extraction improvement | ✅ Done | `transformer.ts` |

---

## 1. Enum Values from Validator

### Problem

Vue 2 components often use validator functions to define valid prop values:

```javascript
props: {
  type: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger'].includes(v)
  }
}
```

Previously, these enum values were not extracted.

### Solution

`vue-docgen-api` extracts validator enum values into `prop.values`. We now prioritize this field.

### Code Change

```typescript
// P1 Enhancement: First check prop.values (from validator function)
const propWithValues = prop as PropDescriptor & { values?: string[] };
if (propWithValues.values && Array.isArray(propWithValues.values)) {
  return propWithValues.values;
}
```

---

## 2. JSDoc Tags Enhancement

### Supported Tags

| Tag           | Purpose                              | Display Location      |
| ------------- | ------------------------------------ | --------------------- |
| `@deprecated` | Mark component as deprecated         | Badge in API table    |
| `@since`      | Version when feature was added       | Component description |
| `@version`    | Current version                      | Component description |
| `@author`     | Author info                          | Component description |
| `@keywords`   | Search keywords                      | Component metadata    |
| `@public`     | Mark method as public                | Methods table         |
| `@expose`     | Mark method as exposed (Vue 3 style) | Methods table         |

### Example Usage

```vue
<script>
/**
 * A customizable button component
 * @displayName MyButton
 * @since 1.0.0
 * @version 2.1.0
 * @author John Doe
 * @deprecated Use NewButton instead
 */
export default {
  name: 'MyButton',
  methods: {
    /**
     * Focus the button element
     * @public
     */
    focus() {
      this.$refs.button.focus();
    },
  },
};
</script>
```

---

## 3. Methods Extraction Improvement

### Previous Behavior

Only methods with `@public` tag were extracted.

### New Behavior

Methods are now extracted if they meet ANY of these criteria:

1. Marked with `@public` tag
2. Marked with `@expose` tag (Vue 3 style, but useful for Vue 2)
3. Have JSDoc description (documented = intended to be public)

### Code Change

```typescript
const publicMethods = doc.methods.filter((method) => {
  // Check for @public tag
  const accessTags = method.tags?.access;
  if (accessTags?.some((a) => a.description === 'public')) return true;

  // Check for @expose tag
  const exposeTags = method.tags?.expose;
  if (exposeTags && exposeTags.length > 0) return true;

  // Check if method has JSDoc description
  if (method.description && method.description.trim().length > 0) return true;

  return false;
});
```

---

## Known Limitations

### Features NOT Supported by vue-docgen-api

| Feature      | Status           | Reason                                           |
| ------------ | ---------------- | ------------------------------------------------ |
| `mixins`     | ❌ Not supported | vue-docgen-api doesn't extract mixins info       |
| `filters`    | ❌ Not supported | vue-docgen-api doesn't extract filters           |
| `directives` | ❌ Not supported | vue-docgen-api doesn't extract custom directives |

These are Vue 2 specific features that would require custom parsing logic.

### Workaround for Unsupported Features

If you need to document mixins, filters, or directives, use JSDoc comments in the component description:

```vue
<script>
/**
 * MyComponent
 *
 * ## Mixins Used
 * - `validationMixin` - Form validation helpers
 * - `themeMixin` - Theme-related computed properties
 *
 * ## Available Filters
 * - `capitalize(value)` - Capitalizes the first letter
 * - `formatDate(date, format)` - Formats date
 *
 * ## Custom Directives
 * - `v-focus` - Auto-focus element on mount
 */
export default {
  // ...
};
</script>
```

---

## Best Practices

### 1. Always add JSDoc to props

```javascript
props: {
  /** Button type variant */
  type: {
    type: String,
    default: 'primary'
  }
}
```

### 2. Use validator for enum props

```javascript
props: {
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  }
}
```

### 3. Document public methods

```javascript
methods: {
  /**
   * Programmatically focus the input
   * @public
   */
  focus() {
    this.$refs.input.focus();
  }
}
```

### 4. Use @deprecated for legacy components

```javascript
/**
 * @deprecated Use NewButton instead
 */
export default {
  // ...
};
```

---

## Testing

1. Create a component with:
   - Props with validator functions
   - JSDoc tags (@since, @version, @author)
   - Documented methods

2. Enable apiParser in dumi config:

```typescript
export default {
  apiParser: {},
  resolve: {
    entryFile: './src/index.ts',
  },
};
```

3. Check the generated API table in the documentation

---

## Files Changed

| File                            | Change                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| `src/atomParser/transformer.ts` | Enhanced enum extraction, JSDoc handling, methods filtering |
