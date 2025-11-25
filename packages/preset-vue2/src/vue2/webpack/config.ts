import type Config from '@umijs/bundler-webpack/compiled/webpack-5-chain';
import type { IApi } from 'dumi';
import path from 'node:path';
import VueLoaderPlugin from 'vue-loader/lib/plugin';

// Webpack configuration for Vue 2

export function getConfig(config: Config, api: IApi) {
  const dumiSrc = path.resolve(api.paths.absSrcPath);
  const babelInUmi = config.module.rule('src').use('babel-loader').entries();

  // Use @babel/preset-typescript to strip TypeScript syntax
  // This is a direct dependency to ensure it's resolvable in pnpm
  const tsPresetPath = require.resolve('@babel/preset-typescript');

  // Vue 2 JSX/TSX support - only for files in vue2 directories
  // Use resourceQuery to match files with ?techStack=vue2-tsx
  // Use our custom fixed JSX plugin instead of @vue/babel-preset-jsx
  config.module
    .rule('vue2-jsx-tsx')
    .test(/\.(jsx|tsx)$/)
    .resourceQuery(/techStack=vue2-tsx/)
    .use('babel-loader')
    .loader(babelInUmi.loader)
    .options({
      ...babelInUmi.options,
      plugins: [
        ...(babelInUmi.options.plugins || []),
        // Use our fixed Vue 2 JSX plugin
        require.resolve('@dumijs/preset-vue2/compiled/vue2-jsx-plugin'),
      ],
      presets: [...babelInUmi.options.presets, tsPresetPath],
    });

  config.module.noParse(/^(vue|vue-router|vuex|vuex-router-sync)$/);

  // https://github.com/webpack/webpack/issues/11467#issuecomment-691873586
  config.module
    .rule('esm')
    .type('javascript/auto')
    .test(/\.m?jsx?$/)
    .resolve.set('fullySpecified', false);

  config.resolve.extensions.merge(['.vue']).end();

  // Add a TypeScript rule that VueLoaderPlugin will clone
  // This rule handles TypeScript script blocks in Vue SFCs
  config.module
    .rule('vue-ts')
    .test(/\.ts$/)
    .use('babel-loader')
    .loader(babelInUmi.loader)
    .options({
      ...babelInUmi.options,
      presets: [...(babelInUmi.options?.presets || []), [tsPresetPath, { allExtensions: true }]],
    });

  // Babel loader config with TypeScript support for vue-loader
  // Use allExtensions: true to process TypeScript in any file extension
  const tsBabelLoaderConfig = {
    loader: babelInUmi.loader,
    options: {
      ...babelInUmi.options,
      presets: [...(babelInUmi.options?.presets || []), [tsPresetPath, { allExtensions: true }]],
    },
  };

  // Vue 2 SFC support with vue-loader@15
  config.module
    .rule('vue')
    .test(/\.vue$/)
    .exclude.add(dumiSrc)
    .end()
    .use('vue-loader')
    .loader(require.resolve('vue-loader'))
    .options({
      babelParserPlugins: ['jsx', 'classProperties', 'decorators-legacy', 'typescript'],
      // Specify loaders for TypeScript script blocks
      // This bypasses VueLoaderPlugin's rule cloning
      loaders: {
        ts: [tsBabelLoaderConfig],
        tsx: [tsBabelLoaderConfig],
      },
    });

  config.plugin('vue-loader-plugin').use(VueLoaderPlugin);

  // Vue style handling
  config.module
    .rule('vue-style')
    .test(/\.vue$/)
    .exclude.add(dumiSrc)
    .end()
    .resourceQuery(/type=style/)
    .sideEffects(true);

  // Asset handling
  config.module.rules.delete('asset');

  const { userConfig } = api;
  const inlineLimit = parseInt(userConfig.inlineLimit || '10000', 10);

  config.module
    .rule('avif')
    .test(/\.avif$/)
    .type('asset')
    .mimetype('image/avif')
    .parser({
      dataUrlCondition: {
        maxSize: inlineLimit,
      },
    });

  config.module
    .rule('image')
    .test(/\.(bmp|gif|jpg|jpeg|png)$/)
    .type('asset')
    .parser({
      dataUrlCondition: {
        maxSize: inlineLimit,
      },
    });

  config.module.rules.delete('svg');
  config.module
    .rule('svg')
    .test(/\.svg$/)
    .use('url-loader')
    .loader(require.resolve('@umijs/bundler-webpack/compiled/url-loader'))
    .options({
      fallback: require.resolve('@umijs/bundler-webpack/compiled/file-loader'),
      limit: userConfig.inlineLimit,
    })
    .end();

  // Vue 2 alias
  config.resolve.alias.set('vue$', 'vue/dist/vue.esm.js');
}
