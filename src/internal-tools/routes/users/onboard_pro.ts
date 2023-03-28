import { Action, io, ctx } from "@interval/sdk";
import { prisma } from "../../../database";
import { basicUserDetails, additionalUserDetails } from "../../helpers/users";

export default new Action({
  name: "Onboard professional user",
  unlisted: true,
  handler: async () => {

    const { email, name } = await basicUserDetails();

    const [_meta, selectedPlans] = await io.group([
      io.display.metadata("Onboarding as professional user", {layout: "list", data: [{label: "Email", value: email}, {label: "Name", value: name}]}),
      io.select.table("Select professional plan", {
        data: [
          {
            plan: "🥈 Silver Plan",
            support_level: "Email/Chat",
            maxUploadDuration: 600,
            price: "$10/month",
          },
          {
            plan: "🥇 Gold Plan",
            support_level: "Email/Chat/Phone",
            maxUploadDuration: 6000,
            price: "$100/month",
          },
          {
            plan: "💎 Diamond Plan",
            support_level: "Email/Chat/Phone/Personal robot",
            maxUploadDuration: 10000,
            price: "$1000/month",
          },
        ],
        maxSelections: 1,
        isSortable: false,
        isFilterable: false,
      }),
    ])

    const plan = selectedPlans[0];

    const {birthday, website, profileText} = await additionalUserDetails();

    await io.group([
      io.display.markdown(`
          ## Assets and branding
      `),
      io.input.file("Logo", {
        helpText: "Provide a logo to identify the user or their organization",
        allowedExtensions: ["png", "jpg", "jpeg"],
      }),
      io.input.file("Cover photo", {
        helpText: "This image will be used as the cover photo for the user's profile",
        allowedExtensions: ["png", "jpg", "jpeg"],
      }),
    ])

    await prisma.user.create({
      data: {
        email,
        name,
        maxUploadDuration: plan.maxUploadDuration,
        signedUpAt: new Date(),
        canUpload: true,
      },
    });

    // TODO: process images and other data

    await ctx.notify({
      message: `${name} (${email}) has been onboarded by ${ctx.user.email}`,
      title: "New professional user",
      delivery: [
        {
          to: "#new-user-papertrail",
          method: "SLACK",
        },
      ],
    });

  },
});
