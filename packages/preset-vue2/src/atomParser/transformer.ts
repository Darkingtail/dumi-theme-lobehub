/**
 * Transform vue-docgen-api output to dumi's atom asset format
 */
import type { AtomComponentAsset } from 'dumi-assets-types';
import type {
  ComponentDoc,
  EventDescriptor,
  MethodDescriptor,
  PropDescriptor,
  SlotDescriptor,
} from 'vue-docgen-api';

import type { ObjectPropertySchema, PropertySchema } from './types';

// Extended type for vue-docgen-api's type descriptor (may have elements for union types)
interface ExtendedTypeDesc {
  elements?: Array<{ name: string; value?: string }>;
  func?: boolean;
  name: string;
}

// Extended tag type that may have description
interface ExtendedBlockTag {
  content?: string;
  description?: string;
  title?: string;
}

/**
 * Check if a type name represents a primitive type
 */
function isPrimitiveType(typeName: string | undefined): boolean {
  if (!typeName) return false;
  const lower = typeName.toLowerCase();
  return ['string', 'number', 'boolean', 'null', 'undefined', 'any', 'void', 'never'].includes(
    lower,
  );
}

/**
 * Check if a type name represents an array type
 */
function isArrayType(typeName: string | undefined): boolean {
  if (!typeName) return false;
  return typeName.endsWith('[]') || typeName.toLowerCase().startsWith('array');
}

/**
 * Check if a type name represents a function type
 */
function isFunctionType(typeName: string | undefined): boolean {
  if (!typeName) return false;
  return (
    typeName.includes('=>') ||
    typeName.toLowerCase() === 'function' ||
    typeName.toLowerCase() === 'func'
  );
}

/**
 * Convert vue-docgen-api type to dumi PropertySchema type
 * Enhanced: Better TypeScript type inference
 */
function convertType(type: PropDescriptor['type'] | undefined): PropertySchema['type'] | undefined {
  if (!type) return undefined;

  const typeName = type.name;
  const lowerTypeName = typeName?.toLowerCase();

  // Handle primitive types
  switch (lowerTypeName) {
    case 'string': {
      return 'string';
    }
    case 'number': {
      return 'number';
    }
    case 'boolean': {
      return 'boolean';
    }
    case 'array': {
      return 'array';
    }
    case 'object': {
      return 'object';
    }
    case 'function':
    case 'func': {
      return 'function';
    }
  }

  // Infer type from TypeScript type patterns
  if (typeName) {
    // Array types: User[], Array<User>, etc.
    if (isArrayType(typeName)) {
      return 'array';
    }
    // Function types: (arg: Type) => ReturnType
    if (isFunctionType(typeName)) {
      return 'function';
    }
    // Everything else (interfaces, custom types) defaults to 'object'
    // The actual type name will be preserved in className or as reference
    return 'object';
  }

  return 'string';
}

/**
 * Parse default value from vue-docgen-api format
 */
function parseDefaultValue(defaultValue: PropDescriptor['defaultValue']): unknown {
  if (!defaultValue) return undefined;

  const value = defaultValue.value;
  if (value === undefined || value === null) return undefined;

  // Try to parse JSON if it's a string representation
  if (typeof value === 'string') {
    // Handle function default values
    if (value.startsWith('function') || value.includes('=>')) {
      return value;
    }
    // Handle common primitives
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    // Try parsing as number
    const num = Number(value);
    if (!isNaN(num)) return num;
    // Try parsing as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as-is if not parseable
      return value;
    }
  }

  return value;
}

/**
 * Extract enum values from prop
 * P1 Enhancement: Prioritize prop.values from validator function
 */
