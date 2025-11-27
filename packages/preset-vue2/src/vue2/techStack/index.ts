import type { IApi } from 'dumi';
import { fsExtra } from 'dumi/plugin-utils';
import { join } from 'node:path';

import { BABEL_STANDALONE_CDN, getPkgPath, getPluginPath } from '@/shared';

import { Vue2JSXTechStack } from './jsx';
import { Vue2SfcTechStack } from './sfc';

const COMPILE_FILENAME = 'compiler.mjs';
const RENDERER_FILENAME = 'renderer.mjs';
const PREFLIGHT_FILENAME = 'preflight.mjs';

export default function registerTechStack(api: IApi) {
  const vue2Config = api.userConfig?.vue2 as
    | { compiler?: { babelStandaloneCDN?: string } }
    | undefined;

  const pkgPath = getPkgPath('@dumijs/preset-vue2', api.cwd);
  const libPath = join(pkgPath, '/lib');

  // Vue 2 related runtime files must be placed under .dumi
  // so that the correct dependencies can be referenced.
  api.onGenerateFiles(() => {
    // Compiler file for Live Editing
    api.writeTmpFile({
      content: fsExtra.readFileSync(join(libPath, COMPILE_FILENAME), 'utf8'),
      path: COMPILE_FILENAME,
    });
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
    compilePath: getPluginPath(api, COMPILE_FILENAME),
    preflightPath: getPluginPath(api, PREFLIGHT_FILENAME),
    rendererPath: getPluginPath(api, RENDERER_FILENAME),
  };

  // Load Babel standalone for browser-side compilation
  api.addHTMLHeadScripts(() => {
    return [
      {
        src: vue2Config?.compiler?.babelStandaloneCDN || BABEL_STANDALONE_CDN,
      },
    ];
  });

  // Mark @babel/standalone as external (loaded via CDN)
  api.modifyConfig((memo) => {
    memo.externals = {
      ...memo.externals,
      '@babel/standalone': 'Babel',
    };
    return memo;
  });

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
