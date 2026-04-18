/**
 * Scope-registry CSV import parser.
 *
 * Minimal RFC-4180-ish parser: handles quoted fields, embedded commas,
 * escaped quotes, and CRLF/LF line endings. We deliberately avoid adding
 * a CSV library dependency — the schema is tiny and static.
 *
 * Expected headers (case-insensitive, in any order):
 *   oem_serial_number, asset_tag, internal_id, oem, model_name,
 *   scope_type, acquisition_date, acquisition_cost_cents,
 *   replacement_cost_cents, status
 */

import { z } from "zod";

export const scopeCsvRowSchema = z.object({
  oem_serial_number: z.string().trim().min(1).optional().nullable(),
  asset_tag: z.string().trim().min(1).optional().nullable(),
  internal_id: z.string().trim().min(1).optional().nullable(),
  oem: z
    .enum([
      "stryker",
      "olympus",
      "karl_storz",
      "richard_wolf",
      "smith_nephew",
      "conmed",
      "other",
    ])
    .optional()
    .default("other"),
  model_name: z.string().trim().optional().nullable(),
  scope_type: z
    .enum([
      "rigid_arthroscope",
      "rigid_laparoscope",
      "rigid_cystoscope",
      "rigid_hysteroscope",
      "rigid_sinuscope",
      "other",
    ])
    .optional()
    .nullable(),
  acquisition_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  acquisition_cost_cents: z.number().int().nonnegative().optional().nullable(),
  replacement_cost_cents: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(["active", "retired", "replaced", "loaner_pool"]).optional().default("active"),
});

export type ScopeCsvRow = z.infer<typeof scopeCsvRowSchema>;

export interface ParseResult {
  rows: ScopeCsvRow[];
  errors: Array<{ line: number; error: string }>;
}

const ALLOWED_HEADERS = [
  "oem_serial_number",
  "asset_tag",
  "internal_id",
  "oem",
  "model_name",
  "scope_type",
  "acquisition_date",
  "acquisition_cost_cents",
  "replacement_cost_cents",
  "status",
] as const;

export function parseScopeCsv(text: string): ParseResult {
  const lines = splitCsvLines(text);
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, error: "empty" }] };

  const headers = lines[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const unknown = headers.filter((h) => !ALLOWED_HEADERS.includes(h as (typeof ALLOWED_HEADERS)[number]));
  const errors: ParseResult["errors"] = [];
  if (unknown.length) {
    errors.push({ line: 1, error: `unknown_columns:${unknown.join(",")}` });
  }
  if (!headers.includes("oem_serial_number") && !headers.includes("asset_tag")) {
    errors.push({ line: 1, error: "missing_identity_column" });
  }

  const rows: ScopeCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i] ?? [];
    if (fields.length === 0 || fields.every((f) => f.trim() === "")) continue;
    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      const raw = (fields[j] ?? "").trim();
      if (raw === "") {
        obj[key] = null;
        continue;
      }
      if (key === "acquisition_cost_cents" || key === "replacement_cost_cents") {
        const n = Number(raw);
        obj[key] = Number.isFinite(n) ? Math.round(n) : null;
      } else {
        obj[key] = raw;
      }
    }
    const parsed = scopeCsvRowSchema.safeParse(obj);
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      errors.push({ line: i + 1, error: parsed.error.issues.map((x) => x.message).join(";") });
    }
  }
  return { rows, errors };
}

function splitCsvLines(text: string): string[][] {
  const lines: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    lines.push(row);
  }
  return lines;
}