function extractEnumValues(
  prop: PropDescriptor,
  type: PropDescriptor['type'] | undefined,
): unknown[] | undefined {
  // P1 Enhancement: First check prop.values (from validator function)
  // vue-docgen-api extracts these from validator: (v) => ['a', 'b'].includes(v)
  const propWithValues = prop as PropDescriptor & { values?: string[] };
  if (
    propWithValues.values &&
    Array.isArray(propWithValues.values) &&
    propWithValues.values.length > 0
  ) {
    return propWithValues.values;
  }

  if (!type) return undefined;

  const extType = type as ExtendedTypeDesc;

  // Handle union types like 'primary' | 'secondary' | 'danger'
  if (type.name === 'union' && extType.elements) {
    const values = extType.elements
      .map((el) => {
        if (el.value && typeof el.value === 'string') {
          // Remove quotes from string literals
          return el.value.replace(/^["']|["']$/g, '');
        }
        return el.name;
      })
      .filter(Boolean);
    return values.length > 0 ? values : undefined;
  }

  // Handle TSUnionType with elements
  if (extType.elements && Array.isArray(extType.elements)) {
    const values = extType.elements
      .filter((el) => el.name !== 'undefined' && el.name !== 'null')
      .map((el) => {
        if (el.value) return el.value;
        return el.name;
      })
      .filter(Boolean);
    return values.length > 0 ? values : undefined;
  }

  return undefined;
}

/**
 * Get description from tag value
 */
function getTagDescription(tagValue: unknown): string | true {
  if (typeof tagValue === 'object' && tagValue !== null) {
    const tag = tagValue as ExtendedBlockTag;
    return tag.description || tag.content || true;
  }
  return true;
}

/**
 * Transform a single prop descriptor to dumi PropertySchema
 * Enhanced: Better TypeScript type support with reference types
 */
function transformProp(prop: PropDescriptor): Record<string, unknown> {
  const typeName = prop.type?.name;
  const isComplexType = typeName && !isPrimitiveType(typeName);

  // Use Record type for flexibility with complex TypeScript types
  const schema: Record<string, unknown> = {
    tags: {},
  };

  // Add title (prop name is usually the title)
  if (prop.name) {
    schema.title = prop.name;
  }

  // Add description from JSDoc
  if (prop.description) {
    schema.description = prop.description;
  }

  // Add default value
  const defaultValue = parseDefaultValue(prop.defaultValue);
  if (defaultValue !== undefined) {
    schema.default = defaultValue;
  }

  // P1 Enhancement: Add enum values (from validator or union types)
  const enumValues = extractEnumValues(prop, prop.type);
  if (enumValues) {
    schema.enum = enumValues;
  }

  // TypeScript Enhancement: Handle complex types with reference format
  if (isComplexType) {
    // For function types, use function type with signature
    if (isFunctionType(typeName)) {
      schema.type = 'function';
      schema.className = typeName;
      // Try to build a simple signature from the type string
      schema.signature = {
        arguments: [],
        isAsync: false,
        returnType: { type: 'void' },
      };
    }
    // For array types with items
    else if (isArrayType(typeName)) {
      schema.type = 'array';
      // Extract item type from TypeName[] or Array<TypeName>
      const itemType = typeName.replace(/\[]$/, '').replace(/^Array<(.+)>$/, '$1');
      if (itemType && itemType !== typeName) {
        schema.items = {
          name: itemType,
          type: 'reference',
        };
      }
      schema.className = typeName;
    }
    // For other complex types (interfaces, custom types), use reference
    else {
      schema.type = 'reference';
      schema.name = typeName;
    }
  } else {
    // For primitive types, use standard type
    schema.type = convertType(prop.type) || 'string';
    if (typeName) {
      schema.className = typeName;
    }
  }

  // Add JSDoc tags
  if (prop.tags) {
    const tags: Record<string, unknown> = {};
    for (const [key, tagValues] of Object.entries(prop.tags)) {
      if (Array.isArray(tagValues) && tagValues.length > 0) {
        // Get description from first tag value
        tags[key] = getTagDescription(tagValues[0]);
      }
    }
    if (Object.keys(tags).length > 0) {
      schema.tags = tags;
    }
  }

  return schema;
}

/**
 * Transform props array to dumi ObjectPropertySchema
 * Enhanced: Support for TypeScript complex types
 */
function transformProps(props: PropDescriptor[]): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const prop of props) {
    if (prop.name) {
      properties[prop.name] = transformProp(prop);

      // Check if prop is required
      if (prop.required) {
        required.push(prop.name);
      }
    }
  }

  return {
    properties,
    required: required.length > 0 ? required : undefined,
    type: 'object',
  };
}

/**
 * Get type name from vue-docgen-api type descriptor
 */
function getTypeName(type: { name?: string; names?: string[] } | undefined): string {
  if (!type) return 'any';
  if (type.name) return type.name;
  if (type.names && type.names.length > 0) return type.names.join(' | ');
  return 'any';
}

/**
 * Transform events array to dumi ObjectPropertySchema
 * Enhanced: Uses signature structure matching Vue 3 format for proper type display
 */
