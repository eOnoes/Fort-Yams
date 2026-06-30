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
export declare function convertJsonSchemaToZod(rawSchema: Record<string, unknown> | undefined): ConversionResult;
//# sourceMappingURL=schemaConversion.d.ts.map