/**
 * Browser-compatible Vue 2.7 SFC Compiler
 * Uses @vue/compiler-sfc (Vue 3) for parsing and script setup support
 * Supports TSX/JSX Live Editing with bundled Vue JSX plugins
 *
 * Note: Vue 3's compiler-sfc is used because:
 * - Vue 2.7's compiler-sfc doesn't support browser environment
 * - We need <script setup> support for Vue 3 migration path
 *
 * Trade-offs:
 * - Filters ({{ x | fn }}) won't work correctly
 * - .sync modifier won't work correctly
 * - .native modifier won't work correctly
 * These are Vue 2 features removed in Vue 3, so not supporting them
 * actually helps enforce Vue 3 compatible code.
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

    // Vue 3's parse returns { descriptor, errors }
    const { descriptor, errors: parseErrors } = parse(code, {
      filename,
      sourceMap: false,
    });

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

// ============================================
// P0 Optimization: Compilation Cache
// ============================================
// Simple hash function for cache key generation
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Cache for compiled code (max 100 entries with LRU eviction)
const compilationCache = new Map<string, { code: string; timestamp: number }>();
const MAX_CACHE_SIZE = 100;

function getCacheKey(code: string, filename: string): string {
  return simpleHash(code + filename);
}

function getFromCache(key: string): string | null {
  const cached = compilationCache.get(key);
  if (cached) {
    // Update timestamp for LRU
    cached.timestamp = Date.now();
    return cached.code;
  }
  return null;
}

function setToCache(key: string, code: string): void {
  // Evict oldest entry if cache is full
  if (compilationCache.size >= MAX_CACHE_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, v] of compilationCache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      compilationCache.delete(oldestKey);
    }
  }
  compilationCache.set(key, { code, timestamp: Date.now() });
}

// ============================================
// P0 Optimization: Friendly Error Formatting
// ============================================
interface CompileErrorInfo {
  column?: number;
  line?: number;
  message: string;
  source?: string;
}

function formatCompileError(error: Error | string, source?: string): string {
  const errorMsg = typeof error === 'string' ? error : error.message;

  // Try to extract line/column info from error message
  const lineMatch = errorMsg.match(/line\s*(\d+)/i) || errorMsg.match(/:(\d+):/);
  const columnMatch = errorMsg.match(/column\s*(\d+)/i) || errorMsg.match(/:\d+:(\d+)/);

  const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
  const column = columnMatch ? parseInt(columnMatch[1], 10) : undefined;

  let formattedError = `
╭──────────────────────────────────────────────────────╮
│  Vue 2 编译错误 / Compile Error                       │
├──────────────────────────────────────────────────────┤`;

  if (line) {
    formattedError += `
│  位置: 第 ${line} 行${column ? `, 第 ${column} 列` : ''}`;
  }

  formattedError += `
├──────────────────────────────────────────────────────┤
│  ${errorMsg.slice(0, 50)}${errorMsg.length > 50 ? '...' : ''}`;

  // Add source context if available
  if (source && line) {
    const lines = source.split('\n');
    const startLine = Math.max(0, line - 3);
    const endLine = Math.min(lines.length, line + 2);

    formattedError += `
├──────────────────────────────────────────────────────┤`;

    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1;
      const isErrorLine = lineNum === line;
      const prefix = isErrorLine ? '>>>' : '   ';
      const lineContent = lines[i]?.slice(0, 45) || '';
      formattedError += `
│  ${prefix} ${lineNum.toString().padStart(3, ' ')} │ ${lineContent}`;
    }
  }

  formattedError += `
╰──────────────────────────────────────────────────────╯`;

  return formattedError;
}

function createErrorComponent(errorMsg: string, source?: string): string {
  const formattedError = formatCompileError(errorMsg, source);
  const escapedError = JSON.stringify(formattedError);

  return `
"use strict";
var _errorComponent = {
  name: "VueCompileError",
  render: function(h) {
    return h("div", {
      style: {
        padding: "16px",
        margin: "8px 0",
        background: "#fff2f0",
        border: "1px solid #ffccc7",
        borderRadius: "6px",
        fontFamily: "monospace",
        fontSize: "13px",
        whiteSpace: "pre-wrap",
        color: "#cf1322",
        lineHeight: "1.6"
      }
    }, ${escapedError});
  }
};
module.exports = _errorComponent;
module.exports.default = _errorComponent;
`;
}

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
  const { filename } = opts;

  // P0 Optimization: Check cache first
  const cacheKey = getCacheKey(code, filename);
  const cachedResult = getFromCache(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Top-level try-catch to ensure all errors are caught and converted to error components
  // This allows dumi's Live Editing to recover when the user fixes the code
  try {
    const { lang } = safeResolveFilename(filename);

    const id = generateComponentId(filename);

    // Get compiler (wait for Babel if needed)
    const comp = await getCompilerAsync();

    if (lang === 'vue') {
      try {
        const compiled = await comp.compileSFC({ code, filename, id });

        if (Array.isArray(compiled)) {
          // Follow preset-vue pattern: throw error so dumi's LiveDemo can catch and display it
          throw compiled[0];
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

        // P0 Optimization: Cache successful compilation
        setToCache(cacheKey, cjsCode);
        return cjsCode;
      } catch (error) {
        // Follow preset-vue pattern: re-throw error so dumi's LiveDemo can catch and display it
        throw error;
      }
    }

    // Handle TSX/JSX/TS/JS files
    if (lang && ['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
      try {
        // Transform the code (JSX/TSX files export their own component)
        let js = comp.transformTS(code, filename, { lang });

        const cjsResult = comp.toCommonJS(js);
        let cjsCode = cjsResult?.code || js;

        // Remove CSS/style imports for live editing
        // These styles are already loaded on initial page load, so we don't need them in live editing
        // This handles patterns like: require("element-ui/lib/theme-chalk/index.css");
        cjsCode = cjsCode.replace(
          /require\s*\(\s*["'][^"']+\.(css|less|scss|sass|styl|stylus)["']\s*\)\s*;?/g,
          '/* css import removed for live editing */',
        );

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

        // P0 Optimization: Cache successful compilation
        setToCache(cacheKey, cjsCode);
        return cjsCode;
      } catch (error) {
        // Follow preset-vue pattern: re-throw error so dumi's LiveDemo can catch and display it
        throw error;
      }
    }

    return generateNotSupportedComponent(lang || 'unknown');
  } catch (error) {
    // Follow preset-vue pattern: re-throw error so dumi's LiveDemo can catch and display it
    throw error;
  }
}

export default compile;
