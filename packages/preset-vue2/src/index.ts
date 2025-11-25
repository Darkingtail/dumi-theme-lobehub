import type { IApi } from 'dumi';

import './requireHook';

// EnableBy enum from @umijs/core
enum EnableBy {
  config = 'config',
  register = 'register',
}

export default (api: IApi) => {
  api.describe({
    config: {
      schema({ zod }) {
        return zod.object({
          compiler: zod
            .object({
              babelStandaloneCDN: zod.string().optional(),
            })
            .optional(),
        });
      },
    },
    enableBy: EnableBy.config,
    key: 'vue2',
  });

  return {
    plugins: [require.resolve('./vue2')],
  };
};
