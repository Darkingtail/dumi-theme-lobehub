/**
 * Browser-compatible Vue 2.7 SFC Compiler
 * Uses @vue/compiler-sfc (Vue 3) for parsing
 * Supports TSX/JSX Live Editing with bundled Vue JSX plugins
 */
/* global Babel, Sass */
import type BabelStandalone from '@babel/standalone';
import { type SFCDescriptor, compileScript, parse, rewriteDefault } from '@vue/compiler-sfc';

import {
  COMP_IDENTIFIER,
  type CompileOptions,
  type CompileResult,
  WARNINGS,
  compileStylesAsync,
  generateComponentId,
  generateCssCode,
  generateIdCode,
  generateScopedIdCode,
  hasScoped,
  hasStyleModule,
  hasUnsupportedStyleLang,
  safeResolveFilename,
  toError,
} from './shared';
import { createVue2JsxPreset } from './vue-jsx-browser';

// Global type declaration for sass.js (CDN-loaded library)
// Note: @types/less provides the global `less` type, so we only declare Sass here
// sass.js uses callback-based API even in sync version
interface SassResult {
  // Error message (on failure)
  formatted?: string;
  // Compiled CSS (on success)
  message?: string;
  status: number;
  // 0 = success, non-zero = error
  text?: string; // Formatted error message
}

declare global {
  // eslint-disable-next-line no-var
  var Sass:
    | {
        compile: (input: string, callback: (result: SassResult) => void) => void;
      }
    | undefined;
}

/**
 * Browser-side async style preprocessor
 * Uses CDN-loaded less.js and sass.js
 */
async function browserStylePreprocessor(source: string, lang: string): Promise<string> {
  if (lang === 'less') {
    // Check if less.js is loaded via CDN (runtime check)
    const lessLib = typeof window !== 'undefined' ? (window as any).less : undefined;
    if (!lessLib) {
      console.warn('[Vue2 Compiler] less.js not loaded. LESS styles will not be compiled.');
      return source;
    }
    try {
      const result = await lessLib.render(source);
      return result.css;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`LESS compile error: ${msg}`);
    }
  }

  if (lang === 'scss' || lang === 'sass') {
    const sassLib = typeof Sass !== 'undefined' ? Sass : undefined;
    if (!sassLib) {
      console.warn('[Vue2 Compiler] sass.js not loaded. SCSS/SASS styles will not be compiled.');
      return source;
    }
    // sass.js uses callback-based API
    return new Promise<string>((resolve, reject) => {
      sassLib.compile(source, (result: SassResult) => {
        if (result.status === 0 && result.text) {
          resolve(result.text);
        } else {
          reject(
            new Error(
              `SCSS compile error: ${result.message || result.formatted || 'Unknown error'}`,
            ),
          );
        }
      });
    });
  }

  return source;
}

declare global {
  // eslint-disable-next-line no-var
  var Babel: typeof BabelStandalone;
}

// Re-export shared types and constants for backward compatibility
export { COMP_IDENTIFIER, type CompileOptions, type CompileResult } from './shared';

type Presets = Record<string, string>;

interface CreateCompilerContext {
  availablePresets?: Presets;
  babel: typeof BabelStandalone;
}

