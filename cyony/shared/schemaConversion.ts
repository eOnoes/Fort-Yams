/**
 * @tripp-reason/mcp — JSON Schema → Zod conversion
 *
 * Converts MCP tool input schemas (JSON Schema subset) to Zod schemas
 * for input validation before tool execution.
 *
 * Supported types:
 * - object (with properties + required)
 * - string, number, boolean
 * - array of primitive
 * - enum
 *
 * Unsupported/unknown types fall back to z.unknown() with a warnings array
 * that callers can inspect for diagnostics.
 *
 * Phase 4C: basic subset. Full JSON Schema coverage is deferred.
 */
import { z } from "zod";

export interface ConversionResult {
  schema: z.ZodType<unknown>;
  /** Warnings for unsupported features encountered during conversion */
  warnings: string[];
}

/**
 * Convert an MCP JSON Schema to a Zod schema.
 *
 * Returns a ConversionResult with the Zod schema and any warnings.
 * Never throws — unsupported schemas fall back to z.unknown().
 */
export function convertJsonSchemaToZod(
  rawSchema: Record<string, unknown> | undefined,
): ConversionResult {
  const warnings: string[] = [];

  if (!rawSchema || typeof rawSchema !== "object") {
    return { schema: z.unknown(), warnings: ["empty or invalid schema — using z.unknown()"] };
  }

  try {
    const schema = convertType(rawSchema, warnings);
    return { schema, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown conversion error";
    warnings.push(`conversion failed: ${msg} — falling back to z.unknown()`);
    return { schema: z.unknown(), warnings };
  }
}

// ── Internal converters ──────────────────────────────────────────────

function convertType(
  schema: Record<string, unknown>,
  warnings: string[],
): z.ZodType<unknown> {
  const type = schema["type"];
  const enumValues = schema["enum"];

  // Enum takes priority
  if (Array.isArray(enumValues)) {
    return convertEnum(enumValues, schema, warnings);
  }

  switch (type) {
    case "string":
      return applyStringConstraints(z.string(), schema);
    case "number":
    case "integer":
      return applyNumberConstraints(z.number(), schema);
    case "boolean":
      return z.boolean();
    case "object":
      return convertObject(schema, warnings);
    case "array":
      return convertArray(schema, warnings);
    default: {
      const typeStr = String(type ?? "undefined");
      warnings.push(`unsupported type '${typeStr}' — using z.unknown()`);
      return z.unknown();
    }
  }
}

function convertEnum(
  values: unknown[],
  schema: Record<string, unknown>,
  warnings: string[],
): z.ZodType<unknown> {
  const strings = values.filter((v): v is string => typeof v === "string");
  if (strings.length !== values.length) {
    warnings.push("enum contains non-string values — filtering to strings only");
  }
  if (strings.length === 0) {
    warnings.push("enum has no string values — using z.string()");
    return z.string();
  }
  // z.enum requires a non-empty tuple
  const [first, ...rest] = strings;
  let result = z.enum([first, ...rest]);

  // Apply description metadata if present
  if (typeof schema["description"] === "string") {
    result = result.describe(schema["description"]);
  }

  return result;
}

function convertObject(
  schema: Record<string, unknown>,
  warnings: string[],
): z.ZodType<unknown> {
  const properties = schema["properties"] as Record<string, unknown> | undefined;
  const required = schema["required"] as string[] | undefined;

  if (!properties || typeof properties !== "object") {
    warnings.push("object without properties — using z.record(z.unknown())");
    return z.record(z.unknown());
  }

  const shape: Record<string, z.ZodType<unknown>> = {};

  for (const [key, propSchema] of Object.entries(properties)) {
    if (propSchema && typeof propSchema === "object") {
      shape[key] = convertType(propSchema as Record<string, unknown>, warnings);
    } else {
      shape[key] = z.unknown();
      warnings.push(`property '${key}' has invalid schema — using z.unknown()`);
    }
  }

  let result = z.object(shape);

  // Apply required fields
  if (Array.isArray(required) && required.length > 0) {
    // Make non-required fields optional
    const requiredSet = new Set(required);
    const partialShape: Record<string, z.ZodType<unknown>> = {};

    for (const [key, zodType] of Object.entries(shape)) {
      if (!requiredSet.has(key)) {
        partialShape[key] = zodType.optional();
      } else {
        partialShape[key] = zodType;
      }
    }

    result = z.object(partialShape);
  } else {
    // No required array → all fields optional (permissive)
    const optionalShape: Record<string, z.ZodType<unknown>> = {};
    for (const [key, zodType] of Object.entries(shape)) {
      optionalShape[key] = zodType.optional();
    }
    result = z.object(optionalShape);
  }

  // Apply description
  if (typeof schema["description"] === "string") {
    result = result.describe(schema["description"]);
  }

  return result;
}

function convertArray(
  schema: Record<string, unknown>,
  warnings: string[],
): z.ZodType<unknown> {
  const items = schema["items"];

  if (items && typeof items === "object") {
    const itemSchema = convertType(items as Record<string, unknown>, warnings);
    return applyArrayConstraints(z.array(itemSchema), schema);
  }

  warnings.push("array without items schema — using z.array(z.unknown())");
  return applyArrayConstraints(z.array(z.unknown()), schema);
}

// ── Constraint helpers ───────────────────────────────────────────────

function applyStringConstraints(
  base: z.ZodString,
  schema: Record<string, unknown>,
): z.ZodString {
  let result = base;

  if (typeof schema["description"] === "string") {
    result = result.describe(schema["description"]);
  }
  if (typeof schema["minLength"] === "number") {
    result = result.min(schema["minLength"] as number);
  }
  if (typeof schema["maxLength"] === "number") {
    result = result.max(schema["maxLength"] as number);
  }

  return result;
}

function applyNumberConstraints(
  base: z.ZodNumber,
  schema: Record<string, unknown>,
): z.ZodNumber {
  let result = base;

  if (typeof schema["description"] === "string") {
    result = result.describe(schema["description"]);
  }
  if (typeof schema["minimum"] === "number") {
    result = result.min(schema["minimum"] as number);
  }
  if (typeof schema["maximum"] === "number") {
    result = result.max(schema["maximum"] as number);
  }

  return result;
}

function applyArrayConstraints(
  base: z.ZodArray<z.ZodType<unknown>>,
  schema: Record<string, unknown>,
): z.ZodArray<z.ZodType<unknown>> {
  let result = base;

  if (typeof schema["description"] === "string") {
    result = result.describe(schema["description"]);
  }
  if (typeof schema["minItems"] === "number") {
    result = result.min(schema["minItems"] as number);
  }
  if (typeof schema["maxItems"] === "number") {
    result = result.max(schema["maxItems"] as number);
  }

  return result;
}
