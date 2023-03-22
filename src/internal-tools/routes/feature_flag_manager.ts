/*
    A tool to manage feature flags for an app. 
    Can easily be remixed into a production-ready tool for your team.

    This example demonstrates some advanced Interval functionality like:
    - Customizing the submit button in an `io.group`
    - Using a custom validator function
    - Calling `io.group` with an object instead of an array
*/
import { Action, io } from "@interval/sdk";
import { FeatureFlag } from "@prisma/client";
import { prisma } from "../../database";

function boolToEmoji(someBool: boolean) {
  return someBool ? "✅" : "❌";
}

const sharedColumns = [
  {
    accessorKey: "slug",
    label: "Name",
  },
  {
    accessorKey: "description",
    label: "Description",
  },
] as const;

export default new Action({
  name: "⛳️ Feature flag manager",
  description: `Use to toggle experimental app features.`,
  handler: async () => {
    const allFlags = await prisma.featureFlag.findMany();

    /*
        For UI purposes we want to render two tables...
        But we only want one selection across both tables.


        We combine the selections from each table by calling .flat() on the returned array. 
        Then we pick the first item, since our validate function guarantees only one item has been selected.
    */
    const selectedFlag = (
      await io
        .group(
          [
            io.select.table(`✅ Currently enabled flags`, {
              data: allFlags.filter((f) => f.isEnabled),
              columns: [
                ...sharedColumns,
                {
                  label: "Staging status",
                  renderCell: (row) => {
                    if (!row.isEnabled) return null;
                    return boolToEmoji(
                      row.enabledEnvironments.includes("STAGING")
                    );
                  },
                },
                {
                  label: "Production status",
                  renderCell: (row) => {
                    if (!row.isEnabled) return null;
                    return boolToEmoji(
                      row.enabledEnvironments.includes("PRODUCTION")
                    );
                  },
                },
                {
                  label: "Rollout %",
                  renderCell: (row) => row.rolloutPercentage + "%",
                },
              ],
            }),
            io.select.table(`❌ Currently disabled flags`, {
              data: allFlags.filter((f) => !f.isEnabled),
              columns: [...sharedColumns],
            }),
          ],
          { continueButton: { label: "Edit flag" } }
        )
        // custom validator to ensure only one row is selected across both tables
        .validate((pendingSelections) => {
          if (pendingSelections.flat().length !== 1) {
            return `You can only edit one flag at a time. Please select a single flag to edit`;
          }
        })
    ).flat()[0];

    // We could use io.input.boolean here too!
    const newEnabledValue =
      (await io.select.single(`New status for ${selectedFlag.slug}`, {
        options: ["Enabled", "Disabled"],
        defaultValue: selectedFlag.isEnabled ? "Enabled" : "Disabled",
      })) === "Enabled"; // casts "Enabled" | "Disabled" to a boolean

    let flagConfig: Partial<FeatureFlag> = {};

    if (newEnabledValue === false) {
      if (newEnabledValue !== selectedFlag.isEnabled) {
        const isConfirmed = await io.confirm(
          "Are you sure you want to disable this flag?"
        );
        if (!isConfirmed) return;
      }
    } else {
      // Check this out! `Groups can accept an object as well as an array
      flagConfig = await io.group(
        {
          rolloutPercentage: io.input.number("Rollout percentage", {
            defaultValue: selectedFlag.rolloutPercentage,
            max: 100,
            min: 0,
          }),
          enabledEnvironments: io.select.multiple("Enabled environments", {
            defaultValue: selectedFlag.enabledEnvironments,
            options: ["PRODUCTION", "STAGING"],
          }),
        },
        {
          continueButton: {
            theme: "danger",
            label: `Update flag`,
          },
        }
      );
    }

    const updatedFlag = await prisma.featureFlag.update({
      where: {
        slug: selectedFlag.slug,
      },
      data: {
        isEnabled: newEnabledValue,
        ...flagConfig,
      },
    });
    return updatedFlag as {};
  },
});
