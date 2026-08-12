import {
  DeleteObjectCommand,
  GetObjectCommand,
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
