import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getS3Config } from "./config";

let client: S3Client | undefined;

function getS3Client(): S3Client {
  if (client) return client;

  const config = getS3Config();

  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });

  return client;
}

export async function uploadObject(
  key: string,
  body: Uint8Array,
  mimeType: string
) {
  const config = getS3Config();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    })
  );
}

export async function getObjectSignedUrl(
  key: string,
  expiresIn = 300,
  options?: { downloadFilename?: string }
) {
  const config = getS3Config();

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ...(options?.downloadFilename
        ? {
            ResponseContentDisposition: contentDispositionAttachment(
              options.downloadFilename
            ),
          }
        : {}),
    }),
    { expiresIn }
  );
}

/** Browser lädt direkt in den Bucket — nicht über Vercel. */
export async function getSignedPutUrl(
  key: string,
  mimeType: string,
  expiresIn = 600
) {
  const config = getS3Config();

  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: mimeType,
    }),
    { expiresIn }
  );
}

export async function waitForObjectSize(
  key: string,
  expectedSize: number,
  attempts = 4
): Promise<"ok" | "missing" | "mismatch"> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const size = await headObjectSize(key);
    if (size === expectedSize) {
      return "ok";
    }
    if (size !== null && size !== expectedSize) {
      return "mismatch";
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 250 * (attempt + 1))
      );
    }
  }
  return "missing";
}

export async function headObjectSize(key: string): Promise<number | null> {
  const config = getS3Config();

  try {
    const result = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    return typeof result.ContentLength === "number"
      ? result.ContentLength
      : null;
  } catch {
    return null;
  }
}

function contentDispositionAttachment(filename: string) {
  const asciiName = filename
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const utf8Name = encodeURIComponent(filename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `attachment; filename="${asciiName || "download"}"; filename*=UTF-8''${utf8Name}`;
}

export async function deleteObject(key: string) {
  const config = getS3Config();

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}
