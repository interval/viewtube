import os from "os";
import { io, Layout, Page } from "@interval/sdk";

/*
    If your Interval tools run in the same process as your main application, you can directly query for system information like RAM usage, making Interval a powerful tool for sysadmin tasks including debugging and troubleshooting.
*/

function toMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)}mb`;
}

// Info about the Node.js process
function processInfo() {
  const memUsage = process.memoryUsage();
  const resourceUsage = process.resourceUsage();

  return [
    io.display.heading("Process info"),
    io.display.metadata("Overview", {
      layout: "card",
      data: [
        {
          label: "Uptime (seconds)",
          value: process.uptime(),
        },
        {
          label: "Arch",
          value: `${process.arch} ${process.platform}`,
        },
        {
          label: "Node version",
          value: process.version,
        },
        {
          label: "PID",
          // By default, Interval formats numbers.
          // Converting to a string before display prevents the PID from being formatted
          value: process.pid.toString(),
        },
      ],
    }),
    io.display.metadata("Memory", {
      layout: "card",
      data: [
        {
          label: "Total allocated",
          value: toMb(memUsage.rss),
        },
        {
          label: "Heap total",
          value: toMb(memUsage.heapTotal),
        },
        {
          label: "Heap used",
          value: toMb(memUsage.heapUsed),
        },
      ],
    }),
    io.display.metadata("CPU", {
      layout: "card",
      data: [
        {
          label: "User CPU time (microseconds)",
          value: resourceUsage.userCPUTime,
        },
        {
          label: "System CPU time (microseconds)",
          value: resourceUsage.userCPUTime,
        },
      ],
    }),
  ];
}

// Info about the physical server
function serverInfo() {
  const memUsage = process.memoryUsage();
  const resourceUsage = process.resourceUsage();

  return [
    io.display.heading("Server info"),
    io.display.metadata("Overview", {
      layout: "card",
      data: [
        {
          label: "Uptime (seconds)",
          value: process.uptime(),
        },
        {
          label: "Arch",
          value: process.arch,
        },
        {
          label: "Node version",
          value: process.version,
        },
        {
          label: "PID",
          // By default, Interval formats numbers.
          // Converting to a string before display prevents the PID from being formatted
          value: process.pid.toString(),
        },
      ],
    }),
    io.display.metadata("Memory", {
      layout: "card",
      data: [
        {
          label: "Total",
          value: toMb(os.totalmem()),
        },
        {
          label: "Free",
          value: toMb(os.freemem()),
        },
      ],
    }),
    io.display.metadata("CPU", {
      layout: "card",
      data: [
        {
          label: "Cores",
          value: os.cpus().length,
        },
      ],
    }),
  ];
}

export default new Page({
  name: "🖥️ System information",
  description: `Information about the app server. Useful for debugging performance issues.`,
  handler: async () => {
    return new Layout({
      children: [...processInfo(), ...serverInfo()],
    });
  },
});
