/**
 * Type definitions for atomParser
 * Re-export dumi-assets-types with additional utilities
 */

// Re-export from dumi-assets-types for internal use
export type { AtomComponentAsset, AtomFunctionAsset } from 'dumi-assets-types';
export type {
  ArrayPropertySchema,
  BasePropertySchema,
  FunctionArgSchema,
  FunctionPropertySchema,
  ObjectPropertySchema,
  PropertySchema,
  PropertySourceReference,
} from 'dumi-assets-types/typings/atom/props';

/**
 * Parser result interface matching dumi's IAtomAssetsParserResult
 */
export interface IAtomAssetsParserResult {
  components: Record<string, import('dumi-assets-types').AtomComponentAsset>;
  functions: Record<string, import('dumi-assets-types').AtomFunctionAsset>;
}

/**
 * File patch event for incremental updates
 */
export interface IPatchFile {
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  fileName: string;
}

/**
 * Language meta parser interface matching dumi's ILanguageMetaParser
 */
export interface ILanguageMetaParser {
  destroy(): Promise<void>;
  parse(): Promise<IAtomAssetsParserResult>;
  patch(file: IPatchFile): void;
}

/**
 * Vue2MetaParser configuration options
 */
export interface Vue2MetaParserOptions {
  /**
   * Entry file for resolving components
   */
  entryFile: string;

  /**
   * Additional parsing options for vue-docgen-api
   */
  parseOptions?: {
    /**
     * Additional file extensions to parse
     */
    addScriptHandlers?: any[];

    /**
     * Additional template handlers
     */
    addTemplateHandlers?: any[];

    /**
     * Alias configuration for path resolution
     */
    alias?: Record<string, string>;

    /**
     * Validation function to determine whether to parse a file
     */
    validExtends?: (fullFilePath: string) => boolean;
  };

  /**
   * Base directory for resolving relative paths
   */
  resolveDir: string;

  /**
   * Filter function to determine which files to parse
   */
  resolveFilter?: (filePath: string) => boolean;

  /**
   * Unpkg host for external documentation links
   */
  unpkgHost?: string;
}
