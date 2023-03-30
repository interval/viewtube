import { z } from "zod";
import { Action, io, ctx } from "@interval/sdk";
import { prisma } from "../../../database";

export default new Action({
  name: "Close ticket",
  handler: async () => {
    const { ticketId } = z
      .object({
        ticketId: z.string().optional(),
      })
      .parse(ctx.params);

  const ticket = ticketId
    ? await prisma.customerSupportTicket.findUniqueOrThrow({ where: { id: ticketId } })
    : await io.search("Select the ticket to close", {
        renderResult: (row) => ({
          label: row.title,
          description: row.description,
        }),
        onSearch: async (query) => {
          const tickets = await prisma.customerSupportTicket.findMany({
            where: {
              title: {
                mode: "insensitive",
                contains: query,
              },
            },
            take: 10,
            orderBy: {
              createdAt: "desc",
            },
          });
          return tickets
        }
      })

    if (ticket.status === "CLOSED") {
      return "This ticket is already closed"
    }

    await io.display.metadata(`Ticket`, {
      layout: "list",
      //@ts-ignore
      data: Object.entries(ticket).map(([k, v]) => ({
        label: k,
        value: v,
      })),
    });

    const confirmed = await io.confirm("Are you sure you want to close this ticket?")

    if (confirmed) {
      await prisma.customerSupportTicket.update({
        where: {
          id: ticket.id,
        },
        data: {
          status: "CLOSED",
        },
      });
      return "Ticket closed";
    } else {
      return "Cancelled"
    }

  },
});
