import { compare } from 'compare-versions';
import type { IApi } from 'dumi';
import { chalk, logger } from 'dumi/plugin-utils';

import { getDepVersion } from '@/shared';

export default function checkVersion(api: IApi) {
  const vueVersion = getDepVersion({
    cwd: api.cwd,
    dep: 'vue',
    pkg: api.pkg,
  });

  if (!vueVersion) {
    throw new Error('Please install Vue 2.');
  }

  // Check if it's Vue 2.x
  if (!compare(vueVersion, '2.0.0', '>=') || compare(vueVersion, '3.0.0', '>=')) {
    throw new Error(`@dumijs/preset-vue2 requires Vue 2.x, but got ${vueVersion}`);
  }

  logger.info(chalk.cyan.bold(`Vue v${vueVersion}`));

  // Check vue-template-compiler version matches vue version
  const compilerVersion = getDepVersion({
    cwd: api.cwd,
    dep: 'vue-template-compiler',
    pkg: api.pkg,
  });

  if (!compilerVersion) {
    throw new Error('Please install vue-template-compiler with the same version as vue.');
  }

  if (compilerVersion !== vueVersion) {
    logger.warn(
      chalk.yellow(
        `vue-template-compiler version (${compilerVersion}) should match vue version (${vueVersion})`,
      ),
    );
  }
}
