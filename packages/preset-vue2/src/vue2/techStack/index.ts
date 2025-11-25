import type { IApi } from 'dumi';
import { fsExtra } from 'dumi/plugin-utils';
import { join } from 'node:path';

import { getPkgPath, getPluginPath } from '@/shared';

import { Vue2JSXTechStack } from './jsx';
import { Vue2SfcTechStack } from './sfc';

const RENDERER_FILENAME = 'renderer.mjs';
const PREFLIGHT_FILENAME = 'preflight.mjs';

export default function registerTechStack(api: IApi) {
  const pkgPath = getPkgPath('@dumijs/preset-vue2', api.cwd);
  const libPath = join(pkgPath, '/lib');

  // Vue 2 related runtime files must be placed under .dumi
  // so that the correct dependencies can be referenced.
  api.onGenerateFiles(() => {
    // Compiler file not needed since live editing is disabled
    // api.writeTmpFile({
    //   path: COMPILE_FILENAME,
    //   content: fsExtra.readFileSync(join(libPath, COMPILE_FILENAME), 'utf8'),
    // });
    api.writeTmpFile({
      content: fsExtra.readFileSync(join(libPath, RENDERER_FILENAME), 'utf8'),
      path: RENDERER_FILENAME,
    });
    api.writeTmpFile({
      content: fsExtra.readFileSync(join(libPath, PREFLIGHT_FILENAME), 'utf8'),
      path: PREFLIGHT_FILENAME,
    });
  });

  const runtimeOpts = {
    preflightPath: getPluginPath(api, PREFLIGHT_FILENAME),
    // Live editing disabled - compilePath not provided
    // compilePath: getPluginPath(api, COMPILE_FILENAME),
    rendererPath: getPluginPath(api, RENDERER_FILENAME),
    // Disabled: runtime plugin causes "invalid key default" error
    // pluginPath: join(libPath, 'runtimePlugin.mjs'),
  };

  // Babel standalone not needed since live editing is disabled
  // api.addHTMLHeadScripts(() => {
  //   return [
  //     {
  //       src: vue2Config?.compiler?.babelStandaloneCDN || BABEL_STANDALONE_CDN,
  //     },
  //   ];
  // });

  // api.modifyConfig((memo) => {
  //   memo.externals = {
  //     ...memo.externals,
  //     '@babel/standalone': 'Babel',
  //   };
  //   return memo;
  // });

  // Register Vue 2 JSX/TSX tech stack (higher priority)
  api.register({
    fn: () => Vue2JSXTechStack(runtimeOpts),
    key: 'registerTechStack',
    stage: 0,
  });

  // Register Vue 2 SFC tech stack
  api.register({
    fn: () => Vue2SfcTechStack(runtimeOpts),
    key: 'registerTechStack',
    stage: 1,
  });
}
