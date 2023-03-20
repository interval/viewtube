import { ctx, io } from "@interval/sdk";
import { z } from "zod";
import { prisma } from "../../database";

export async function requireUser() {
  const { userId } = z
    .object({
      userId: z.string().optional(),
    })
    .parse(ctx.params);

  const user = userId
    ? await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    : await io.search("Choose a user", {
        onSearch: async (query) => {
          const users = await prisma.user.findMany({
            where: {
              name: {
                mode: "insensitive",
                contains: query,
              },
            },
            // Important! If you don't specify a limit, your ORM may return a _really_ large result set which can impact your tool's performance and/or unnecessarily tax your database.
            take: 10,
          });
          return users;
        },
        renderResult: (row) => {
          return {
            label: `${row.name} - ${row.email}`,
            image: row.imageUrl ? { url: row.imageUrl } : undefined,
          };
        },
      });

  await io.display.metadata(`User`, {
    layout: "list",
    //@ts-ignore
    data: Object.entries(user).map(([k, v]) => ({
      label: k,
      value: v,
    })),
  });

  return user;
}
