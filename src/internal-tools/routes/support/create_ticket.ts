import { Action, io, ctx } from "@interval/sdk";
import { prisma } from "../../../database";
import { TicketSeverity, TicketContactMethod } from "@prisma/client";
import { requireUser } from "../../helpers/users";

export default new Action({
  name: "Create ticket",
  handler: async () => {
    const ticket = await io.group({
      title: io.input.text("Title"),
      severity: io.select.single("Severity", {
        options: ["LOW", "MEDIUM", "HIGH"],
      }),
      contactMethod: io.select.single("Contact method", {
        options: ["EMAIL", "CHAT", "PHONE"],
      }),
      description: io.input.richText("Description"),
    })

    await prisma.customerSupportTicket.create({
      data: {
        title: ticket.title,
        severity: ticket.severity as TicketSeverity,
        contactMethod: ticket.contactMethod as TicketContactMethod,
        status: "OPEN",
      },
    });

  },
});
