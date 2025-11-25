import type { IApi } from 'dumi';
import { resolve, winPath } from 'dumi/plugin-utils';
import { dirname, join } from 'node:path';

export const BABEL_STANDALONE_CDN =
  'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.22.17/babel.min.js';

export function getPluginPath(api: IApi, filename: string) {
  return winPath(join(api.paths.absTmpPath, `plugin-${api.plugin.key}`, filename));
}

export function hasDep(pkg: any, dep: string) {
  return pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
}

export function getPkgPath(dep: string, cwd: string) {
  return dirname(
    resolve.sync(`${dep}/package.json`, {
      basedir: cwd,
    }),
  );
}

export function getDepVersion(opts: { cwd: string; dep: string; pkg: any }) {
  if (hasDep(opts.pkg, opts.dep)) {
    const pkgPath = getPkgPath(opts.dep, opts.cwd);
    return require(join(pkgPath, 'package.json')).version as string;
  }
}
