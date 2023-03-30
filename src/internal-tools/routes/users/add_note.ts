import { Action, io, ctx } from "@interval/sdk";
import { prisma } from "../../../database";
import { requireUser } from "../../helpers/users";

export default new Action({
  name: "Add user note",
  unlisted: true,
  handler: async () => {
    const user = await requireUser();

    const [_, content] = await io.group([
      io.display.metadata("Composing note for user", {layout: "list", data: [{label: "Email", value: user.email}, {label: "Name", value: user.name}]}),
      io.input.richText("Content", {
        helpText: "Your email will be saved along with this note.",
      })
    ])

    await prisma.userNote.create({
      data: {
        userId: user.id,
        content,
        authorEmail: ctx.user.email,
      },
    });

  },
});