function transformEvents(events: EventDescriptor[]): ObjectPropertySchema {
  const properties: Record<string, PropertySchema> = {};

  for (const event of events) {
    if (event.name) {
      // Build signature structure matching Vue 3 format
      const eventArgs = (event.properties || []).map((arg) => {
        const argWithType = arg as { name?: string; type?: { name?: string; names?: string[] } };
        const typeName = getTypeName(argWithType.type);
        return {
          hasQuestionToken: false,
          key: argWithType.name || 'arg',
          schema: {
            name: typeName,
            type: 'reference' as const,
          },
        };
      });

      const schema: PropertySchema & { signature?: unknown; title?: string } = {
        signature: {
          arguments: eventArgs,
          isAsync: false,
          returnType: { type: 'void' },
        },
        tags: {},
        title: event.name,
        type: 'function',
      };

      if (event.description) {
        schema.description = event.description;
      }

      // Add JSDoc tags
      if (event.tags) {
        const tags: Record<string, unknown> = {};
        for (const [key, tagValues] of Object.entries(event.tags)) {
          if (Array.isArray(tagValues) && tagValues.length > 0) {
            tags[key] = getTagDescription(tagValues[0]);
          }
        }
        if (Object.keys(tags).length > 0) {
          schema.tags = tags;
        }
      }

      properties[event.name] = schema;
    }
  }

  return {
    properties,
    type: 'object',
  };
}

/**
 * Transform methods array to dumi ObjectPropertySchema (for imperativeConfig)
 * Enhanced: Uses Vue 3 format with signature structure for proper API table display
 */
function transformMethods(methods: MethodDescriptor[]): ObjectPropertySchema {
  const properties: Record<string, PropertySchema> = {};

  for (const method of methods) {
    if (method.name) {
      // Build arguments array for signature
      const methodArgs = (method.params || []).map((param) => {
        const typeName = param.type?.name || 'any';
        return {
          hasQuestionToken: false,
          key: param.name || 'arg',
          schema: {
            name: typeName,
            type: 'reference' as const,
          },
        };
      });

      // Get return type
      const returnTypeName = method.returns?.type?.name || 'void';

      // Use Record type to avoid TypeScript strict type checking
      const schema: Record<string, unknown> = {
        signature: {
          arguments: methodArgs,
          isAsync: false,
          returnType: {
            type: returnTypeName === 'void' ? 'void' : 'reference',
            ...(returnTypeName !== 'void' && { name: returnTypeName }),
          },
        },
        tags: {},
        title: method.name,
        type: 'function',
      };

      if (method.description) {
        schema.description = method.description;
      }

      // Add JSDoc tags
      if (method.tags) {
        const tags: Record<string, unknown> = {};
        for (const [key, tagValues] of Object.entries(method.tags)) {
          if (Array.isArray(tagValues) && tagValues.length > 0) {
            tags[key] = getTagDescription(tagValues[0]);
          }
        }
        if (Object.keys(tags).length > 0) {
          schema.tags = tags;
        }
      }

      properties[method.name] = schema as PropertySchema;
    }
  }

  return {
    properties,
    type: 'object',
  };
}

/**
 * Transform slots array to dumi ObjectPropertySchema
 * Enhanced: Uses Vue 3 format with type: reference for proper API table display
 */
function transformSlots(slots: SlotDescriptor[]): ObjectPropertySchema {
  const properties: Record<string, PropertySchema> = {};

  for (const slot of slots) {
    if (slot.name) {
      // Use Vue 3 format: type: reference with name
      // Using Record type to avoid TypeScript strict type checking since dumi accepts this format
      const schema: Record<string, unknown> = {
        name: 'VNodeChild',
        tags: {},
        title: slot.name,
        type: 'reference',
      };

      if (slot.description) {
        schema.description = slot.description;
      }

      // If slot has bindings (scoped slot), create object type with properties
      if (slot.bindings && slot.bindings.length > 0) {
        const bindingProperties: Record<string, PropertySchema> = {};
        const required: string[] = [];

        for (const binding of slot.bindings) {
          const bindingWithType = binding as {
            description?: string;
            name?: string;
            title?: string;
            type?: { name?: string };
          };
          const bindingName = bindingWithType.name || bindingWithType.title || 'binding';
          const bindingType = bindingWithType.type?.name || 'any';

          bindingProperties[bindingName] = {
            description: bindingWithType.description || '',
            tags: {},
            title: bindingName,
            type: bindingType as PropertySchema['type'],
          } as PropertySchema;
          required.push(bindingName);
        }

        // Override to object type for scoped slots
        schema.type = 'object';
        schema.properties = bindingProperties;
        schema.required = required;
        delete schema.name;
      }

      // Add JSDoc tags
      if (slot.tags) {
        const tags: Record<string, unknown> = {};
        for (const [key, tagValues] of Object.entries(slot.tags)) {
          if (Array.isArray(tagValues) && tagValues.length > 0) {
            tags[key] = getTagDescription(tagValues[0]);
          }
        }
        if (Object.keys(tags).length > 0) {
          schema.tags = tags;
        }
      }

      properties[slot.name] = schema as PropertySchema;
    }
  }

  return {
    properties,
    type: 'object',
  };
}

