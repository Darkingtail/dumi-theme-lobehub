import type { IApi } from 'dumi';
import { fsExtra } from 'dumi/plugin-utils';
import { join } from 'node:path';

import {
  BABEL_STANDALONE_CDN,
  type JsxIncludesConfig,
  LESS_CDN,
  SASS_CDN,
  getCurrentPkgName,
  getPkgPath,
  getPluginPath,
} from '@/shared';

import { Vue2JSXTechStack } from './jsx';
import { Vue2SfcTechStack } from './sfc';

const COMPILE_FILENAME = 'compiler.mjs';
const RENDERER_FILENAME = 'renderer.mjs';
const PREFLIGHT_FILENAME = 'preflight.mjs';

export default function registerTechStack(api: IApi) {
  const vue2Config = api.userConfig?.vue2 as
    | {
        compiler?: { babelStandaloneCDN?: string; lessCDN?: string; sassCDN?: string };
        jsxIncludes?: JsxIncludesConfig;
        resolveMap?: string[];
      }
    | undefined;

  const pkgPath = getPkgPath(getCurrentPkgName(), api.cwd);
  const libPath = join(pkgPath, '/lib');

  // Vue 2 related runtime files must be placed under .dumi
  // so that the correct dependencies can be referenced.
  api.onGenerateFiles(() => {
    const filesToCopy = [
      { desc: 'Compiler', src: COMPILE_FILENAME },
      { desc: 'Renderer', src: RENDERER_FILENAME },
      { desc: 'Preflight', src: PREFLIGHT_FILENAME },
    ];

    for (const file of filesToCopy) {
      const srcPath = join(libPath, file.src);
      try {
        const content = fsExtra.readFileSync(srcPath, 'utf8');
        api.writeTmpFile({ content, path: file.src });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`[preset-vue2] Failed to read ${file.desc} file (${srcPath}): ${msg}`);
      }
    }
  });

  const runtimeOpts = {
    compilePath: getPluginPath(api, COMPILE_FILENAME),
    preflightPath: getPluginPath(api, PREFLIGHT_FILENAME),
    rendererPath: getPluginPath(api, RENDERER_FILENAME),
  };

  // Load Babel standalone and style preprocessors for browser-side compilation
  api.addHTMLHeadScripts(() => {
    return [
      // Babel for JSX/TSX transformation
      {
        src: vue2Config?.compiler?.babelStandaloneCDN || BABEL_STANDALONE_CDN,
      },
      // LESS compiler for browser-side LESS compilation
      {
        src: vue2Config?.compiler?.lessCDN || LESS_CDN,
      },
      // Sass.js for browser-side SCSS/SASS compilation
      {
        src: vue2Config?.compiler?.sassCDN || SASS_CDN,
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
    fn: () =>
      Vue2JSXTechStack({
        jsxIncludes: vue2Config?.jsxIncludes,
        resolveMap: vue2Config?.resolveMap,
        runtimeOpts,
      }),
    key: 'registerTechStack',
    stage: 0,
  });

  // Register Vue 2 SFC tech stack
  api.register({
    fn: () => Vue2SfcTechStack({ resolveMap: vue2Config?.resolveMap, runtimeOpts }),
    key: 'registerTechStack',
    stage: 1,
  });
}
