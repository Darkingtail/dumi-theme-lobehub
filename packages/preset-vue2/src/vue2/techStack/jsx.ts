import type { IDumiTechStackRuntimeOpts } from 'dumi/tech-stack-utils';
import { defineTechStack, wrapDemoWithFn } from 'dumi/tech-stack-utils';
import hashId from 'hash-sum';

import { compile } from '@/compiler/node';

export const Vue2JSXTechStack = (runtimeOpts: IDumiTechStackRuntimeOpts) =>
  defineTechStack({
    isSupported(node, lang: string) {
      // Only support jsx/tsx files that are explicitly in a vue2 directory
      // to avoid conflicts with React TSX files in mixed projects
      if (!['jsx', 'tsx'].includes(lang)) return false;
      const filePath = String(node?.properties?.src || '');
      return filePath.includes('/vue2/') || filePath.includes('/vue2-');
    },
    name: 'vue2-tsx',
    onBlockLoad(args) {
      // Only process files in vue2 directories
      if (!args.path.includes('/vue2/') && !args.path.includes('/vue2-')) return null;
      if (!args.path.endsWith('.tsx') && !args.path.endsWith('.jsx')) return null;
      const { filename } = args;
      return {
        content: compile({
          code: args.entryPointCode,
          filename,
          id: filename,
        }) as string,
        type: 'tsx',
      };
    },
    runtimeOpts,
    transformCode(raw, opts) {
      if (opts.type === 'code-block') {
        const filename = opts.fileAbsPath;

        const result = compile({
          code: raw,
          filename,
          id: hashId(raw),
        }) as string;

        if (result) {
          const code = wrapDemoWithFn(result, {
            filename,
            parserConfig: {
              syntax: 'ecmascript',
            },
          });
          return `(${code})()`;
        }
      }
      return raw;
    },
  });
