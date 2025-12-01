// Optional dependencies to ignore (used by consolidate.js and @vue/component-compiler-utils)
const optionalDeps = [
  'velocityjs',
  'dustjs-linkedin',
  'atpl',
  'liquor',
  'twig',
  'ejs',
  'eco',
  'jazz',
  'jqtpl',
  'hamljs',
  'hamlet',
  'whiskers',
  'haml-coffee',
  'hogan.js',
  'templayed',
  'underscore',
  'walrus',
  'mustache',
  'just',
  'ect',
  'mote',
  'toffee',
  'dot',
  'bracket-template',
  'ractive',
  'htmling',
  'babel-core',
  'plates',
  'vash',
  'slm',
  'marko',
  'teacup/lib/express',
  'coffee-script',
  'stylus',
  'less',
  'sass',
  'node-sass',
];

export default {
  apiParser: {},
  chainWebpack(config: any) {
    // Ignore optional dependencies that webpack can't resolve
    config.resolve.fallback.merge(
      optionalDeps.reduce((acc: any, dep: string) => {
        acc[dep] = false;
        return acc;
      }, {}),
    );
  },
  mfsu: false,
  presets: [require.resolve('@dumijs/preset-vue2')],
  resolve: {
    entryFile: './src/index.ts', // component entry file
  },
  themeConfig: {
    name: 'Vue 2 Demo',
    nav: [
      { link: '/components', title: 'Components' },
      { link: '/react-demos', title: 'React Demos' },
      { link: '/api-test', title: 'API Table' },
    ],
  },
  // Vue 2 preset configuration
  vue2: {
    // jsxIncludes: Only process TSX/JSX files in paths containing 'vue2demo'
    // Files in /react-demos/ will NOT be processed by Vue 2 preset
    // and will use dumi's default React tech stack instead
    jsxIncludes: ['vue2demo'],
    // Additional modules to include in live editing context
    // These modules will be available via require() in live editing
    resolveMap: ['element-ui'],
  },
};
