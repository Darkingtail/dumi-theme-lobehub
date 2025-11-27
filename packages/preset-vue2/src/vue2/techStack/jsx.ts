import type { IDumiTechStackRuntimeOpts } from 'dumi/tech-stack-utils';
import { defineTechStack, wrapDemoWithFn } from 'dumi/tech-stack-utils';
import hashId from 'hash-sum';

import { compile } from '@/compiler/node';

export const Vue2JSXTechStack = (runtimeOpts: IDumiTechStackRuntimeOpts) =>
  defineTechStack({
    isSupported(node, lang: string) {
      // Support all jsx/tsx files in Vue 2 projects
      // Since this is a Vue 2 preset, we assume all JSX files are Vue JSX
      return ['jsx', 'tsx'].includes(lang);
    },
    name: 'vue2-tsx',
    onBlockLoad(args) {
      // Process all jsx/tsx files
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
