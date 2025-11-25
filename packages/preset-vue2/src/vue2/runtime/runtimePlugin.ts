import { getParameters } from 'codesandbox-import-utils/lib/api/define';
import type { IPreviewerProps } from 'dumi';
import type { IRuntimePlugin } from 'dumi/dist/client/theme-api';

/**
 * Runtime plugin for Vue 2 demos
 * Provides CodeSandbox and StackBlitz integration
 */
const runtimePlugin: IRuntimePlugin = {
  getCodeSandboxParams(props: IPreviewerProps) {
    const { asset } = props;
    const files: Record<string, { content: string; isBinary: boolean }> = {};
    const ext = props.defaultShowCode ? 'vue' : 'js';

    // Add demo files
    Object.entries(asset.dependencies).forEach(([name, { type, value }]) => {
      files[name] = {
        content: type === 'FILE' ? value : `export default ${JSON.stringify(value)}`,
        isBinary: false,
      };
    });

    // Add entry file
    files[`index.${ext}`] = {
      content: `import Vue from 'vue';
import App from './${Object.keys(asset.dependencies)[0]}';

new Vue({
  render: h => h(App),
}).$mount('#app');
`,
      isBinary: false,
    };

    // Add HTML
    files['index.html'] = {
      content: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vue 2 Demo</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,
      isBinary: false,
    };

    // Add package.json
    files['package.json'] = {
      content: JSON.stringify(
        {
          dependencies: {
            vue: '^2.7.16',
          },
          devDependencies: {
            '@vue/cli-service': '^5.0.0',
            'vue-template-compiler': '^2.7.16',
          },
          name: 'vue2-demo',
          private: true,
          scripts: {
            build: 'vue-cli-service build',
            serve: 'vue-cli-service serve',
          },
          version: '1.0.0',
        },
        null,
        2,
      ),
      isBinary: false,
    };

    return getParameters({ files });
  },

  getStackBlitzParams(props: IPreviewerProps) {
    const { asset } = props;
    const files: Record<string, string> = {};

    // Add demo files
    Object.entries(asset.dependencies).forEach(([name, { type, value }]) => {
      files[name] = type === 'FILE' ? value : `export default ${JSON.stringify(value)}`;
    });

    // Add entry file
    files['main.js'] = `import Vue from 'vue';
import App from './${Object.keys(asset.dependencies)[0]}';

new Vue({
  render: h => h(App),
}).$mount('#app');
`;

    // Add index.html
    files['index.html'] = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vue 2 Demo</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.js"></script>
  </body>
</html>`;

    return {
      dependencies: {
        vue: '^2.7.16',
      },
      description: '',
      files,
      template: 'vue',
      title: 'Vue 2 Demo',
    };
  },
};

export default runtimePlugin;
