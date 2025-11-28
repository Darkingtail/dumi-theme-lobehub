import { babelCore, babelPresetEnv, babelPresetTypeScript } from 'dumi/tech-stack-utils';

import { COMP_IDENTIFIER, type CompileOptions, createCompiler } from './index';

const babel = babelCore();
const env = babelPresetEnv();
const typescript = babelPresetTypeScript();

export const compiler: ReturnType<typeof createCompiler> = createCompiler({
  availablePlugins: {
    // Use custom fixed JSX plugin instead of official one
    // The official @vue/babel-plugin-transform-vue-jsx has a bug with on:click syntax
    // See: compiled/vue2-jsx-plugin.js for details
    'vue2-jsx-fixed': require.resolve('../compiled/vue2-jsx-plugin'),
  },
  availablePresets: {
    env,
    typescript,
    // Vue 2 JSX sugar plugins
    // Note: Using custom transform plugin to fix on:click bug
    'vue2-jsx': {
      plugins: [
        require.resolve('@vue/babel-sugar-functional-vue'),
        require.resolve('@vue/babel-sugar-v-model'),
        require.resolve('@vue/babel-sugar-v-on'),
        'vue2-jsx-fixed', // Use our fixed plugin instead of @vue/babel-plugin-transform-vue-jsx
      ],
    },
  },
  babel,
});

export function compile(options: CompileOptions) {
  const { id, filename, code } = options;
  const [, lang] = filename.match(/[^.]+\.([^.]+)$/) || [];

  if (['js', 'jsx', 'ts', 'tsx'].includes(lang)) {
    let result = compiler.transformTS(code, filename, { lang });

    // For JSX/TSX files, inject h import at the top if not already present
    // This is needed because with injectH: false, users must have h in scope
    if ((lang === 'jsx' || lang === 'tsx') && result) {
      // Check if h is in the import
      const hasHInImport = /import\s*{[^}]*\bh\b[^}]*}\s*from\s*["']vue["']/.test(result);

      if (!hasHInImport) {
        // Find the first import from 'vue' and add h to it
        const vueImportMatch = result.match(/import\s*{([^}]+)}\s*from\s*["']vue["']/);
        if (vueImportMatch) {
          result = result.replace(
            /import\s*{([^}]+)}\s*from\s*["']vue["']/,
            `import { h, $1 } from 'vue'`,
          );
        } else {
          // No vue import found, add one at the top
          result = `import { h } from 'vue';\n${result}`;
        }
      }
    }

    return result;
  }

  const compiled = compiler.compileSFC(options);

  if (Array.isArray(compiled)) {
    return compiled;
  }

  let { js, css } = compiled;

  // Insert css and id before the export default statement
  const exportMatch = js.match(/\nexport default/);
  if (exportMatch && exportMatch.index !== undefined) {
    let insertions = '';
    if (css) {
      insertions += `\n${COMP_IDENTIFIER}.__css__ = ${JSON.stringify(css)};`;
    }
    insertions += `\n${COMP_IDENTIFIER}.__id__ = "${id}";`;
    insertions += `\n${COMP_IDENTIFIER}.name = "${id}";`;
    js = js.slice(0, exportMatch.index) + insertions + js.slice(exportMatch.index);
  }

  return js;
}
