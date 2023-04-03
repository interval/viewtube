import { Action, io } from "@interval/sdk";
import { prisma } from "../../../database";
import { requireUser } from "../../helpers/requireUser";

export default new Action({
  name: "User verification",
  unlisted: true,
  handler: async () => {
    const user = await requireUser();
    const { choice } = await io.display
      .metadata(`User`, {
        layout: "list",
        //@ts-ignore
        data: Object.entries(user).map(([k, v]) => ({
          label: k,
          value: v,
        })),
      })
      .withChoices([
        "Check verification status",
        "Start verification",
        "Remove verification",
      ]);

    if (choice === "Check verification status") {
      return `User ${user.email} ${
        user.isVerified ? "IS" : "IS NOT"
      } verified.`;
    }
    if (choice === "Start verification") {
      const [, isReady] = await io.group([
        io.display.markdown(`
            ## Verifying ${user.name}

            **IMPORTANT:** Before beginning verification for a user, ensure that you have all required documentation. 

            ### Required documents:
            - Valid drivers license

        `),
        io.input.boolean("I have all required docs to start verification..."),
      ]);

      if (!isReady) return;

      const isVerified = await io.confirmIdentity(
        "Confirm your identify before removing verification..."
      );
      if (!isVerified) return;

      const [dlnFront, dlnBack] = await io.group([
        io.input.file("Drivers license (front)"),
        io.input.file("Drivers license (back)"),
      ]);

      // TODO: do something w/ these

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          isVerified: true,
        },
      });

      return `Verified ${user.name}.`;
    }

    if (choice === "Remove verification") {
      const isConfirmed = await io.confirm("Remove verification?", {
        helpText: `User: ${user.name} (${user.email})`,
      });
      if (!isConfirmed) return;

      const isVerified = await io.confirmIdentity(
        "Confirm your identify before removing verification..."
      );
      if (!isVerified) return;

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          isVerified: false,
        },
      });
    }
  },
});
