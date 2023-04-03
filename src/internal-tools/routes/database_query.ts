import { Configuration, OpenAIApi } from "openai";
import { Action, ctx, io } from "@interval/sdk";
import { prisma } from "../../database";

export default new Action({
  name: "🗂️ AI database query",
  description: `Answer questions about ViewTube data with help from OpenAI`,
  handler: async () => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        `This action requires the OPENAI_API_KEY environment variable to be set.`
      );
    }
    const result = await prisma.$queryRawUnsafe<
      {
        table_name: string;
        column_name: string;
      }[]
    >(`
        SELECT
            table_name,
            column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
    `);

    const tablesWithProps: Record<string, string[]> = {};

    for (const row of result) {
      if (!tablesWithProps[row.table_name]) {
        tablesWithProps[row.table_name] = [];
      }
      tablesWithProps[row.table_name].push(row.column_name);
    }

    const promptLines = [
      `Given the following Postgres SQL tables each with the "public" table_schema, with their properties:`,
      "#",
    ];
    for (const [table, props] of Object.entries(tablesWithProps)) {
      promptLines.push(`# ${table}(${props.join(", ")})`);
    }
    promptLines.push(`#`);

    const userQuery = await io.input.text("What do you want to know?", {
      multiline: true,
      placeholder:
        "List departments which employed more than 10 employees in the last 3 months",
    });

    promptLines.push(`Can you write a query to ${userQuery}`);
    promptLines.push(
      'Please make sure to enclose column names that contain uppercase characters in double quotes like this: SELECT "someColumn" from table;'
    );
    promptLines.push(`SELECT`);

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const prompt = promptLines.join(`\n`);
    // Uncomment these lines to debug prompt ⬇️
    // await io.display.code(`Generating query using the following prompt:`, {
    //   code: prompt,
    //   language: "plaintext",
    // });

    await ctx.loading.start("Generating query...");

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ content: prompt, role: "user" }],
      temperature: 0,
      max_tokens: 150,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: ["#", ";"],
    });

    const aiQuery =
      `SELECT ${response.data.choices[0].message?.content}`.trim();

    const { choice } = await io.display
      .markdown(["**Query to execute:**", "`" + aiQuery + "`"].join("\n"))
      .withChoices(["Execute query", "Cancel"]);

    if (choice !== "Execute query") {
      return;
    }

    const aiQueryResult = await prisma.$queryRawUnsafe<any[]>(aiQuery);

    await io.display.table(`${aiQueryResult.length} rows`, {
      data: aiQueryResult,
    });
  },
});
