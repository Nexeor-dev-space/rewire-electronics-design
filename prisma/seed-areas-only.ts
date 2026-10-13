import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { databaseUrl } from "../src/lib/db-url";
import { seedDeliveryAreas } from "./seed-delivery-areas";

/** `npm run db:seed:areas`: loads only the delivery areas, touching no other seeded data. */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl() }),
});

console.log("Delivery areas:");
seedDeliveryAreas(prisma)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
