**🚨 Important!** ViewTube is very much a work-in-progress! Expect this repo to change substantially in the near future.

## About

ViewTube is a pretend video-streaming app used in [Interval](https://github.com/interval/interval-node) examples. This repo contains the source code for ViewTube and it's internal tools. It is designed to show you how Interval works in "real world" applications.

Many things in the app/tools are mocked or aren't yet implemented.

## Project structure

ViewTube uses the popular [Prisma](https://www.prisma.io) ORM for all database access.

Because the project is primarily designed to show how to build internal tools with Interval, the public-facing ViewTube website is intentionally simple. It's an Express app with a few routes defined in `src/index.ts`. All the views for the Express app are stored in `src/views`.

Environment variables are loaded and parsed with [Zod](http://zod.dev) in `src/envVars.ts`.

All internal tools are located in `src/internal-tools`.

## Installing/running

1. `yarn install`
2. Create a `.env` file at the top level of the repository. The `.env` file should contain:

```
DATABASE_URL=<YOUR_POSTGRES_DATABASE_URL>
INTERVAL_API_KEY=<YOUR_INTERVAL_API_KEY>
```

3. `yarn run force-init-db`
4. `yarn run dev`

The `run dev` command will start the public-facing Express app on port 4000 and will connect to the Interval account associated with the API key that you specified in your `.env` file.
