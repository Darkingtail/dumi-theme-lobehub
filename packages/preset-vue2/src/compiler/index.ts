import {
  type SFCDescriptor,
  compileScript,
  compileStyle,
  compileTemplate,
  parse,
  rewriteDefault,
} from '@vue/compiler-sfc';
import type { BabelCore, babelCore } from 'dumi/tech-stack-utils';

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

export function resolveFilename(filename: string) {
  const [, basename, lang] = filename.match(/([^.]+)\.([^.]+)$/) || [];
  return { basename, lang };
}

type Plugins = Record<string, BabelCore.PluginItem>;

type CreateCompilerContext = {
  availablePresets?: Plugins;
  babel: ReturnType<typeof babelCore>;
};

export const COMP_IDENTIFIER = '__sfc__';

// Moved to outer scope per ESLint unicorn/consistent-function-scoping
function doCompileStyle(id: string, styles: SFCDescriptor['styles'], filename = 'component.vue') {
  const styleList: string[] = [];
  const sfcFilename = filename;
  for (const style of styles) {
    const result = compileStyle({
      filename: sfcFilename,
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

export function createCompiler({ babel, availablePresets = {} }: CreateCompilerContext) {
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
        presets.push([tsPreset, { allExtensions: true, isTSX }]);
      } else {
        // Fallback to require if preset not provided
        presets.push([require('@babel/preset-typescript'), { allExtensions: true, isTSX }]);
      }
    }
    if (lang === 'tsx' || lang === 'jsx') {
      // Use Vue 2 JSX preset
      presets.push(availablePresets['vue2-jsx'] ?? ['@vue/babel-preset-jsx', {}]);
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
        return [error instanceof Error ? error : new Error(String(error))];
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
        return (templateResult.errors as any[]).map((e: any) =>
          typeof e === 'string' ? new Error(e) : e instanceof Error ? e : new Error(String(e)),
        );
      }

      let renderCode = transformTS(templateResult.code, sfcFilename, { lang: scriptLang });
      sfcCode += `\n${renderCode.replace(/\nexport (function|const) render/, `$1 render`)}`;
      sfcCode += `\n${COMP_IDENTIFIER}.render = render;`;
    }

    return sfcCode;
  }

  function compileSFC(options: CompileOptions): CompileResult {
    const { id, code, filename } = options;

    // Use parse from @vue/compiler-sfc
    const descriptor = parse({
      filename,
      source: code,
      sourceMap: false,
    });

    if (descriptor.errors && descriptor.errors.length) {
      return (descriptor.errors as any[]).map((e: any) =>
        typeof e === 'string' ? new Error(e) : e instanceof Error ? e : new Error(String(e)),
      );
    }

    let js = '';
    let skipStyleCompile = false;

    if (
      descriptor.styles.some((style) => style.lang && style.lang !== 'css') ||
      (descriptor.template && descriptor.template.lang)
    ) {
      skipStyleCompile = true;
      js +=
        '\nconsole.warn("Custom preprocessors ' +
        'for <template> and <style> are not supported in the Codeblock.")';
    }

    if (descriptor.styles.some((style) => style.module)) {
      skipStyleCompile = true;
      js += '\nconsole.warn("<style module> is not supported in the Codeblock.")';
    }

    // Get script lang from either script or scriptSetup
    const scriptLang = descriptor.script?.lang || descriptor.scriptSetup?.lang;
    const hasScoped = descriptor.styles.some((style) => style.scoped);

    const scriptResult = doCompileScript(
      id,
      descriptor as any,
      hasScoped,
      scriptLang || '',
      filename,
    );

    if (Array.isArray(scriptResult)) {
      return scriptResult as Error[];
    }

    js += `\n${scriptResult}`;

    if (hasScoped) {
      js += `\n${COMP_IDENTIFIER}.__scopeId = "data-v-${id}";`;
    }

    let css = '';
    if (!skipStyleCompile && descriptor.styles.length > 0) {
      const styleResult = doCompileStyle(id, descriptor.styles, filename);
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
