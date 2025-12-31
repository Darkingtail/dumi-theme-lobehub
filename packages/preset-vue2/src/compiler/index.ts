import {
  type SFCDescriptor,
  compileScript,
  compileTemplate,
  parse,
  rewriteDefault,
} from '@vue/compiler-sfc';
import type { BabelCore, babelCore } from 'dumi/tech-stack-utils';
import type Less from 'less';
import less from 'less';
import * as sass from 'sass';

import {
  COMP_IDENTIFIER,
  type CompileOptions,
  type CompileResult,
  type StylePreprocessor,
  WARNINGS,
  compileStyles,
  generateScopedIdCode,
  hasScoped,
  hasStyleModule,
  hasUnsupportedStyleLang,
  resolveFilename,
  toError,
} from './shared';

/**
 * Node.js style preprocessor for LESS/SCSS
 * Uses sync APIs for Node.js environment
 */
const nodeStylePreprocessor: StylePreprocessor = (source: string, lang: string): string => {
  if (lang === 'less') {
    // LESS render is async, but we use renderSync workaround
    // Actually less doesn't have renderSync, so we need a different approach
    // For now, let's use a synchronous wrapper
    let result = '';
    let error: Error | null = null;

    // less.render is async, but we can use the sync pattern with deasync or similar
    // For simplicity, let's just do async-to-sync conversion
    less.render(
      source,
      { syncImport: true },
      (err: Less.RenderError | undefined, output: Less.RenderOutput | undefined) => {
        if (err) {
          error = new Error(`LESS compile error: ${err.message}`);
        } else if (output) {
          result = output.css;
        }
      },
    );

    if (error) throw error;
    return result;
  }

  if (lang === 'scss' || lang === 'sass') {
    const result = sass.compileString(source, {
      syntax: lang === 'sass' ? 'indented' : 'scss',
    });
    return result.css;
  }

  // For unsupported languages, return as-is (will be handled as CSS)
  return source;
};

// Re-export shared types and constants for backward compatibility
export {
  COMP_IDENTIFIER,
  type CompileOptions,
  type CompileResult,
  resolveFilename,
} from './shared';

type Plugins = Record<string, BabelCore.PluginItem>;

type CreateCompilerContext = {
  availablePlugins?: Plugins;
  availablePresets?: Plugins;
  babel: ReturnType<typeof babelCore>;
};

export function createCompiler({
  babel,
  availablePlugins = {},
  availablePresets = {},
}: CreateCompilerContext) {
  // availablePlugins reserved for future use
  void availablePlugins;
  function toCommonJS(es: string) {
    return babel.transformSync(es, {
      presets: [[availablePresets['env'] ?? 'env', { modules: 'cjs' }]],
    });
  }

  function transformTS(
    src: string,
    filename: string,
    options: {
      lang?: string;
      plugins?: BabelCore.PluginItem[];
      presets?: BabelCore.PluginItem[];
    } = {},
  ) {
    const { lang, plugins = [], presets = [] } = options;
    if (lang === 'ts' || lang === 'tsx') {
      const isTSX = lang === 'tsx';
      const tsPreset = availablePresets['typescript'];
      if (tsPreset) {
        // allExtensions: true is needed for Vue SFC files (not .ts extension)
        // onlyRemoveTypeImports: true ensures value imports like 'h' aren't removed
        presets.push([tsPreset, { allExtensions: true, isTSX, onlyRemoveTypeImports: true }]);
      } else {
        // Fallback to require if preset not provided
        presets.push([
          require('@babel/preset-typescript'),
          { allExtensions: true, isTSX, onlyRemoveTypeImports: true },
        ]);
      }
    }
    if (lang === 'tsx' || lang === 'jsx') {
      // Use Vue 2 JSX preset with injectH disabled
      // Users must explicitly import { h } from 'vue' for setup() functions
      // For render(h) methods, h is passed as the first argument
      presets.push(availablePresets['vue2-jsx'] ?? ['@vue/babel-preset-jsx', { injectH: false }]);
    }

    const { basename } = resolveFilename(filename);
    const result = babel.transformSync(src, {
      filename: basename + '.' + (lang || 'js'),
      plugins,
      presets,
    });
    return result?.code || '';
  }

  function doCompileScript(
    id: string,
    descriptor: SFCDescriptor,
    _hasScoped: boolean,
    _lang?: string,
    filename = 'component.vue',
  ) {
    const { template, script, scriptSetup } = descriptor;
    const templateContent = template?.content;
    const sfcFilename = filename;

    let sfcCode = '';

    // Get the language from script or scriptSetup
    const scriptLang =
      script?.lang || scriptSetup?.lang || (scriptSetup?.attrs as any)?.lang || 'js';
    const isTS = scriptLang === 'ts' || scriptLang === 'tsx';
    const hasSetup = !!scriptSetup;

    // Configure babel parser plugins for TypeScript support
    const expressionPlugins: any[] = [];
    if (isTS) expressionPlugins.push('typescript');
    if (scriptLang === 'jsx' || scriptLang === 'tsx') expressionPlugins.push('jsx');

    if (script || scriptSetup) {
      try {
        const { content } = compileScript(descriptor as any, {
          babelParserPlugins: expressionPlugins,
          id,
        });
        // Use rewriteDefault to properly handle export default with TypeScript
        sfcCode = transformTS(
          rewriteDefault(content, COMP_IDENTIFIER, expressionPlugins),
          sfcFilename,
          { lang: scriptLang },
        );
      } catch (error) {
        return [toError(error)];
      }
    } else {
      sfcCode = `const ${COMP_IDENTIFIER} = {};`;
    }

    // Compile template for non-setup components
    if (!hasSetup && templateContent) {
      const templateResult = compileTemplate({
        filename: sfcFilename,
        source: templateContent,
      } as any);

      if (templateResult.errors && templateResult.errors.length) {
        return (templateResult.errors as unknown[]).map(toError);
      }

      let renderCode = transformTS(templateResult.code, sfcFilename, { lang: scriptLang });
      sfcCode += `\n${renderCode.replace(/\nexport (function|const) render/, `$1 render`)}`;
      sfcCode += `\n${COMP_IDENTIFIER}.render = render;`;
    }

    return sfcCode;
  }

  function compileSFC(options: CompileOptions): CompileResult {
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

    // Get script lang from either script or scriptSetup
    const scriptLang = descriptor.script?.lang || descriptor.scriptSetup?.lang;
    const scopedStyles = hasScoped(descriptor.styles);

    const scriptResult = doCompileScript(id, descriptor, scopedStyles, scriptLang || '', filename);

    if (Array.isArray(scriptResult)) {
      return scriptResult as Error[];
    }

    js += `\n${scriptResult}`;

    if (scopedStyles) {
      js += `\n${generateScopedIdCode(id)}`;
    }

    let css = '';
    if (!skipStyleCompile && descriptor.styles.length > 0) {
      const styleResult = compileStyles(id, descriptor.styles, filename, nodeStylePreprocessor);
      if (Array.isArray(styleResult)) {
        return styleResult;
      }
      css = styleResult;
    }

    // Add export default
    js += `\nexport default ${COMP_IDENTIFIER};`;

    return { css, js };
  }

  return {
    compileSFC,
    toCommonJS,
    transformTS,
  };
}
