/*
  This is an example of a complex action with multiple steps and conditional logic.
  
*/
import { io, ctx, Action } from "@interval/sdk";
import { z } from "zod";
import { prisma } from "../../database";
import { banUserByEmail } from "../../users";

// Any function can I/O method calls.
// Just be sure to _only_ call functions with I/O calls inside of Interval actions/pages.
function getVideoToModerate(videoId?: string) {
  if (videoId) {
    return prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
      include: {
        comments: true,
      },
    });
  }
  return io.search("Choose a video to moderate", {
    onSearch: async (query) => {
      const videos = await prisma.video.findMany({
        where: {
          title: {
            mode: "insensitive",
            contains: query,
          },
        },
        include: {
          comments: true,
        },
        take: 10,
      });
      return videos;
    },
    renderResult: (row) => ({ label: row.title, value: row.id }),
  });
}

export default new Action({
  name: "💬 Moderate comment",
  handler: async () => {
    let commentIdsToModerate: string[] = [];

    const { commentId, videoId } = z
      .object({
        commentId: z.string().optional(),
        videoId: z.string().optional(),
      })
      .parse(ctx.params);

    /*
      It's possible to skip UI steps by using ctx.params
      When the commentId param is present, we don't need to show the UI to find a comment to moderate
    */
    if (commentId) {
      commentIdsToModerate.push(commentId);
    } else {
      const videoWithComments = await getVideoToModerate(videoId);
      const selectedComments = await io.select.table(
        "Select comments to moderate",
        {
          data: videoWithComments.comments,
        }
      );
      selectedComments.forEach((comment) =>
        commentIdsToModerate.push(comment.id)
      );
    }

    const commentsToModerate = await prisma.userComment.findMany({
      where: {
        id: {
          in: commentIdsToModerate,
        },
      },
      include: {
        author: true,
      },
    });

    /*
      I/O methods can be called inside of loops. 
      Here, we render an io.group w/ the UI to moderate a comment for every comment in our queue.
    */
    for (const comment of commentsToModerate) {
      const { choice } = await io
        .group([
          io.display.metadata("Comment details", {
            layout: "list",
            data: [
              { label: "Author", value: comment.author.name },
              { label: "Created", value: comment.createdAt },
              { label: "Id", value: comment.id },
              { label: "Content", value: comment.content },
            ],
          }),
          io.display.markdown(`
            **Note:** If you choose to ban the user, their account will be scheduled to be permanently deleted from our database. Any videos they uploaded will be marked for deletion.
          `),
        ])
        .withChoices([
          {
            label: "Allow",
            value: "allow",
          },
          {
            label: "Mark comment as spam",
            value: "mark-spam",
          },
          {
            label: "Delete comment and ban user",
            value: "ban",
          },
        ]);
      if (choice === "allow") continue;
      if (choice === "ban") {
        const isConfirmed = await io.confirm(
          "Are you sure you want to ban this user?",
          {
            helpText: comment.author.name || comment.author.email,
          }
        );
        if (isConfirmed) {
          await prisma.userComment.delete({
            where: {
              id: comment.id,
            },
          });
          await banUserByEmail(comment.author.email);
        }
      }
      if (choice === "mark-spam") {
        await prisma.userComment.update({
          where: {
            id: comment.id,
          },
          data: {
            isSpam: true,
          },
        });
      }
    }
  },
});
