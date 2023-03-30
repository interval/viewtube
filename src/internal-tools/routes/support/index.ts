import { ctx, io, Layout, Page } from "@interval/sdk";
import { User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../database";

export default new Page({
  name: "🏡 Support",
  handler: async () => {

    // Load any data for rendering within components on the page
    const tickets = await prisma.customerSupportTicket.findMany({
      where: {
        status: "OPEN",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const today = new Date();
    const day = today.toLocaleDateString("en-US", { weekday: "long" });


    return new Layout({
      description: `Happy ${day}! Welcome to our customer support dashboard`,
      menuItems: [
        {
          label: "Customer operations guide",
          url: "https://example.com/customer-operations-guide",
          theme: "secondary",
        },
        {
          label: "Create engineering task",
          route: "support/create_ticket",
          theme: "primary",
        },
      ],
      children: [
        io.display.metadata("Metrics", {
          layout: "card",
          data: [
            {
              label: "Open tickets",
              value: "122",
            },
            {
              label: "Closed tickets (last 7 days)",
              value: "435",
            },
            {
              label: "CSAT (last 7 days)",
              value: "✅ 94%",
            },
            {
              label: "CSAT (last 30 days)",
              value: "❌ 88%",
            },
            {
              label: "Avg. response time (last 7 days)",
              value: "⬇️ 1h 23m",
            },
            {
              label: "Avg. response time (last 30 days)",
              value: "⬆️ 1h 41m",
            },
          ],
        }),
        io.display.table("Recent incidents", {
          data: [
            {
              description: "Email receipts labels were incorrectly dated from March 12-18",
              severity: "Low",
              link: "https://example.com/incident/123",
            },
            {
              description: "Video uploads were down for 2 hours on March 18",
              severity: "High",
              link: "https://example.com/incident/456",
            },
            {
              description: "User users were unable to log in via 2FA on March 19",
              severity: "Medium",
              link: "https://example.com/incident/789",
            },
          ],
          isFilterable: false,
          isSortable: false,
        }),
        io.display.heading("Open tickets", {
          menuItems: [
            {
              label: "Create incident",
              url: "https://example.com/incident/create",
              theme: "danger",
            },
            {
              label: "Add user note",
              action: "users/add_note",
            },
            {
              label: "Feature flags",
              action: "feature_flag_manager",
            },
          ],
        }),
        io.display.table("Tickets", {
          data: tickets,
          columns: ["id", "title", "severity", "contactMethod", "status", "createdAt"],
          rowMenuItems: row => [
            {
              label: "Close",
              action: "support/close_ticket",
              theme: "danger",
              params: {
                ticketId: row.id,
              },
            },
          ],
        }),
      ],
    });
  },
});