function createCompiler({ babel, availablePresets = {} }: CreateCompilerContext) {
  // Convert ES modules to CommonJS
  function toCommonJS(es: string) {
    return babel.transform(es, {
      presets: [[availablePresets['env'] ?? 'env', { modules: 'cjs' }]],
    });
  }

  function transformTS(
    src: string,
    filename: string,
    options: {
      lang?: string;
      plugins?: any[];
      presets?: any[];
    } = {},
  ) {
    const { lang, plugins = [], presets = [] } = options;

    // Add TypeScript preset if needed
    if (lang === 'ts' || lang === 'tsx') {
      presets.push([
        availablePresets['typescript'] ?? 'typescript',
        { allExtensions: true, isTSX: lang === 'tsx', onlyRemoveTypeImports: true },
      ]);
    }

    // Add Vue 2 JSX preset for JSX/TSX files
    if (lang === 'jsx' || lang === 'tsx') {
      // Create the Vue JSX preset and add its plugins
      const jsxPreset = createVue2JsxPreset(null, {});
      plugins.push(...jsxPreset.plugins);
    }

    const { basename } = safeResolveFilename(filename);

    const result = babel.transform(src, {
      filename: (basename || 'component') + '.' + (lang || 'js'),
      plugins,
      presets,
    });
    return result?.code || '';
  }

  function doCompileScript(
    id: string,
    descriptor: SFCDescriptor,
    scopedStyles: boolean,
    filename = 'component.vue',
  ) {
    const { template, script, scriptSetup } = descriptor;

    let sfcCode = '';

    // Get the language from script or scriptSetup
    const scriptLang = script?.lang || scriptSetup?.lang || 'js';

    // Configure babel parser plugins for TypeScript support
    const expressionPlugins: any[] = [];
    if (scriptLang === 'ts' || scriptLang === 'tsx') {
      expressionPlugins.push('typescript');
    }

    if (script || scriptSetup) {
      try {
        const compiledScript = compileScript(descriptor, {
          babelParserPlugins: expressionPlugins,
          id,
          inlineTemplate: false,
          isProd: false,
        });

        let content = compiledScript.content;
        content = rewriteDefault(content, COMP_IDENTIFIER, expressionPlugins);
        sfcCode = transformTS(content, filename, { lang: scriptLang });
      } catch (error) {
        return [toError(error)];
      }
    } else {
      sfcCode = `const ${COMP_IDENTIFIER} = {};`;
    }

    // Attach template for Vue 2 runtime compilation
    if (template?.content) {
      sfcCode += `\n${COMP_IDENTIFIER}.template = ${JSON.stringify(template.content)};`;
    }

    // For scoped styles - Vue 2 uses _scopeId (single underscore)
    if (scopedStyles) {
      sfcCode += `\n${generateScopedIdCode(id)}`;
    }

    return sfcCode;
  }

  async function compileSFC(options: CompileOptions): Promise<CompileResult> {
    const { id, code, filename } = options;

    const parseResult = parse(code, {
      filename,
      sourceMap: false,
    });

    const descriptor = parseResult.descriptor;
    const parseErrors = parseResult.errors;

    if (parseErrors && parseErrors.length) {
      return (parseErrors as unknown[]).map(toError);
    }

    let js = '';
    let skipStyleCompile = false;

    // Check for unsupported features using shared utilities
    if (
      hasUnsupportedStyleLang(descriptor.styles) ||
      (descriptor.template && descriptor.template.lang)
    ) {
      skipStyleCompile = true;
      js += `\nconsole.warn(${JSON.stringify(WARNINGS.PREPROCESSOR)})`;
    }

    if (hasStyleModule(descriptor.styles)) {
      skipStyleCompile = true;
      js += `\nconsole.warn(${JSON.stringify(WARNINGS.STYLE_MODULE)})`;
    }

    const scopedStyles = hasScoped(descriptor.styles);

    const scriptResult = doCompileScript(id, descriptor, scopedStyles, filename);

    if (Array.isArray(scriptResult)) {
      return scriptResult as Error[];
    }

    js += `\n${scriptResult}`;

    // Compile styles (including scoped styles) with LESS/SCSS preprocessing
    let css = '';
    if (!skipStyleCompile && descriptor.styles.length > 0) {
      const styleResult = await compileStylesAsync(
        id,
        descriptor.styles,
        filename,
        browserStylePreprocessor,
      );
      if (Array.isArray(styleResult)) {
        return styleResult;
      }
      css = styleResult;
    }

    return { css, js };
  }

  return {
    compileSFC,
    toCommonJS,
    transformTS,
  };
}

// Lazy-initialized compiler instance
let _compiler: ReturnType<typeof createCompiler> | null = null;

