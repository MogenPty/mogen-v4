/** Read-only storage preflight for the current Neon branch.
 * Run AFTER installing @aws-sdk/client-s3 on the local machine.
 * This never uploads, downloads, signs, lists or deletes customer documents.
 * Usage: node --env-file=.env.local scripts/verify-neon-object-storage.mjs
 */
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.MOGEN_DOCUMENT_BUCKET || "assets";
if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
  console.error("Missing Neon S3 settings: AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.");
  process.exit(1);
}
if (!endpoint.startsWith("https://")) {
  console.error("Storage endpoint must use HTTPS.");
  process.exit(1);
}
if (bucket !== "assets") {
  console.error("Unexpected bucket; only the explicitly provisioned private assets bucket is supported.");
  process.exit(1);
}
const s3 = new S3Client({
  endpoint, region, forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});
try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log("Neon Object Storage: assets bucket accessible (read-only preflight).");
  console.log("Confirm in Neon Console that bucket access is PRIVATE and belongs to mogen-packages-dev.");
  console.log("No file was uploaded, downloaded or modified.");
} catch (error) {
  console.error("Cannot access Neon Object Storage bucket. Check branch, endpoint, region, credentials and bucket permissions.");
  console.error(error?.name || "StorageError");
  process.exitCode = 1;
} finally {
  s3.destroy();
}
