import "./envVars";
import interval from "./internal-tools";
import express from "express";
import path from "path";
import { prisma } from "./database";
const app = express();
const port = 4000; // default port to listen

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.post("/comment/flag/:id", async (req, res) => {
  await interval.routes.enqueue("moderate_comment", {
    params: {
      commentId: req.params.id,
    },
  });

  return res.json({ flagged: true });
});

app.get("/", async (req, res) => {
  const videos = await prisma.video.findMany();
  res.render("index", { videos });
});

app.get("/video/:id", async (req, res) => {
  const video = await prisma.video.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      comments: {
        include: {
          author: true,
        },
      },
    },
  });

  res.render("video", { video });
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
