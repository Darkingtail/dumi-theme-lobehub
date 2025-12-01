/**
 * Vue 2 Atom Parser for dumi
 *
 * Extracts component metadata (props, events, slots) from Vue 2 components
 * using vue-docgen-api and transforms them to dumi's atom asset format.
 *
 * Supports:
 * - Vue 2 SFC (.vue files)
 * - Vue 2 JSX/TSX components
 * - Options API (export default { props: {...} })
 * - Vue.extend() pattern
 * - defineComponent() with Composition API
 * - <script setup> (Vue 2.7+)
 */
import type { AtomComponentAsset } from 'dumi-assets-types';
import { BaseAtomAssetsParser } from 'dumi/dist/assetParsers/BaseParser';
import { glob } from 'glob';
import path from 'node:path';
import { parse as parseVueComponent } from 'vue-docgen-api';

import { transformComponentDoc } from './transformer';
import type {
  IAtomAssetsParserResult,
  ILanguageMetaParser,
  IPatchFile,
  Vue2MetaParserOptions,
} from './types';

/**
 * Vue 2 Meta Parser
 * Implements dumi's ILanguageMetaParser interface
 */
export class Vue2MetaParser implements ILanguageMetaParser {
  private entryFile: string;
  private resolveDir: string;
  private resolveFilter?: (filePath: string) => boolean;
  private parseOptions?: Vue2MetaParserOptions['parseOptions'];
  private unresolvedFiles: Set<string> = new Set();
  private cachedResult: IAtomAssetsParserResult | null = null;

  constructor(opts: Vue2MetaParserOptions) {
    this.entryFile = opts.entryFile;
    this.resolveDir = opts.resolveDir;
    this.resolveFilter = opts.resolveFilter;
    this.parseOptions = opts.parseOptions;
  }

  /**
   * Parse all Vue components in the resolve directory
   */
  async parse(): Promise<IAtomAssetsParserResult> {
    const result: IAtomAssetsParserResult = {
      components: {},
      functions: {},
    };

    try {
      // Find all Vue component files
      const patterns = ['**/*.vue', '**/index.tsx', '**/index.ts', '**/index.jsx', '**/index.js'];

      const allFiles: string[] = [];

      for (const pattern of patterns) {
        const files = await glob(pattern, {
          absolute: true,
          cwd: this.resolveDir,
          ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/demo/**', '**/demos/**'],
        });
        allFiles.push(...files);
      }

      // Remove duplicates
      const uniqueFiles = [...new Set(allFiles)];

      // Filter files if filter function is provided
      const filesToParse = this.resolveFilter
        ? uniqueFiles.filter(this.resolveFilter)
        : uniqueFiles;

      // Parse each file
      for (const filePath of filesToParse) {
        try {
          const asset = await this.parseFile(filePath);
          if (asset) {
            result.components[asset.id] = asset;
          }
        } catch (error) {
          // Log error but continue parsing other files
          console.warn(`[Vue2MetaParser] Failed to parse ${filePath}:`, error);
          this.unresolvedFiles.add(filePath);
        }
      }

      this.cachedResult = result;
      return result;
    } catch (error) {
      console.error('[Vue2MetaParser] Parse error:', error);
      return result;
    }
  }

  /**
   * Parse a single Vue component file
   */
  private async parseFile(filePath: string): Promise<AtomComponentAsset | null> {
    const ext = path.extname(filePath).toLowerCase();

    // Skip non-component files
    if (!['.vue', '.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
      return null;
    }

    try {
      // Use vue-docgen-api to parse the component
      const doc = await parseVueComponent(filePath, {
        addScriptHandlers: this.parseOptions?.addScriptHandlers,
        alias: this.parseOptions?.alias,
        validExtends: this.parseOptions?.validExtends,
      });

      // Transform to dumi format
      return transformComponentDoc(doc, filePath);
    } catch (error) {
      // Some files may not be valid Vue components
      // This is expected for utility files, types, etc.
      throw error;
    }
  }

  /**
   * Handle file changes for incremental updates
   */
  patch(file: IPatchFile): void {
    // Invalidate cache on any file change
    this.cachedResult = null;

    switch (file.event) {
      case 'add':
      case 'change': {
        // Remove from unresolved if it was there
        this.unresolvedFiles.delete(file.fileName);
        break;
      }
      case 'unlink': {
        // Clean up
        this.unresolvedFiles.delete(file.fileName);
        break;
      }
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.cachedResult = null;
    this.unresolvedFiles.clear();
  }
}

/**
 * Vue2AtomAssetsParser - Wrapper that integrates Vue2MetaParser with dumi's BaseAtomAssetsParser
 * This provides file watching and proper lifecycle management
 */
export class Vue2AtomAssetsParser extends BaseAtomAssetsParser<Vue2MetaParser> {
  constructor(opts: Vue2MetaParserOptions) {
    const parser = new Vue2MetaParser(opts);

    super({
      entryFile: opts.entryFile,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
handleWatcher: (watcher: any, { parse, patch }: any) => {
        watcher.on('all', (event: string, filePath: string) => {
          // Only handle Vue component files
          if (
            /\.(vue|tsx?|jsx?)$/.test(filePath) &&
            !filePath.includes('node_modules') &&
            !filePath.endsWith('.d.ts')
          ) {
            patch({
              event: event as IPatchFile['event'],
              fileName: filePath,
            });
            parse();
          }
        });
        return watcher;
      },
      
parser,
      
      resolveDir: opts.resolveDir,
      watchOptions: {
        ignored: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/demo/**', '**/demos/**'],
      },
    });
  }
}

/**
 * Factory function to create Vue2AtomAssetsParser
 * This follows dumi's pattern for registering asset parsers
 */
export function createVue2AtomParser(opts: Vue2MetaParserOptions) {
  return new Vue2AtomAssetsParser(opts);
}

// Export types

export { transformComponentDoc } from './transformer';
export {type IAtomAssetsParserResult, type ILanguageMetaParser, type IPatchFile, type Vue2MetaParserOptions} from './types';