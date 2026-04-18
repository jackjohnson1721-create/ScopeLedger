import { describe, expect, it } from "vitest";
import { parseScopeCsv } from "./csv";

describe("parseScopeCsv", () => {
  it("parses a single-row happy path", () => {
    const csv = [
      "oem_serial_number,asset_tag,oem,model_name,replacement_cost_cents,status",
      "SN-1,BIO-42,stryker,1588 AIM,3000000,active",
    ].join("\n");
    const { rows, errors } = parseScopeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      oem_serial_number: "SN-1",
      asset_tag: "BIO-42",
      oem: "stryker",
      replacement_cost_cents: 3000000,
      status: "active",
    });
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = [
      "oem_serial_number,model_name",
      'SN-2,"AIM, Generation 2"',
    ].join("\n");
    const { rows, errors } = parseScopeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]?.model_name).toBe("AIM, Generation 2");
  });

  it("handles escaped quotes", () => {
    const csv = [
      'oem_serial_number,model_name',
      'SN-3,"He said ""hi"""',
    ].join("\n");
    const { rows } = parseScopeCsv(csv);
    expect(rows[0]?.model_name).toBe('He said "hi"');
  });

  it("skips blank rows", () => {
    const csv = [
      "oem_serial_number",
      "SN-4",
      "",
      "SN-5",
    ].join("\n");
    const { rows } = parseScopeCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it("reports unknown columns as a warning, not a fatal", () => {
    const csv = "oem_serial_number,wtf\nSN-6,nonsense";
    const { rows, errors } = parseScopeCsv(csv);
    expect(errors.some((e) => e.error.startsWith("unknown_columns"))).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it("errors when neither serial nor asset-tag is a column", () => {
    const csv = "internal_id\nINT-1";
    const { errors } = parseScopeCsv(csv);
    expect(errors.some((e) => e.error === "missing_identity_column")).toBe(true);
  });

  it("rejects rows with invalid oem enum", () => {
    const csv = "oem_serial_number,oem\nSN-7,nvidia";
    const { rows, errors } = parseScopeCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBe(1);
  });

  it("handles CRLF line endings", () => {
    const csv = "oem_serial_number\r\nSN-8\r\nSN-9\r\n";
    const { rows } = parseScopeCsv(csv);
    expect(rows).toHaveLength(2);
  });
});
