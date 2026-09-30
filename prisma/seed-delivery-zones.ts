import type { PrismaClient } from "../src/generated/prisma/client";
import { EMIRATE_VALUES } from "../src/lib/emirates";

const DEFAULT_ZONE = {
  standardFee: 0,
  standardMinDays: 2,
  standardMaxDays: 4,
  expressFee: 35_00,
  expressMinDays: 1,
  expressMaxDays: 2,
};

export async function seedDeliveryZones(prisma: PrismaClient) {
  const before = await prisma.deliveryZone.count();

  for (const emirate of EMIRATE_VALUES) {
    await prisma.deliveryZone.upsert({
      where: { emirate },
      create: { emirate, ...DEFAULT_ZONE },
      update: {},
    });
  }

  const after = await prisma.deliveryZone.count();
  console.log(`  ${after - before} created, ${before} kept as edited`);
}
