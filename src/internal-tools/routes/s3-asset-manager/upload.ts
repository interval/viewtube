import { io, Action } from "@interval/sdk";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { computeObjectUrl, s3Client } from ".";

export default new Action({
  name: "Upload files",
  unlisted: true,
  handler: async () => {
    const { returnValue: files } = await io.input
      .file("Choose files", {
        generatePresignedUrls: async (file) => {
          // We prepend the date to avoid name conflicts. You can of course customize this!
          const key = new Date().toISOString() + "-" + file.name;

          const uploadUrl = await getSignedUrl(
            s3Client,
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: key,
              // We want files uploaded using this tool to be publicly accessible
              ACL: "public-read",
            }),
            {
              expiresIn: 48 * 60 * 60, // 48 hours
            }
          );

          return {
            downloadUrl: computeObjectUrl(key),
            uploadUrl,
          };
        },
      })
      .multiple()
      .withChoices(["Upload"]);

    const dlUrls = await Promise.all(files.map((f) => f.url()));

    await io.group(
      files.map((f, i) =>
        io.display.code(f.name, {
          code: dlUrls[i],
          language: "txt",
        })
      )
    );
  },
});
