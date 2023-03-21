import { Configuration, OpenAIApi } from "openai";
import { Action, io } from "@interval/sdk";
import { prisma } from "../../database";

export default new Action({
  name: "🗂️ AI-powered database query",
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
      `### Postgres SQL tables, with their properties:`,
      "#",
    ];
    for (const [table, props] of Object.entries(tablesWithProps)) {
      promptLines.push(`# ${table}(${props.join(", ")})`);
    }
    promptLines.push(`#`);

    const userQuery = await io.input.text("What do you want to know?", {
      multiline: true,
      defaultValue:
        "Select all users who created their accounts after May 2021",
      placeholder:
        "list departments which employed more than 10 employees in the last 3 months",
    });

    promptLines.push(`### A query to ${userQuery}`);
    promptLines.push(`SELECT`);

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const prompt = promptLines.join(`\n`);
    await io.display.code(`Generating query using the following prompt:`, {
      code: prompt,
      language: "plaintext",
    });

    const response = await openai.createCompletion({
      model: "code-davinci-002",
      prompt,
      temperature: 0,
      max_tokens: 150,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: ["#", ";"],
    });

    const aiQuery = `SELECT ${response.data.choices[0].text}`.trim();

    await io.display.code("Executing query:", {
      code: aiQuery,
    });

    const aiQueryResult = await prisma.$queryRawUnsafe<any[]>(aiQuery);

    await io.display.table(`${aiQueryResult.length} rows`, {
      data: aiQueryResult,
    });
  },
});
