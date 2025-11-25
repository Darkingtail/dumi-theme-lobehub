import { logger } from 'dumi/plugin-utils';
import type { IDumiTechStackRuntimeOpts } from 'dumi/tech-stack-utils';
import { defineTechStack, wrapDemoWithFn } from 'dumi/tech-stack-utils';
import hashId from 'hash-sum';

import { compile, compiler } from '@/compiler/node';

export const Vue2SfcTechStack = (runtimeOpts: IDumiTechStackRuntimeOpts) =>
  defineTechStack({
    isSupported(_, lang: string) {
      return ['vue'].includes(lang);
    },
    name: 'vue2-sfc',
    onBlockLoad(args) {
      if (!args.path.endsWith('.vue')) return null;
      const result = compiler.compileSFC({
        code: args.entryPointCode,
        filename: args.filename,
        id: args.path,
      });
      return {
        content: Array.isArray(result) ? '' : result.js,
        type: 'tsx',
      };
    },
    runtimeOpts,
    transformCode(raw, opts) {
      if (opts.type === 'code-block') {
        const filename = opts.fileAbsPath;
        const id = hashId(raw);

        const js = compile({ code: raw, filename, id });
        if (Array.isArray(js)) {
          logger.error(js);
          return '';
        }

        const code = wrapDemoWithFn(js, {
          filename,
          parserConfig: {
            syntax: 'ecmascript',
          },
        });
        return `(${code})()`;
      }
      return raw;
    },
  });
