import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import env    from '../config/env.js';
import logger from './logger.js';

// ── S3 client (only initialised when AWS credentials are present) ──────────────
let s3Client = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  if (!env.aws.region || !env.aws.accessKeyId || !env.aws.secretAccessKey) {
    return null;
  }

  s3Client = new S3Client({
    region:      env.aws.region,
    credentials: {
      accessKeyId:     env.aws.accessKeyId,
      secretAccessKey: env.aws.secretAccessKey,
    },
  });

  return s3Client;
};

// ── Upload a file buffer to S3 ────────────────────────────────────────────────
// In development (no AWS credentials) returns a placeholder URL instead.
//
// @param {Buffer} fileBuffer   — file content from multer memoryStorage
// @param {string} key          — S3 object key, e.g. "profiles/userId/avatar.jpg"
// @param {string} mimeType     — e.g. "image/jpeg"
// @returns {Promise<string>}   — public URL of the uploaded file
export const uploadFile = async (fileBuffer, key, mimeType) => {
  const client = getS3Client();

  // ── DEV MODE: no AWS credentials → return placeholder URL ─────────────────
  if (!client) {
    logger.warn(`S3 not configured — using placeholder URL for key: ${key}`);
    return `https://placeholder-s3.dev/${key}`;
  }

  // ── PRODUCTION: upload to real S3 ─────────────────────────────────────────
  try {
    const upload = new Upload({
      client,
      params: {
        Bucket:      env.aws.bucketName,
        Key:         key,
        Body:        fileBuffer,
        ContentType: mimeType,
      },
    });

    await upload.done();

    // Return the public URL
    const baseUrl = env.aws.baseUrl ||
      `https://${env.aws.bucketName}.s3.${env.aws.region}.amazonaws.com`;

    return `${baseUrl}/${key}`;
  } catch (err) {
    logger.error(`S3 upload failed for key ${key}: ${err.message}`);
    throw err;
  }
};

// ── Delete a file from S3 ─────────────────────────────────────────────────────
// Silently skips in development when no AWS credentials are set.
//
// @param {string} key — S3 object key to delete
export const deleteFile = async (key) => {
  const client = getS3Client();

  if (!client) {
    logger.warn(`S3 not configured — skipping delete for key: ${key}`);
    return;
  }

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: env.aws.bucketName,
      Key:    key,
    }));
    logger.debug(`S3 deleted: ${key}`);
  } catch (err) {
    // Log but don't crash — a failed delete shouldn't break the request
    logger.error(`S3 delete failed for key ${key}: ${err.message}`);
  }
};

// ── Extract S3 key from a full URL ────────────────────────────────────────────
// Needed when replacing an existing photo — we delete the old key before uploading new.
//
// e.g. "https://bucket.s3.region.amazonaws.com/profiles/abc/avatar.jpg"
//   → "profiles/abc/avatar.jpg"
export const extractKeyFromUrl = (url) => {
  if (!url || url.includes('placeholder-s3.dev')) return null;

  try {
    const parsed = new URL(url);
    // pathname starts with '/' — remove it
    return parsed.pathname.slice(1);
  } catch {
    return null;
  }
};
