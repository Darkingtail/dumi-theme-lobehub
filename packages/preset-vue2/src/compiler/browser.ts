/**
 * Browser-compatible Vue 2 SFC Compiler
 * Uses @vue/component-compiler-utils for browser support
 */
/* global Babel */
import type BabelStandalone from '@babel/standalone';
import { compileStyle, compileTemplate, parse } from '@vue/component-compiler-utils';
import * as vueTemplateCompiler from 'vue-template-compiler';

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

// Moved to outer scope per ESLint unicorn/consistent-function-scoping
function doCompileStyle(id: string, styles: any[], filename: string) {
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
    // @babel/standalone uses transform (not transformSync) in browser
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

    console.log('[Vue2 Compiler] transformTS called, lang:', lang);

    // Add TypeScript preset if needed
    if (lang === 'ts') {
      presets.push([
        availablePresets['typescript'] ?? 'typescript',
        { allExtensions: true, onlyRemoveTypeImports: true },
      ]);
    }

    const { basename } = resolveFilename(filename);
    console.log(
      '[Vue2 Compiler] Babel transform with presets:',
      presets.map((p) => (Array.isArray(p) ? p[0] : p)),
    );

    // @babel/standalone uses transform (not transformSync) in browser
    const result = babel.transform(src, {
      filename: basename + '.' + (lang || 'js'),
      plugins,
      presets,
    });
    return result?.code || '';
  }

  function doCompileScript(id: string, descriptor: any, hasScoped: boolean, lang?: string) {
    const { template, script } = descriptor;
    const templateContent = template?.content;

    let sfcCode = '';

    if (script) {
      let content = script.content;
      // Replace export default with const assignment
      content = content.replace(/export\s+default\s+/, `const ${COMP_IDENTIFIER}_raw = `);

      sfcCode = transformTS(content, descriptor.filename || 'component.vue', {
        lang: lang || 'js',
      });

      // Vue.extend() returns a constructor function which causes issues with React's setState
      // (React calls functions passed to setState as updater functions)
      // If the result is a constructor, extract its .options property to get the plain options object
      // If it's already a plain object, use it directly
      sfcCode += `\nvar ${COMP_IDENTIFIER} = typeof ${COMP_IDENTIFIER}_raw === 'function' && ${COMP_IDENTIFIER}_raw.options ? ${COMP_IDENTIFIER}_raw.options : ${COMP_IDENTIFIER}_raw;`;
    } else {
      sfcCode = `const ${COMP_IDENTIFIER} = {};`;
    }

    if (templateContent) {
      const templateResult = compileTemplate({
        compiler: vueTemplateCompiler as any,
        compilerOptions: {
          outputSourceRange: true,
        },
        filename: descriptor.filename || 'component.vue',
        isFunctional: false,
        isProduction: false,
        optimizeSSR: false,
        source: templateContent,
      });

      if (templateResult.errors && templateResult.errors.length) {
        return templateResult.errors.map((e: any) => (typeof e === 'string' ? new Error(e) : e));
      }

      let renderCode = templateResult.code;
      renderCode = transformTS(renderCode, descriptor.filename || 'component.vue', {
        lang: 'js',
      });
      sfcCode += `\n${renderCode}`;
      sfcCode += `\n${COMP_IDENTIFIER}.render = render;`;

      if ((templateResult as any).staticRenderFns) {
        sfcCode += `\n${COMP_IDENTIFIER}.staticRenderFns = staticRenderFns;`;
      }
    }

    return sfcCode;
  }

  function compileSFC(options: CompileOptions): CompileResult {
    const { id, code, filename } = options;

    const descriptor = parse({
      compiler: vueTemplateCompiler as any,
      filename,
      needMap: false,
      source: code,
    });

    if (descriptor.errors && descriptor.errors.length) {
      return descriptor.errors.map((e: any) => (typeof e === 'string' ? new Error(e) : e));
    }

    let js = '';
    let skipStyleCompile = false;

    if (
      descriptor.styles.some((style: any) => style.lang && style.lang !== 'css') ||
      (descriptor.template && descriptor.template.lang)
    ) {
      skipStyleCompile = true;
      js +=
        '\nconsole.warn("Custom preprocessors for <template> and <style> are not supported in the Codeblock.")';
    }

    if (descriptor.styles.some((style: any) => style.module)) {
      skipStyleCompile = true;
      js += '\nconsole.warn("<style module> is not supported in the Codeblock.")';
    }

    const scriptLang = descriptor.script?.lang;
    const hasScoped = descriptor.styles.some((style: any) => style.scoped);

    const scriptResult = doCompileScript(id, descriptor, hasScoped, scriptLang || '');

    if (Array.isArray(scriptResult)) {
      return scriptResult as Error[];
    }

    js += `\n${scriptResult}`;

    if (hasScoped) {
      js += `\n${COMP_IDENTIFIER}._scopeId = ${JSON.stringify(`data-v-${id}`)};`;
    }

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
// This ensures Babel is loaded before we try to use it
let _compiler: ReturnType<typeof createCompiler> | null = null;

function getCompiler() {
  if (!_compiler) {
    if (typeof Babel === 'undefined') {
      throw new Error(
        '[Vue2 Compiler] Babel standalone is not loaded. Make sure @babel/standalone script is loaded before using the compiler.',
      );
    }
    console.log('[Vue2 Compiler] Initializing compiler with Babel standalone');
    console.log(
      '[Vue2 Compiler] Available Babel presets:',
      Object.keys((Babel as any).availablePresets || {}),
    );
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

// Legacy export for backwards compatibility (will throw if Babel not loaded)
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

/**
 * Compile function matching dumi's expected interface:
 * compile(code: string, opts: { filename: string }) => string
 *
 * Returns CommonJS code that can be evaluated by dumi's evalCommonJS
 */
export function compile(_code: string, opts: { filename: string }) {
  const { filename } = opts;
  const [, lang] = filename.match(/[^.]+\.([^.]+)$/) || [];

  // Live editing is not supported for Vue 2 components
  // This is a placeholder for future implementation
  const notSupportedMsg = `Live editing is not supported for .${lang} files`;
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
    '      h("div", {}, "Live editing for Vue 2 is not yet supported. Please modify the source file and refresh.")\n' +
    '    ]);\n' +
    '  }\n' +
    '};\n' +
    'module.exports = _component;\n' +
    'module.exports.default = _component;\n'
  );

  // The code below is kept for future implementation
  /*
  console.log('[Vue2 Compiler] Compiling SFC:', filename);
  const compiled = compiler.compileSFC({ id, filename, code });

  if (Array.isArray(compiled)) {
    console.error('[Vue2 Compiler] Compilation errors:', compiled);
    // Return error as string for dumi to display
    return `throw new Error(${JSON.stringify(compiled.map(e => e.toString()).join('\\n'))});`;
  }

  let { js, css } = compiled;
  console.log('[Vue2 Compiler] SFC compiled - JS length:', js.length, 'CSS length:', css.length);
  console.log('[Vue2 Compiler] CSS content:', css.substring(0, 200));

  if (css) {
    js += `\n${COMP_IDENTIFIER}.__css__ = ${JSON.stringify(css)};`;
  }
  js += `\n${COMP_IDENTIFIER}.__id__ = "${id}";`;

  // Add ES module export so toCommonJS can convert it
  js += `\nexport default ${COMP_IDENTIFIER};`;

  // Convert entire output to CommonJS (including the ES imports in script content)
  const cjsResult = compiler.toCommonJS(js);
  const finalCode = cjsResult?.code || js;

  console.log('[Vue2 Compiler] Final code length:', finalCode.length);
  console.log('[Vue2 Compiler] Final code preview:', finalCode.substring(0, 300));
  return finalCode;
  */
}

// Default export required by dumi's live demo system
export default compile;
