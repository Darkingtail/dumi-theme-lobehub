import type { IDumiTechStackRuntimeOpts } from 'dumi/tech-stack-utils';
import { defineTechStack, wrapDemoWithFn } from 'dumi/tech-stack-utils';
import hashId from 'hash-sum';

import { compile } from '@/compiler/node';
import type { JsxIncludesConfig } from '@/shared';

interface Vue2JSXTechStackOptions {
  jsxIncludes?: JsxIncludesConfig;
  runtimeOpts: IDumiTechStackRuntimeOpts;
}

/**
 * Check if a file path matches the jsxIncludes config
 * @param filePath - The file path to check
 * @param config - The jsxIncludes config
 * @returns true if the path matches, false otherwise
 */
function matchJsxIncludes(filePath: string, config: JsxIncludesConfig | undefined): boolean {
  // Default: match all jsx/tsx files
  if (config === undefined || config === true) {
    return true;
  }

  // Check if path matches any pattern
  for (const pattern of config) {
    if (typeof pattern === 'string' && filePath.includes(pattern)) {
      return true;
    } else if (pattern instanceof RegExp && pattern.test(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper function to extract file path from MDAST node
 * dumi may store the path in different locations depending on node type
 */
function getFilePathFromNode(node: any): string | undefined {
  return (
    // Direct properties
    (node.properties?.filename as string | undefined) ||
    (node.properties?.src as string | undefined) ||
    // MDX attributes array format
    (node.attributes?.find?.((attr: any) => attr.name === 'src')?.value as string | undefined) ||
    // MDX attributes object format
    (node.attributes?.src as string | undefined) ||
    // Data property (sometimes used by remark plugins)
    (node.data?.src as string | undefined) ||
    (node.data?.filename as string | undefined)
  );
}

/**
 * Check if code content looks like React (uses React hooks or imports)
 * This is a heuristic fallback when file path is not available
 */
function looksLikeReactCode(code: string): boolean {
  // Common React patterns
  const reactPatterns = [
    /\bimport\s+React\b/, // import React
    /\bimport\s+{[^}]*}\s+from\s+["']react["']/, // import { ... } from 'react'
    /\buseState\s*\(/, // useState hook
    /\buseEffect\s*\(/, // useEffect hook
    /\buseReducer\s*\(/, // useReducer hook
    /\buseCallback\s*\(/, // useCallback hook
    /\buseMemo\s*\(/, // useMemo hook
    /\buseRef\s*\(/, // useRef hook
    /\buseContext\s*\(/, // useContext hook
    /\bReact\.FC\b/, // React.FC type
    /\bReact\.Component\b/, // React.Component class
    /:\s*React\./, // TypeScript React types
  ];

  return reactPatterns.some((pattern) => pattern.test(code));
}

export const Vue2JSXTechStack = ({ runtimeOpts, jsxIncludes }: Vue2JSXTechStackOptions) =>
  defineTechStack({
    isSupported(node, lang: string) {
      // Check file extension first
      if (!['jsx', 'tsx'].includes(lang)) {
        return false;
      }

      // If jsxIncludes is not configured or is true, accept all tsx/jsx files
      if (jsxIncludes === undefined || jsxIncludes === true) {
        return true;
      }

      // jsxIncludes is configured with specific patterns
      // Try to get file path from node
      const filePath = getFilePathFromNode(node);

      if (filePath) {
        // File path available - filter based on jsxIncludes config
        return matchJsxIncludes(filePath, jsxIncludes);
      }

      // File path not available (might be inline code or node structure issue)
      // Use code content heuristic as fallback
      const code = ((node as any).value as string | undefined) || '';
      if (code && looksLikeReactCode(code)) {
        // Looks like React code - reject it so React tech stack handles it
        return false;
      }

      // Default: accept as Vue2 JSX (inline Vue demos, or can't determine)
      return true;
    },
    name: 'vue2-tsx',
    onBlockLoad(args) {
      // Check file extension first
      if (!args.path.endsWith('.tsx') && !args.path.endsWith('.jsx')) return null;

      // Check if file path matches jsxIncludes config
      const filePath = args.path || args.filename;
      if (!matchJsxIncludes(filePath, jsxIncludes)) {
        return null; // Let other tech stacks handle this file
      }

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

        // Check if file path matches jsxIncludes config
        if (!matchJsxIncludes(filename, jsxIncludes)) {
          return raw; // Return unchanged, let other tech stacks handle it
        }

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
