import { ctx, io, Layout, Page } from "@interval/sdk";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import isImage from "is-image";
import { toMb } from "../../helpers/toMb";
import { z } from "zod";

const { S3_BUCKET_NAME } = process.env;

if (!process.env.AWS_KEY_ID || !process.env.AWS_KEY_SECRET || !S3_BUCKET_NAME) {
  throw new Error(
    `The AWS_KEY_ID, AWS_KEY_SECRET, and S3_BUCKET_NAME env vars must be set to use this action.`
  );
}

const region = process.env.AWS_REGION || "us-west-1";

export const s3Client = new S3Client({
  region,
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_KEY_ID,
    secretAccessKey: process.env.AWS_KEY_SECRET,
  },
});

// From https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-bucket-intro.html
export const computeObjectUrl = (key: string) => {
  if (!process.env.AWS_ENDPOINT) {
    return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
  }
  // We can't use the virtual-hosted-style when there's a custom endpoint
  return `${process.env.AWS_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${key}`;
};

/*
    This tool is a good jumping-off point for a bespoke tool to manage S3 objects in your organization.
    We use a similar tool to manage a store of public assets.

    Some gotchas:
    - By default S3 gets the first 1000 keys, you must implement pagination w/ S3 if you need more.
    - The tool assumes that objects are public.
    - It also only works on a single, hard-coded bucket. 

    All of these gotchas can be removed/modified by remixing the tool to fit your needs.
*/

export default new Page({
  name: "📦 S3 object manager",
  description: `Manage files in the company's S3 bucket without using the confusing/dangerous S3 console directly.`,
  routes: {
    delete: {
      name: "Delete object",
      unlisted: true,
      handler: async () => {
        const { objectKey } = z
          .object({ objectKey: z.string() })
          .parse(ctx.params);

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: objectKey,
          })
        );

        return `Deleted object with key: ${objectKey}`;
      },
    },
  },
  handler: async () => {
    const data = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
      })
    );

    if (!data.Contents)
      throw new Error(`Could not retrieve contents of ${S3_BUCKET_NAME}`);

    const hasAnyImages = data.Contents.some(
      (obj) => obj.Key && isImage(obj.Key)
    );

    // Advanced pattern! Columns can be conditionally shown/hidden.
    const previewColumn = hasAnyImages
      ? [
          {
            label: "Preview",
            renderCell: (row) => {
              if (row.Key && isImage(row.Key)) {
                return {
                  image: {
                    url: computeObjectUrl(row.Key),
                    size: "thumbnail",
                  } as const,
                };
              }
              // returning null allows Interval to render an empty cell UI
              return null;
            },
          },
        ]
      : [];

    return new Layout({
      menuItems: [
        {
          // relative links can be constructed using the current page's slug
          route: `${ctx.page.slug}/upload`,
          label: "Upload a file",
        },
      ],
      children: [
        io.display.table("All objects", {
          data: data.Contents,
          columns: [
            ...previewColumn,
            {
              label: "Key",
              renderCell: (row) =>
                row.Key
                  ? {
                      url: computeObjectUrl(row.Key),
                      label: row.Key,
                    }
                  : null,
            },
            {
              label: "Size",
              renderCell: (row) => (row.Size ? toMb(row.Size) : null),
            },
            "LastModified",
          ],
          rowMenuItems: (row) => [
            {
              label: "Delete",
              route: `${ctx.page.slug}/delete`,
              params: {
                objectKey: row.Key,
              },
            },
          ],
        }),
      ],
    });
  },
});
