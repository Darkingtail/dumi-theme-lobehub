import type { IApi } from 'dumi';

import { getConfig } from './config';

export default function modifyWebpackConfig(api: IApi) {
  api.chainWebpack((config) => {
    getConfig(config, api);
    return config;
  });

  // MFSU support - only if not disabled
  api.modifyConfig((memo) => {
    // Respect mfsu: false config
    if (memo.mfsu === false) {
      return memo;
    }
    memo.mfsu = {
      ...memo.mfsu,
      shared: {
        ...memo.mfsu?.shared,
        vue: {
          singleton: true,
        },
      },
    };
    return memo;
  });
}
