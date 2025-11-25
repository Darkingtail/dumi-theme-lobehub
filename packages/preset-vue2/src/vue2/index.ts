import type { IApi } from 'dumi';

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
};
