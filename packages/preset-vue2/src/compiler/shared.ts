/**
 * Shared compiler utilities for Vue 2 SFC compilation
 * Used by both Node.js (index.ts) and browser (browser.ts) compilers
 */
import { type SFCDescriptor, compileStyle } from '@vue/compiler-sfc';

// ============================================================================
// Constants
// ============================================================================

/** Component identifier used in compiled output */
export const COMP_IDENTIFIER = '__sfc__';

/** Regex for parsing filename into basename and extension */
export const FILE_EXT_REGEX = /([^.]+)\.([^.]+)$/;

// ============================================================================
// Types
// ============================================================================

/**
 * Options for compiling a Vue SFC
 */
export interface CompileOptions {
  /** Source code of the SFC */
  code: string;
  /** Filename (used for error reporting and scoped CSS) */
  filename: string;
  /** Unique component ID (used for scoped CSS) */
  id: string;
}

/**
 * Result of compilation - either errors or compiled output
 */
export type CompileResult = CompileError | CompileSuccess;

/** Compilation errors */
export type CompileError = Error[];

/** Successful compilation output */
export interface CompileSuccess {
  css: string;
  js: string;
}

/**
 * Type guard to check if result is an error
 */
export function isCompileError(result: CompileResult): result is CompileError {
  return Array.isArray(result);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse filename into basename and extension
 * @param filename - The filename to parse
 * @returns Object with basename and lang (extension)
 * @throws Error if filename format is invalid
 */
export function resolveFilename(filename: string): { basename: string; lang: string } {
  const match = filename.match(FILE_EXT_REGEX);
  if (!match) {
    throw new Error(`[Vue2 Compiler] Invalid filename format: ${filename}`);
  }
  const [, basename, lang] = match;
  return { basename, lang };
}

/**
 * Safely parse filename, returning undefined values if invalid
 */
export function safeResolveFilename(filename: string): { basename?: string; lang?: string } {
  const match = filename.match(FILE_EXT_REGEX);
  if (!match) {
    return { basename: undefined, lang: undefined };
  }
  const [, basename, lang] = match;
  return { basename, lang };
}

/**
 * Generate a safe component ID from filename
 * Replaces all non-alphanumeric characters with underscores
 */
export function generateComponentId(filename: string): string {
  const id = filename.replace(/[^\dA-Za-z]/g, '_');
  return id || 'component';
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Convert any error-like value to an Error instance
 */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return new Error(String((e as { message: unknown }).message));
  }
  return new Error(String(e));
}

/**
 * Convert array of error-like values to Error array
 */
export function toErrorArray(errors: unknown[]): Error[] {
  return errors.map(toError);
}

// ============================================================================
// Style Compilation
// ============================================================================

/**
 * Style preprocessor function type
 * Takes source code and language, returns preprocessed CSS or throws error
 */
export type StylePreprocessor = (source: string, lang: string) => string | Promise<string>;

/**
 * Compile scoped styles from SFC descriptor
 * @param id - Component ID for scoped CSS
 * @param styles - Array of style blocks from SFC descriptor
 * @param filename - Source filename for error reporting
 * @param preprocessor - Optional preprocessor function for LESS/SCSS
 * @returns Compiled CSS string or array of errors
 */
export function compileStyles(
  id: string,
  styles: SFCDescriptor['styles'],
  filename = 'component.vue',
  preprocessor?: StylePreprocessor,
): string | Error[] {
  const styleList: string[] = [];

  for (const style of styles) {
    let source = style.content;
    const lang = style.lang || 'css';

    // Apply preprocessor if style has a preprocessor lang
    if (lang !== 'css' && preprocessor) {
      try {
        const result = preprocessor(source, lang);
        // Handle both sync and async results (for sync context, Promise won't work)
        if (typeof result === 'string') {
          source = result;
        } else {
          // If it's a Promise in a sync context, this will fail - that's expected
          return [new Error(`Preprocessor returned a Promise in sync context for ${lang}`)];
        }
      } catch (error) {
        return [toError(error)];
      }
    }

    const result = compileStyle({
      filename,
      id: `data-v-${id}`,
      scoped: style.scoped || false,
      source,
      trim: true,
    });

    if (result.errors && result.errors.length) {
      return result.errors.map((e) => (e instanceof Error ? e : new Error(String(e))));
    }

    styleList.push(result.code);
  }

  return styleList.join('\n');
}

/**
 * Async version of compileStyles for browser usage
 */
export async function compileStylesAsync(
  id: string,
  styles: SFCDescriptor['styles'],
  filename = 'component.vue',
  preprocessor?: (source: string, lang: string) => string | Promise<string>,
): Promise<string | Error[]> {
  const styleList: string[] = [];

  for (const style of styles) {
    let source = style.content;
    const lang = style.lang || 'css';

    // Apply preprocessor if style has a preprocessor lang
    if (lang !== 'css' && preprocessor) {
      try {
        source = await preprocessor(source, lang);
      } catch (error) {
        return [toError(error)];
      }
    }

    const result = compileStyle({
      filename,
      id: `data-v-${id}`,
      scoped: style.scoped || false,
      source,
      trim: true,
    });

    if (result.errors && result.errors.length) {
      return result.errors.map((e) => (e instanceof Error ? e : new Error(String(e))));
    }

    styleList.push(result.code);
  }

  return styleList.join('\n');
}

/** Supported style languages */
export const SUPPORTED_STYLE_LANGS = ['css', 'less', 'scss', 'sass'] as const;

/**
 * Check if style has unsupported preprocessor
 * Note: less/scss/sass are now supported
 */
export function hasUnsupportedStyleLang(styles: SFCDescriptor['styles']): boolean {
  return styles.some((style) => style.lang && !SUPPORTED_STYLE_LANGS.includes(style.lang as any));
}

/**
 * Check if any style uses CSS modules
 */
export function hasStyleModule(styles: SFCDescriptor['styles']): boolean {
  return styles.some((style) => style.module);
}

/**
 * Check if styles have scoped attribute
 */
export function hasScoped(styles: SFCDescriptor['styles']): boolean {
  return styles.some((style) => style.scoped);
}

// ============================================================================
// Code Generation Helpers
// ============================================================================

/**
 * Generate scoped ID assignment code for Vue 2
 * Vue 2 uses _scopeId (single underscore)
 */
export function generateScopedIdCode(id: string): string {
  return `${COMP_IDENTIFIER}._scopeId = "data-v-${id}";`;
}

/**
 * Generate CSS attachment code for runtime
 */
export function generateCssCode(css: string): string {
  return `${COMP_IDENTIFIER}.__css__ = ${JSON.stringify(css)};`;
}

/**
 * Generate component ID attachment code
 */
export function generateIdCode(id: string): string {
  return `${COMP_IDENTIFIER}.__id__ = "${id}";`;
}

/**
 * Generate component name code
 */
export function generateNameCode(name: string): string {
  return `${COMP_IDENTIFIER}.name = "${name}";`;
}

/**
 * Generate warning for unsupported features
 */
export function generateWarning(message: string): string {
  return `console.warn(${JSON.stringify(message)});`;
}

/**
 * Warning messages for unsupported features
 */
export const WARNINGS = {
  PREPROCESSOR:
    'Custom preprocessors for <template> and <style> are not supported in the Codeblock.',
  STYLE_MODULE: '<style module> is not supported in the Codeblock.',
} as const;
