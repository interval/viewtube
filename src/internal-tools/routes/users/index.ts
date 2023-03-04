import { ctx, io, Layout, Page } from "@interval/sdk";
import { User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../database";

/*
    Demonstrates an advanced pattern where page content can be managed w/ URL params
*/

function userTable(users: User[]) {
  return io.display.table("", {
    data: users,
    columns: [
      {
        label: "profilePicture",
        renderCell: (row) => {
          if (!row.imageUrl) return "";
          return { image: { url: row.imageUrl, size: "thumbnail" } };
        },
      },
      {
        label: "name",
        renderCell: (row) => {
          if (row.isVerified) {
            return `✅ ${row.name}`;
          }
          return row.name;
        },
      },
      {
        label: "id",
        renderCell: (row) => ({
          label: row.id,
          action: ctx.page.slug,
          params: { userId: row.id },
        }),
      },
      "email",
      "canUpload",
      "maxUploadDuration",
    ],
  });
}

const allUsers = async () => {
  const onlyShowVerified = ctx.params.verifiedOnly === "true";

  const users = await prisma.user.findMany({
    orderBy: {
      signedUpAt: "desc",
    },
  });

  return new Layout({
    menuItems: [
      {
        label: "Add user",
        action: "", // TODO: implement
      },
    ],
    children: [
      io.display.metadata("Metrics", {
        layout: "card",
        data: [
          {
            label: "Total users",
            value: users.length,
          },
          {
            label: "Verified users",
            value: users.filter((u) => u.isVerified).length,
          },
          {
            label: "Creators",
            value: users.filter((u) => u.canUpload).length,
          },
          {
            label: "Latest sign-up",
            value: users[0].signedUpAt,
          },
        ],
      }),
      io.display.heading(onlyShowVerified ? "Verified users" : "All users", {
        menuItems: [
          onlyShowVerified
            ? {
                label: "Show all",
                route: ctx.page.slug,
                theme: "secondary",
                params: {
                  verifiedOnly: false,
                },
              }
            : {
                label: "Show verified only",
                route: ctx.page.slug,
                theme: "secondary",
                params: {
                  verifiedOnly: true,
                },
              },
        ],
      }),
      onlyShowVerified
        ? userTable(
            users.filter((u) => {
              return u.isVerified;
            })
          )
        : userTable(users),
    ],
  });
};

const singleUser = async (userId: string) => {
  const [user, videos, channels, comments, purchases] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
    }),
    prisma.video.findMany({
      where: {
        channel: {
          ownerId: userId,
        },
      },
    }),
    prisma.channel.findMany({
      where: {
        ownerId: userId,
      },
    }),
    prisma.userComment.findMany({
      where: {
        authorId: userId,
      },
      include: {
        video: true,
      },
    }),
    prisma.videoPurchase.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        video: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error(`No user exists w/ id: ${userId}`);
  }

  return new Layout({
    title: user.name || user.email,
    menuItems: [
      {
        label: "Manage verification",
        action: "users/verify",
        params: {
          userId: user.id,
        },
      },
      {
        label: "Back to all users",
        route: ctx.page.slug,
      },
    ],
    children: [
      io.display.metadata("Details", {
        data: Object.entries(user).map(([k, v]) => ({
          label: k,
          value: v,
        })),
      }),
      io.display.table("Videos", {
        data: videos,
        columns: [
          {
            label: "",
            renderCell: (row) => ({
              label: "",
              image: { url: row.thumbnailUrl, size: "medium" },
            }),
          },
          {
            label: "title",
            renderCell: (row) => ({
              label: row.title,
              url: `http://localhost:4000/video/${row.id}`,
            }),
          },
          "createdAt",
          "published",
        ],
        rowMenuItems: (row) => [
          {
            label: "Moderate comments",
            action: "moderate_comment",
            params: {
              videoId: row.id,
            },
          },
        ],
      }),
      io.display.table("Channels", {
        data: channels,
        columns: ["id", "name"],
      }),
      io.display.table("Comments", {
        data: comments,
        columns: [
          "content",
          "isSpam",
          {
            label: "video",
            renderCell: (row) => row.video.title,
          },
        ],
      }),
      io.display.table("Purchases", {
        data: purchases,
        columns: [
          "id",
          "amount",
          "createdAt",
          {
            label: "video",
            renderCell: (row) => row.video.title,
          },
        ],
      }),
    ],
  });
};

export default new Page({
  name: "👥 Users",
  handler: async () => {
    const { userId } = z
      .object({ userId: z.string().optional() })
      .parse(ctx.params);

    // entirely different layouts can be rendered

    if (userId) {
      return singleUser(userId);
    }
    return allUsers();
  },
});
