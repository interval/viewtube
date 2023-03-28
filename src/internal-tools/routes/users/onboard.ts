import { Action, io, ctx } from "@interval/sdk";
import { prisma } from "../../../database";
import { basicUserDetails, additionalUserDetails } from "../../helpers/users";

export default new Action({
  name: "Onboard user",
  unlisted: true,
  handler: async () => {

    const { email, name } = await basicUserDetails();

    const [_, professional] = await io.group([
      io.display.metadata("Onboarding as basic user", {layout: "list", data: [{label: "Email", value: email}, {label: "Name", value: name}]}),
      // TODO switch to withChoices
      io.input.boolean("Onboard as professional user?", {
        helpText: "Professional users get whitelabeled video hosting, higher upload limits, and additional support.",
      })
    ])

    if (professional) {
      ctx.redirect({ action: "users/onboard_pro", params: { email, name }});
    }

    const {birthday, website, profileText} = await additionalUserDetails();

    await prisma.user.create({
      data: {
        email,
        name,
        signedUpAt: new Date(),
      },
    });

    // TODO: process images and other data

  },
});