// Wait for Babel to be loaded (max 10 seconds)
async function waitForBabel(timeout = 10_000): Promise<typeof BabelStandalone> {
  const startTime = Date.now();
  while (typeof Babel === 'undefined') {
    if (Date.now() - startTime > timeout) {
      throw new Error(
        '[Vue2 Compiler] Babel standalone is not loaded. Make sure @babel/standalone script is loaded before using the compiler.',
      );
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
  }
  return Babel;
}

function getCompiler() {
  if (!_compiler) {
    if (typeof Babel === 'undefined') {
      throw new Error(
        '[Vue2 Compiler] Babel standalone is not loaded. Make sure @babel/standalone script is loaded before using the compiler.',
      );
    }
    _compiler = createCompiler({
      availablePresets: {
        env: 'env',
        typescript: 'typescript',
      },
      babel: Babel as any,
    });
  }
  return _compiler;
}

async function getCompilerAsync() {
  if (!_compiler) {
    await waitForBabel();
    _compiler = createCompiler({
      availablePresets: {
        env: 'env',
        typescript: 'typescript',
      },
      babel: Babel as any,
    });
  }
  return _compiler;
}

export const compiler = {
  get compileSFC() {
    return getCompiler().compileSFC;
  },
  get toCommonJS() {
    return getCompiler().toCommonJS;
  },
  get transformTS() {
    return getCompiler().transformTS;
  },
};

function generateNotSupportedComponent(lang: string): string {
  const notSupportedMsg = `Live editing is not supported for .${lang} files yet`;
  return (
    '"use strict";\n' +
    'var _component = {\n' +
    '  name: "LiveEditNotSupported",\n' +
    '  render: function(h) {\n' +
    '    return h("div", {\n' +
    '      style: {\n' +
    '        padding: "16px",\n' +
    '        background: "#fff3cd",\n' +
    '        border: "1px solid #ffc107",\n' +
    '        borderRadius: "4px",\n' +
    '        color: "#856404",\n' +
    '        fontSize: "14px"\n' +
    '      }\n' +
    '    }, [\n' +
    '      h("div", { style: { fontWeight: "bold", marginBottom: "8px" } }, "' +
    notSupportedMsg +
    '"),\n' +
    '      h("div", {}, "Please modify the source file and refresh.")\n' +
    '    ]);\n' +
    '  }\n' +
    '};\n' +
    'module.exports = _component;\n' +
    'module.exports.default = _component;\n'
  );
}

export async function compile(code: string, opts: { filename: string }) {
  // Top-level try-catch to ensure all errors are caught and converted to error components
  // This allows dumi's Live Editing to recover when the user fixes the code
  try {
    const { filename } = opts;
    const { lang } = safeResolveFilename(filename);

    const id = generateComponentId(filename);

    // Get compiler (wait for Babel if needed)
    const comp = await getCompilerAsync();

    if (lang === 'vue') {
      try {
        const compiled = await comp.compileSFC({ code, filename, id });

        if (Array.isArray(compiled)) {
          const errorMsg = compiled.map((e) => e.toString()).join('\\n');
          return `throw new Error(${JSON.stringify(errorMsg)});`;
        }

        let { css, js } = compiled;

        if (css) {
          js += `\n${generateCssCode(css)}`;
        }
        js += `\n${generateIdCode(id)}`;
        js += `\nexport default ${COMP_IDENTIFIER};`;

        const cjsResult = comp.toCommonJS(js);
        let cjsCode = cjsResult?.code || js;

        // Fix Vue.extend() issue in dumi's Live Editing environment for SFC files
        // Vue.extend() returns a constructor function, but when passed to React's useState,
        // React will call it as an updater function (without 'new'), causing errors.
        // Solution: Replace Vue.extend(options) with just options - Vue 2 accepts both.
        cjsCode = cjsCode.replace(/_vue\["default"]\.extend\({/g, '({');
        cjsCode = cjsCode.replace(/_vue\.default\.extend\({/g, '({');

        return cjsCode;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[Vue2 Compiler] SFC compile error:', errorMsg);
        return `throw new Error(${JSON.stringify(errorMsg)});`;
      }
    }

    // Handle TSX/JSX/TS/JS files
    if (lang && ['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
      try {
        // Transform the code (JSX/TSX files export their own component)
        let js = comp.transformTS(code, filename, { lang });

        const cjsResult = comp.toCommonJS(js);
        let cjsCode = cjsResult?.code || js;

        // For JSX/TSX files, inject h at the top after "use strict"
        // This is necessary because:
        // 1. @babel/preset-env converts `import { h } from 'vue'` to property access (_vue.h)
        //    rather than creating a separate `var h` variable
        // 2. JSX transform outputs bare h() calls that need h in scope
        // 3. We can't rely on the import being preserved as a variable
        if (lang === 'jsx' || lang === 'tsx') {
          if (cjsCode.includes('"use strict";')) {
            cjsCode = cjsCode.replace(/("use strict";)/, '$1\nvar h = require("vue").h;');
          } else {
            cjsCode = 'var h = require("vue").h;\n' + cjsCode;
          }
        }

        // Fix Vue.extend() issue in dumi's Live Editing environment
        // Vue.extend() returns a constructor function, but when passed to React's useState,
        // React will call it as an updater function (without 'new'), causing errors.
        // Solution: Replace Vue.extend(options) with just options - Vue 2 accepts both.
        // This keeps the component as an object (not a function) so React won't call it.
        cjsCode = cjsCode.replace(/_vue\["default"]\.extend\({/g, '({');
        cjsCode = cjsCode.replace(/_vue\.default\.extend\({/g, '({');

        return cjsCode;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return `throw new Error(${JSON.stringify(errorMsg)});`;
      }
    }

    return generateNotSupportedComponent(lang || 'unknown');
  } catch (error) {
    // Catch any unexpected errors (e.g., from getCompilerAsync, safeResolveFilename)
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Vue2 Compiler] Unexpected error:', errorMsg);
    return `throw new Error(${JSON.stringify('[Vue2 Compiler] ' + errorMsg)});`;
  }
}

export default compile;
