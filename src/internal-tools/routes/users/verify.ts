import { Action, io } from "@interval/sdk";
import { prisma } from "../../../database";
import { requireUser } from "../../helpers/users";

export default new Action({
  name: "User verification",
  unlisted: true,
  handler: async () => {
    const user = await requireUser();
    const action = await io.select.single("Action", {
      defaultValue: "Check verification status",
      options: [
        "Remove verification",
        "Start verification",
        "Check verification status",
      ],
    });

    if (action === "Check verification status") {
      return `User ${user.email} ${
        user.isVerified ? "IS" : "IS NOT"
      } verified.`;
    }
    if (action === "Start verification") {
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

    if (action === "Remove verification") {
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
