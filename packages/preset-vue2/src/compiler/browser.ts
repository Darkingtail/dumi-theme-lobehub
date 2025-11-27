/**
 * Browser-compatible Vue 2.7 SFC Compiler
 * Uses @vue/compiler-sfc (Vue 3) for parsing
 * Supports TSX/JSX Live Editing with bundled Vue JSX plugins
 */
/* global Babel */
import type BabelStandalone from '@babel/standalone';
import {
  type SFCDescriptor,
  compileScript,
  compileStyle,
  parse,
  rewriteDefault,
} from '@vue/compiler-sfc';

// Import Vue JSX plugins for browser use
import { createVue2JsxPreset } from './vue-jsx-browser';

declare global {
  // eslint-disable-next-line no-var
  var Babel: typeof BabelStandalone;
}

export interface CompileOptions {
  code: string;
  filename: string;
  id: string;
}

export type CompileResult =
  | (string | Error)[]
  | {
      css: string;
      js: string;
    };

export const COMP_IDENTIFIER = '__sfc__';

function resolveFilename(filename: string) {
  const [, basename, lang] = filename.match(/([^.]+)\.([^.]+)$/) || [];
  return { basename, lang };
}

type Presets = Record<string, string>;

interface CreateCompilerContext {
  availablePresets?: Presets;
  babel: typeof BabelStandalone;
}

// Compile styles
function doCompileStyle(id: string, styles: SFCDescriptor['styles'], filename: string) {
  const styleList: string[] = [];
  for (const style of styles) {
    const result = compileStyle({
      filename,
      id: `data-v-${id}`,
      scoped: style.scoped || false,
      source: style.content,
      trim: true,
    });
    if (result.errors && result.errors.length) {
      return result.errors;
    }
    styleList.push(result.code);
  }
  return styleList.join('\n');
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

    const { basename } = resolveFilename(filename);

    const result = babel.transform(src, {
      filename: basename + '.' + (lang || 'js'),
      plugins,
      presets,
    });
    return result?.code || '';
  }

  function doCompileScript(
    id: string,
    descriptor: SFCDescriptor,
    hasScoped: boolean,
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
        return [error instanceof Error ? error : new Error(String(error))];
      }
    } else {
      sfcCode = `const ${COMP_IDENTIFIER} = {};`;
    }

    // Attach template for Vue 2 runtime compilation
    if (template?.content) {
      sfcCode += `\n${COMP_IDENTIFIER}.template = ${JSON.stringify(template.content)};`;
    }

    // For scoped styles - Vue 2 uses _scopeId (single underscore)
    if (hasScoped) {
      sfcCode += `\n${COMP_IDENTIFIER}._scopeId = "data-v-${id}";`;
    }

    return sfcCode;
  }

  function compileSFC(options: CompileOptions): CompileResult {
    const { id, code, filename } = options;

    const parseResult = parse(code, {
      filename,
      sourceMap: false,
    });

    const descriptor = parseResult.descriptor;
    const parseErrors = parseResult.errors;

    if (parseErrors && parseErrors.length) {
      return parseErrors.map((e: any) =>
        typeof e === 'string'
          ? new Error(e)
          : e instanceof Error
            ? e
            : new Error(String(e.message || e)),
      );
    }

    let js = '';
    let skipStyleCompile = false;

    // Check for unsupported style preprocessors (but allow plain CSS and scoped)
    const hasUnsupportedStyleLang = descriptor.styles.some(
      (style) => style.lang && style.lang !== 'css',
    );
    const hasUnsupportedTemplateLang = descriptor.template && descriptor.template.lang;

    if (hasUnsupportedStyleLang || hasUnsupportedTemplateLang) {
      skipStyleCompile = true;
      js +=
        '\nconsole.warn("Custom preprocessors for <template> and <style> are not supported in the Codeblock.")';
    }

    if (descriptor.styles.some((style) => style.module)) {
      skipStyleCompile = true;
      js += '\nconsole.warn("<style module> is not supported in the Codeblock.")';
    }

    const hasScoped = descriptor.styles.some((style) => style.scoped);

    const scriptResult = doCompileScript(id, descriptor, hasScoped, filename);

    if (Array.isArray(scriptResult)) {
      return scriptResult as Error[];
    }

    js += `\n${scriptResult}`;

    // Compile styles (including scoped styles)
    let css = '';
    if (!skipStyleCompile && descriptor.styles.length > 0) {
      const styleResult = doCompileStyle(id, descriptor.styles, filename);
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
  const { filename } = opts;
  const [, lang] = filename.match(/[^.]+\.([^.]+)$/) || [];

  const id = filename.replace(/[^\dA-Za-z]/g, '_');

  // Get compiler (wait for Babel if needed)
  const comp = await getCompilerAsync();

  if (lang === 'vue') {
    try {
      const compiled = comp.compileSFC({ code, filename, id });

      if (Array.isArray(compiled)) {
        const errorMsg = compiled.map((e) => e.toString()).join('\\n');
        return `throw new Error(${JSON.stringify(errorMsg)});`;
      }

      let { css, js } = compiled;

      if (css) {
        js += `\n${COMP_IDENTIFIER}.__css__ = ${JSON.stringify(css)};`;
      }
      js += `\n${COMP_IDENTIFIER}.__id__ = "${id}";`;
      js += `\nexport default ${COMP_IDENTIFIER};`;

      const cjsResult = comp.toCommonJS(js);
      return cjsResult?.code || js;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Vue2 Compiler] SFC compile error:', errorMsg);
      return `throw new Error(${JSON.stringify(errorMsg)});`;
    }
  }

  // Handle TSX/JSX/TS/JS files
  if (['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
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
}

export default compile;
