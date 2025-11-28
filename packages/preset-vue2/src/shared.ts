import type { IApi } from 'dumi';
import { resolve, winPath } from 'dumi/plugin-utils';
import { dirname, join } from 'node:path';

/** Package.json structure with dependencies fields */
export interface PackageJson {
  [key: string]: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
  peerDependencies?: Record<string, string>;
  version?: string;
}

/**
 * jsxIncludes config type for Vue 2 JSX/TSX path filtering
 * - true: match all jsx/tsx files
 * - string[]: match files whose path includes any of the strings
 * - RegExp[]: match files whose path matches any of the regexes
 * - (string | RegExp)[]: mixed array
 */
export type JsxIncludesConfig = true | (string | RegExp)[];

/**
 * Vue 2 preset configuration
 */
export interface Vue2Config {
  compiler?: {
    babelStandaloneCDN?: string;
    lessCDN?: string;
    sassCDN?: string;
  };
  /** JSX/TSX path include patterns. Default: true (all jsx/tsx files) */
  jsxIncludes?: JsxIncludesConfig;
}

export const BABEL_STANDALONE_CDN =
  'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.22.17/babel.min.js';

// LESS compiler for browser-side style preprocessing
export const LESS_CDN = 'https://cdn.bootcdn.net/ajax/libs/less.js/4.2.0/less.min.js';

// Sass.js for browser-side SCSS/SASS compilation
// Note: sass.js is a browser port of LibSass, providing Sass.compile() API
export const SASS_CDN = 'https://cdn.jsdelivr.net/npm/sass.js@0.11.1/dist/sass.sync.min.js';

export function getPluginPath(api: IApi, filename: string) {
  return winPath(join(api.paths.absTmpPath, `plugin-${api.plugin.key}`, filename));
}

export function hasDep(pkg: PackageJson, dep: string) {
  return pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
}

export function getPkgPath(dep: string, cwd: string) {
  return dirname(
    resolve.sync(`${dep}/package.json`, {
      basedir: cwd,
    }),
  );
}

export function getDepVersion(opts: { cwd: string; dep: string; pkg: PackageJson }) {
  if (hasDep(opts.pkg, opts.dep)) {
    const pkgPath = getPkgPath(opts.dep, opts.cwd);
    return require(join(pkgPath, 'package.json')).version as string;
  }
}