/**
 * Transform vue-docgen-api ComponentDoc to dumi AtomComponentAsset
 * Enhanced: Support for TypeScript complex types
 */
export function transformComponentDoc(
  doc: ComponentDoc,
  filePath: string,
): AtomComponentAsset | null {
  // Use displayName or extract from file path
  const componentName =
    doc.displayName ||
    filePath
      .split('/')
      .pop()
      ?.replace(/\.(vue|tsx?|jsx?)$/, '') ||
    'Component';

  // Must have at least props to be useful
  if ((!doc.props || doc.props.length === 0) && // Still create basic component asset for components without props
    // They might have events, slots, or methods
    !doc.events?.length && !doc.slots?.length && !doc.methods?.length) {
      return null;
    }

  // Use Record type for propsConfig to support TypeScript complex types
  const propsConfig: Record<string, unknown> = doc.props?.length
    ? transformProps(doc.props)
    : { properties: {}, type: 'object' };

  // Add description from JSDoc
  if (doc.description) {
    // Add to propsConfig as that's where dumi looks for component description
    propsConfig.description = doc.description;
  }

  const asset: AtomComponentAsset = {
    id: componentName,
    propsConfig: propsConfig as unknown as ObjectPropertySchema,
    title: doc.displayName || componentName,
    type: 'COMPONENT',
  };

  // Add events
  if (doc.events && doc.events.length > 0) {
    asset.eventsConfig = transformEvents(doc.events);
  }

  // Add slots
  if (doc.slots && doc.slots.length > 0) {
    asset.slotsConfig = transformSlots(doc.slots);
  }

  // P1 Enhancement: Add methods (imperative/expose)
  // Include methods that are:
  // 1. Marked with @public tag
  // 2. Marked with @expose tag
  // 3. Have JSDoc description (documented = intended to be public)
  if (doc.methods && doc.methods.length > 0) {
    const publicMethods = doc.methods.filter((method) => {
      // Check for @public tag
      const accessTags = method.tags?.access as Array<{ description?: string }> | undefined;
      if (accessTags?.some((a) => a.description === 'public')) return true;

      // Check for @expose tag (Vue 3 style, but useful for Vue 2 too)
      const exposeTags = method.tags?.expose as Array<{ description?: string }> | undefined;
      if (exposeTags && exposeTags.length > 0) return true;

      // Check if method has JSDoc description (documented methods are likely public)
      if (method.description && method.description.trim().length > 0) return true;

      return false;
    });
    if (publicMethods.length > 0) {
      asset.imperativeConfig = transformMethods(publicMethods);
    }
  }

  // P1 Enhancement: Add keywords and handle more JSDoc tags
  if (doc.tags) {
    const keywords: string[] = [];
    const keywordTags = doc.tags.keywords as ExtendedBlockTag[] | undefined;
    if (keywordTags) {
      for (const kw of keywordTags) {
        if (kw.description) {
          keywords.push(kw.description);
        }
      }
    }
    if (keywords.length > 0) {
      asset.keywords = keywords;
    }

    // Check for deprecated tag
    if (doc.tags.deprecated) {
      asset.deprecated = true;
    }

    // P1 Enhancement: Handle @since tag (add to description)
    const sinceTags = doc.tags.since as ExtendedBlockTag[] | undefined;
    if (sinceTags && sinceTags.length > 0 && sinceTags[0].description) {
      const sinceInfo = `\n\n**Since:** ${sinceTags[0].description}`;
      asset.propsConfig.description = (asset.propsConfig.description || '') + sinceInfo;
    }

    // P1 Enhancement: Handle @version tag (add to description)
    const versionTags = doc.tags.version as ExtendedBlockTag[] | undefined;
    if (versionTags && versionTags.length > 0 && versionTags[0].description) {
      const versionInfo = `\n\n**Version:** ${versionTags[0].description}`;
      asset.propsConfig.description = (asset.propsConfig.description || '') + versionInfo;
    }

    // P1 Enhancement: Handle @author tag (add to description)
    const authorTags = doc.tags.author as ExtendedBlockTag[] | undefined;
    if (authorTags && authorTags.length > 0 && authorTags[0].description) {
      const authorInfo = `\n\n**Author:** ${authorTags[0].description}`;
      asset.propsConfig.description = (asset.propsConfig.description || '') + authorInfo;
    }
  }

  return asset;
}

export default transformComponentDoc;
