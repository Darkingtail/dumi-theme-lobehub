import { logger } from 'dumi/plugin-utils';
import type { IDumiTechStackRuntimeOpts } from 'dumi/tech-stack-utils';
import { defineTechStack, wrapDemoWithFn } from 'dumi/tech-stack-utils';
import hashId from 'hash-sum';
import fs from 'node:fs';
import path from 'node:path';

import { compile, compiler } from '@/compiler/node';
import { createErrorComponentCode } from '@/compiler/shared';

interface Vue2SfcTechStackOptions {
  /** Additional modules to include in live editing context */
  resolveMap?: string[];
  runtimeOpts: IDumiTechStackRuntimeOpts;
}

export const Vue2SfcTechStack = ({
  runtimeOpts,
  resolveMap: userResolveMap,
}: Vue2SfcTechStackOptions) =>
  defineTechStack({
    /**
     * Ensure asset.dependencies has FILE entries for proper PreviewerActions rendering.
     * This is needed because dumi's block.js only adds FILE dependencies for extensions
     * in DEFAULT_DEMO_MODULE_EXTENSIONS (.js, .jsx, .ts, .tsx), but Vue uses .vue files.
     */
    generateMetadata(asset, opts) {
      // Check if there are any FILE dependencies
      const hasFileEntry = Object.values(asset.dependencies).some((dep) => dep.type === 'FILE');

      if (!hasFileEntry) {
        // Read the source file and add it as FILE dependency
        let sourceCode = opts.entryPointCode || '';
        if (!sourceCode && opts.fileAbsPath) {
          try {
            sourceCode = fs.readFileSync(opts.fileAbsPath, 'utf8');
          } catch {
            // If file can't be read, use empty string
            sourceCode = '';
          }
        }

        // Determine the entry filename
        const entryFilename = opts.fileAbsPath
          ? path.basename(opts.fileAbsPath)
          : asset.entry || 'index.vue';

        // Add the FILE dependency
        asset.dependencies[entryFilename] = {
          type: 'FILE',
          value: sourceCode,
        };

        // Ensure entry is set
        if (!asset.entry) {
          asset.entry = entryFilename;
        }
      }

      return asset;
    },

    /**
     * Add Vue and other modules to the resolveMap for live editing support.
     * This ensures that `require('vue')` and other modules can resolve in the browser context.
     */
    generateSources(resolveMap) {
      // Add 'vue' to resolveMap so it's available in live editing context
      if (!resolveMap['vue']) {
        resolveMap['vue'] = 'vue';
      }
      // Add user-configured modules
      if (userResolveMap) {
        for (const mod of userResolveMap) {
          if (!resolveMap[mod]) {
            resolveMap[mod] = mod;
          }
        }
      }
      return resolveMap;
    },
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

        // P0 Optimization: Generate error component instead of returning empty string
        if (Array.isArray(js)) {
          const errorMsg = js.map((e) => e.message || String(e)).join('\n');
          logger.error('[Vue2 SFC Compile Error]', errorMsg);
          const errorCode = createErrorComponentCode(errorMsg, raw);
          const code = wrapDemoWithFn(errorCode, {
            filename,
            parserConfig: {
              syntax: 'ecmascript',
            },
          });
          return `(${code})()`;
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
