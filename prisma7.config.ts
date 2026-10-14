import "dotenv/config";
import { defineConfig } from "prisma/config";
import { optionalDatabaseUrl } from "./src/lib/env";

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: optionalDatabaseUrl(),
  },
});
