import type { SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';

const SCHEMA_LIST_KEYS = new Set(['allOf', 'anyOf', 'oneOf']);
const SCHEMA_KEYS = new Set(['items', 'not']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSchemaObject(value: unknown): value is SchemaObject {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, child]) => {
    if (key === 'properties') {
      return isRecord(child) && Object.values(child).every(isSchemaObject);
    }
    if (SCHEMA_KEYS.has(key)) return isSchemaObject(child);
    if (SCHEMA_LIST_KEYS.has(key)) {
      return Array.isArray(child) && child.every(isSchemaObject);
    }
    return true;
  });
}

export function toOpenApiSchema(schema: z.ZodType): SchemaObject {
  const jsonSchema = Object.fromEntries(
    Object.entries(z.toJSONSchema(schema, { target: 'openapi-3.0' })).filter(
      ([key]) => key !== '$schema',
    ),
  );
  if (!isSchemaObject(jsonSchema)) {
    throw new Error('Zod schema has no OpenAPI 3.0 representation');
  }
  return jsonSchema;
}
