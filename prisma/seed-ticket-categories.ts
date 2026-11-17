import type { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_TICKET_CATEGORIES } from "../src/lib/support-tickets";

export async function seedTicketCategories(prisma: PrismaClient) {
  const before = await prisma.ticketCategory.count();

  for (const [sortOrder, name] of DEFAULT_TICKET_CATEGORIES.entries()) {
    await prisma.ticketCategory.upsert({
      where: { nameKey: name.toLowerCase() },
      create: { name, nameKey: name.toLowerCase(), sortOrder },
      update: {},
    });
  }

  const after = await prisma.ticketCategory.count();
  console.log(`  ${after - before} created, ${before} kept as edited`);
}
