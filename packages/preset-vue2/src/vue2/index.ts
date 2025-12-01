import type { IApi } from 'dumi';
import { BaseAtomAssetsParser } from 'dumi/dist/assetParsers/BaseParser';

import { Vue2AtomAssetsParser } from '@/atomParser';

import checkVersion from './checkVersion';
import registerTechStack from './techStack';
import modifyWebpackConfig from './webpack';

export default (api: IApi) => {
  api.describe({
    key: 'preset-vue2',
  });

  checkVersion(api);

  modifyWebpackConfig(api);

  registerTechStack(api);

  // Register Vue 2 atomParser for API Table support
  // This runs before dumi's parser plugin to override the default React parser
  api.onCheckPkgJSON(async () => {
    // Only register if apiParser is enabled and no custom atomParser is set
    if (!api.config.apiParser) {
      return;
    }

    // Check if atomParser is already set (avoid overwriting if already configured)
    if (api.service.atomParser instanceof BaseAtomAssetsParser) {
      return;
    }

    // Ensure entryFile is configured
    const entryFile = api.config.resolve?.entryFile;
    if (!entryFile) {
      api.logger.warn(
        '[preset-vue2] `resolve.entryFile` must be configured when `apiParser` is enabled',
      );
      return;
    }

    const apiParserConfig = api.config.apiParser;

    // Create Vue 2 atomParser
    api.service.atomParser = new Vue2AtomAssetsParser({
      entryFile,
      parseOptions: apiParserConfig.parseOptions,
      resolveDir: api.cwd,
      resolveFilter: apiParserConfig.resolveFilter,
      unpkgHost: apiParserConfig.unpkgHost,
    });

    api.logger.info('[preset-vue2] Vue 2 atomParser registered for API Table support');
  });
};
