import { z } from "zod";
import "dotenv/config"; // loads environment variables from .env

const envVars = z.object({
  DATABASE_URL: z.string(),
  INTERVAL_API_KEY: z.string(),
});

// throws if vars are missing
envVars.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVars> {}
  }
}
