import { babelCore, babelPresetEnv, babelPresetTypeScript } from 'dumi/tech-stack-utils';

import { COMP_IDENTIFIER, type CompileOptions, createCompiler } from './index';

const babel = babelCore();
const env = babelPresetEnv();
const typescript = babelPresetTypeScript();

export const compiler: ReturnType<typeof createCompiler> = createCompiler({
  availablePlugins: {},
  availablePresets: {
    env,
    typescript,
    'vue2-jsx': require.resolve('@vue/babel-preset-jsx'),
  },
  babel,
});

export function compile(options: CompileOptions) {
  const { id, filename, code } = options;
  const [, lang] = filename.match(/[^.]+\.([^.]+)$/) || [];

  if (['js', 'jsx', 'ts', 'tsx'].includes(lang)) {
    return compiler.transformTS(code, filename, { lang });
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
