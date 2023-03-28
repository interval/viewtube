import { ctx, io } from "@interval/sdk";
import { z } from "zod";
import { prisma } from "../../database";

export async function basicUserDetails() {
  const { email, name } = z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
    })
    .parse(ctx.params);

  let response = {
    email,
    name,
  }

  if (!email || !name) {
    response = await io.group({
      name: io.input.text("Name", {defaultValue: name}),
      email: io.input.email("Email", {defaultValue: email}),
    })
  }

  return {
    email: response.email as string,
    name: response.name as string,
  }
}

export async function additionalUserDetails() {
  const [_, birthday, website, profileText] = await io.group([
    io.display.markdown(`
          ## Basic info
      `),
    io.input.date("Birthday"),
    io.input.url("Website"),
    io.input.richText("Profile", {
      helpText: "This formatted text will be shown on the user's profile page",
    }),
  ])
  return {
    birthday,
    website,
    profileText,
  }
}


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
