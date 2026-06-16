export const UPLOAD_LIMITS = {
  PAPER_PDF_MAX: 20 * 1024 * 1024, // 20 MB
  AVATAR_MAX: 5 * 1024 * 1024, // 5 MB
} as const;

export const ALLOWED_PDF_TYPES = ["application/pdf"] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Magic byte signatures for file type verification
const MAGIC_SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> =
  {
    "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
    "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
    "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47] }],
    "image/gif": [{ bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF8
    "image/webp": [
      { bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF at offset 0
      { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP at offset 8
    ],
  };

/**
 * Validate that a file's content matches its declared MIME type by checking magic bytes.
 * Returns valid: true if the bytes match (or if the MIME type has no known signature).
 */
export function validateMagicBytes(
  buffer: ArrayBuffer,
  declaredType: string,
): { valid: true } | { valid: false; error: string } {
  const signatures = MAGIC_SIGNATURES[declaredType];
  if (!signatures) {
    // No known signature for this type — allow
    return { valid: true };
  }

  const view = new Uint8Array(buffer);

  for (const sig of signatures) {
    const offset = sig.offset ?? 0;
    if (view.length < offset + sig.bytes.length) {
      return {
        valid: false,
        error: "File content does not match its declared type",
      };
    }
    for (let i = 0; i < sig.bytes.length; i++) {
      if (view[offset + i] !== sig.bytes[i]) {
        return {
          valid: false,
          error: "File content does not match its declared type",
        };
      }
    }
  }

  return { valid: true };
}

export function validateFileUpload(
  file: File,
  allowedTypes: readonly string[],
  maxSize: number,
): { valid: true } | { valid: false; error: string } {
  if (!allowedTypes.includes(file.type)) {
    const types = allowedTypes.map((t) => t.split("/")[1]).join(", ");
    return { valid: false, error: `Invalid file type. Allowed: ${types}` };
  }

  if (file.size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size: ${mb} MB` };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  return { valid: true };
}
