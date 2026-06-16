import { describe, it, expect } from "vitest";
import { validateMagicBytes, validateFileUpload } from "@/lib/validators/upload";

function makeBuffer(bytes: number[], size = 0): ArrayBuffer {
  const length = Math.max(bytes.length, size);
  const buf = new ArrayBuffer(length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    view[i] = bytes[i];
  }
  return buf;
}

describe("validateMagicBytes", () => {
  it("accepts valid PDF", () => {
    // %PDF
    const buf = makeBuffer([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34], 100);
    expect(validateMagicBytes(buf, "application/pdf")).toEqual({ valid: true });
  });

  it("rejects invalid PDF (wrong magic bytes)", () => {
    const buf = makeBuffer([0x00, 0x00, 0x00, 0x00], 100);
    const result = validateMagicBytes(buf, "application/pdf");
    expect(result.valid).toBe(false);
  });

  it("accepts valid JPEG", () => {
    const buf = makeBuffer([0xff, 0xd8, 0xff, 0xe0], 100);
    expect(validateMagicBytes(buf, "image/jpeg")).toEqual({ valid: true });
  });

  it("rejects invalid JPEG", () => {
    const buf = makeBuffer([0x89, 0x50, 0x4e, 0x47], 100); // PNG bytes
    const result = validateMagicBytes(buf, "image/jpeg");
    expect(result.valid).toBe(false);
  });

  it("accepts valid PNG", () => {
    const buf = makeBuffer([0x89, 0x50, 0x4e, 0x47], 100);
    expect(validateMagicBytes(buf, "image/png")).toEqual({ valid: true });
  });

  it("rejects invalid PNG", () => {
    const buf = makeBuffer([0xff, 0xd8, 0xff], 100);
    const result = validateMagicBytes(buf, "image/png");
    expect(result.valid).toBe(false);
  });

  it("accepts valid GIF", () => {
    // GIF8
    const buf = makeBuffer([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 100);
    expect(validateMagicBytes(buf, "image/gif")).toEqual({ valid: true });
  });

  it("rejects invalid GIF", () => {
    const buf = makeBuffer([0x00, 0x00, 0x00, 0x00], 100);
    const result = validateMagicBytes(buf, "image/gif");
    expect(result.valid).toBe(false);
  });

  it("accepts valid WebP", () => {
    // RIFF....WEBP
    const bytes = new Array(12).fill(0);
    bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
    bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP
    const buf = makeBuffer(bytes, 100);
    expect(validateMagicBytes(buf, "image/webp")).toEqual({ valid: true });
  });

  it("rejects WebP with valid RIFF but invalid offset 8", () => {
    const bytes = new Array(12).fill(0);
    bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
    bytes[8] = 0x41; bytes[9] = 0x56; bytes[10] = 0x49; bytes[11] = 0x20; // AVI (not WEBP)
    const buf = makeBuffer(bytes, 100);
    const result = validateMagicBytes(buf, "image/webp");
    expect(result.valid).toBe(false);
  });

  it("rejects when buffer is too small for signature", () => {
    const buf = makeBuffer([0x25, 0x50]); // Only 2 bytes, PDF needs 4
    const result = validateMagicBytes(buf, "application/pdf");
    expect(result.valid).toBe(false);
  });

  it("rejects empty buffer", () => {
    const buf = new ArrayBuffer(0);
    const result = validateMagicBytes(buf, "application/pdf");
    expect(result.valid).toBe(false);
  });

  it("allows unknown MIME type (no signature check)", () => {
    const buf = makeBuffer([0x00, 0x00], 10);
    expect(validateMagicBytes(buf, "application/octet-stream")).toEqual({ valid: true });
  });
});

describe("validateFileUpload", () => {
  function makeFile(name: string, type: string, size: number): File {
    const buf = new ArrayBuffer(size);
    return new File([buf], name, { type });
  }

  it("accepts valid file", () => {
    const file = makeFile("test.pdf", "application/pdf", 1000);
    expect(validateFileUpload(file, ["application/pdf"], 20 * 1024 * 1024)).toEqual({ valid: true });
  });

  it("rejects invalid MIME type", () => {
    const file = makeFile("test.exe", "application/x-msdownload", 1000);
    const result = validateFileUpload(file, ["application/pdf"], 20 * 1024 * 1024);
    expect(result.valid).toBe(false);
  });

  it("rejects file exceeding size limit", () => {
    const file = makeFile("big.pdf", "application/pdf", 25 * 1024 * 1024);
    const result = validateFileUpload(file, ["application/pdf"], 20 * 1024 * 1024);
    expect(result.valid).toBe(false);
  });

  it("rejects empty file", () => {
    const file = makeFile("empty.pdf", "application/pdf", 0);
    const result = validateFileUpload(file, ["application/pdf"], 20 * 1024 * 1024);
    expect(result.valid).toBe(false);
  });
});
