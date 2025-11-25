// Type declarations for modules without types

declare module 'vue-loader/lib/plugin' {
  import { WebpackPluginInstance } from 'webpack';

  const VueLoaderPlugin: new () => WebpackPluginInstance;
  export default VueLoaderPlugin;
}

declare module 'vue/compiler-sfc' {
  import type * as VueTemplateCompiler from 'vue-template-compiler';

  export interface SFCBlock {
    attrs: Record<string, string | true>;
    content: string;
    end?: number;
    lang?: string;
    module?: string | boolean;
    scoped?: boolean;
    setup?: boolean;
    src?: string;
    start?: number;
    type: string;
  }

  export interface SFCDescriptor {
    cssVars: string[];
    customBlocks: SFCBlock[];
    errors: (string | Error)[];
    filename: string;
    script: SFCBlock | null;
    scriptSetup: SFCBlock | null;
    shouldForceReload?: boolean;
    source?: string;
    styles: SFCBlock[];
    template: SFCBlock | null;
  }

  export interface ParseComponentOptions {
    compiler?: typeof VueTemplateCompiler;
    filename?: string;
    pad?: boolean | 'line' | 'space';
    sourceMap?: boolean;
  }

  export function parseComponent(source: string, options?: ParseComponentOptions): SFCDescriptor;

  export function parse(
    source: string,
    options?: { filename?: string },
  ): {
    cssVars: string[];
    customBlocks: SFCBlock[];
    errors: (string | Error)[];
    filename: string;
    script: SFCBlock | null;
    scriptSetup: SFCBlock | null;
    styles: SFCBlock[];
    template: SFCBlock | null;
  };

  export interface CompileScriptOptions {
    babelParserPlugins?: string[];
    id: string;
    inlineTemplate?: boolean;
    isProd?: boolean;
    refSugar?: boolean;
    templateOptions?: Record<string, unknown>;
  }

  export interface CompiledScript {
    bindings?: Record<string, string>;
    content: string;
    loc?: {
      end: number;
      start: number;
    };
    scriptAst?: unknown;
    scriptSetupAst?: unknown;
  }

  export function compileScript(sfc: SFCDescriptor, options: CompileScriptOptions): CompiledScript;

  export interface TemplateCompileOptions {
    compiler?: typeof VueTemplateCompiler;
    compilerOptions?: Record<string, unknown>;
    filename: string;
    isFunctional?: boolean;
    isProduction?: boolean;
    optimizeSSR?: boolean;
    source: string;
    transformAssetUrls?: boolean | Record<string, string[]>;
  }

  export interface TemplateCompileResult {
    code: string;
    errors: (string | Error)[];
    source: string;
    staticRenderFns?: string[];
    tips: string[];
  }

  export function compileTemplate(options: TemplateCompileOptions): TemplateCompileResult;

  export interface StyleCompileOptions {
    filename: string;
    id: string;
    preprocessLang?: string;
    preprocessOptions?: Record<string, unknown>;
    scoped?: boolean;
    source: string;
    trim?: boolean;
  }

  export interface StyleCompileResult {
    code: string;
    errors: Error[];
    map?: object;
    rawResult?: object;
  }

  export function compileStyle(options: StyleCompileOptions): StyleCompileResult;
  export function compileStyleAsync(options: StyleCompileOptions): Promise<StyleCompileResult>;

  export function rewriteDefault(input: string, as: string): string;
  export function generateCodeFrame(source: string, start?: number, end?: number): string;
}

declare module '@vue/component-compiler-utils' {
  import type * as VueTemplateCompiler from 'vue-template-compiler';

  export interface SFCBlock {
    attrs: Record<string, string>;
    content: string;
    end?: number;
    lang?: string;
    module?: string | boolean;
    scoped?: boolean;
    src?: string;
    start?: number;
    type: string;
  }

  export interface SFCDescriptor {
    customBlocks: SFCBlock[];
    errors: string[];
    script: SFCBlock | null;
    styles: SFCBlock[];
    template: SFCBlock | null;
  }

  export interface ParseOptions {
    compiler?: typeof VueTemplateCompiler;
    filename?: string;
    needMap?: boolean;
    source: string;
    sourceMap?: boolean;
  }

  export function parse(options: ParseOptions): SFCDescriptor;

  export interface TemplateCompileOptions {
    compiler: typeof VueTemplateCompiler;
    compilerOptions?: Record<string, unknown>;
    filename: string;
    isFunctional?: boolean;
    isProduction?: boolean;
    optimizeSSR?: boolean;
    source: string;
  }

  export interface TemplateCompileResult {
    code: string;
    errors: (string | Error)[];
    source: string;
    staticRenderFns?: string[];
    tips: string[];
  }

  export function compileTemplate(options: TemplateCompileOptions): TemplateCompileResult;

  export interface StyleCompileOptions {
    filename: string;
    id: string;
    preprocessLang?: string;
    preprocessOptions?: Record<string, unknown>;
    scoped?: boolean;
    source: string;
    trim?: boolean;
  }

  export interface StyleCompileResult {
    code: string;
    errors: Error[];
    map?: object;
    rawResult?: object;
  }

  export function compileStyle(options: StyleCompileOptions): StyleCompileResult;
}
