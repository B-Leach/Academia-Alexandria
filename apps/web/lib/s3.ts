import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const S3_REGION = process.env.S3_REGION || "us-east-1";

const S3_BUCKET = process.env.S3_BUCKET || "papers";
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || S3_ENDPOINT;

// ---------------------------------------------------------------------------
// Singleton client (same pattern as Prisma client)
// ---------------------------------------------------------------------------

const globalForS3 = globalThis as unknown as { s3Client: S3Client | undefined };

const s3Client =
  globalForS3.s3Client ??
  new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
  });

if (process.env.NODE_ENV !== "production") globalForS3.s3Client = s3Client;

// ---------------------------------------------------------------------------
// Bucket initialization
// ---------------------------------------------------------------------------

let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    bucketReady = true;
    return;
  } catch {
    // Bucket doesn't exist — create it
  }

  await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));

  // Set public-read policy so files are directly accessible via URL
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${S3_BUCKET}/*`],
      },
    ],
  });

  await s3Client.send(
    new PutBucketPolicyCommand({ Bucket: S3_BUCKET, Policy: policy })
  );

  bucketReady = true;
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await ensureBucket();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  if (!response.Body) throw new Error(`S3 object not found: ${key}`);
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteFile(key: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );
  } catch (error) {
    // Best-effort cleanup — log but don't throw
    console.error(`Failed to delete S3 object ${key}:`, error);
  }
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function getPublicUrl(key: string): string {
  return `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`;
}

export function extractKeyFromUrl(url: string): string | null {
  const prefix = `/${S3_BUCKET}/`;

  // Try parsing as full URL
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const idx = path.indexOf(prefix);
    if (idx !== -1) {
      return path.slice(idx + prefix.length);
    }
  } catch {
    // Not a valid URL
  }

  // Fallback: look for bucket name in the string
  const idx = url.indexOf(prefix);
  if (idx !== -1) {
    return url.slice(idx + prefix.length);
  }

  return null;
}
