/**
 * Babel plugin to auto-inject `h` import from vue for JSX/TSX files
 *
 * When using @vue/babel-preset-jsx with injectH: false (required for Composition API),
 * users need to manually import { h } from 'vue'. This plugin does it automatically.
 *
 * Note: This plugin uses `any` types for Babel AST nodes because:
 * 1. The full @babel/types package is large and unnecessary for this simple plugin
 * 2. Babel's AST structure is complex and varies across versions
 * 3. The plugin only manipulates import declarations which have a stable structure
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BabelPath = any;

export default function babelPluginVueH(): {
  name: string;
  visitor: {
    Program: {
      exit: (path: BabelPath) => void;
    };
  };
} {
  return {
    name: 'babel-plugin-vue-h',
    visitor: {
      Program: {
        exit(path: BabelPath) {
          let hasHImport = false;
          let vueImportIndex = -1;

          // Find if h is already imported and if there's a vue import
          for (let i = 0; i < path.node.body.length; i++) {
            const node = path.node.body[i];
            if (node.type === 'ImportDeclaration' && node.source.value === 'vue') {
              vueImportIndex = i;
              for (const spec of node.specifiers) {
                if (
                  spec.type === 'ImportSpecifier' &&
                  spec.imported &&
                  spec.imported.name === 'h'
                ) {
                  hasHImport = true;
                  break;
                }
              }
              if (hasHImport) break;
            }
          }

          // If h is not imported, add it
          if (!hasHImport) {
            if (vueImportIndex >= 0) {
              // Add h to existing vue import
              const vueImport = path.node.body[vueImportIndex];
              vueImport.specifiers.push({
                imported: { name: 'h', type: 'Identifier' },
                local: { name: 'h', type: 'Identifier' },
                type: 'ImportSpecifier',
              });
            } else {
              // Create new import { h } from 'vue'
              const importDeclaration = {
                source: { type: 'StringLiteral', value: 'vue' },
                specifiers: [
                  {
                    imported: { name: 'h', type: 'Identifier' },
                    local: { name: 'h', type: 'Identifier' },
                    type: 'ImportSpecifier',
                  },
                ],
                type: 'ImportDeclaration',
              };
              path.node.body.unshift(importDeclaration);
            }
          }
        },
      },
    },
  };
}
