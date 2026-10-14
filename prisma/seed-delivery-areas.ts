import { existsSync } from "node:fs";
import path from "node:path";
import { readSheet } from "read-excel-file/node";
import type { PrismaClient } from "../src/generated/prisma/client";
import { EMIRATES } from "../src/lib/emirates";

/** Two columns: emirate (as labelled, e.g. "Dubai") and place. Other rows are skipped. */
const AREAS_FILE = path.join(process.cwd(), "prisma", "data", "delivery-areas.xlsx");

function emirateOf(text: string) {
  const wanted = text.trim().toLowerCase();
  return EMIRATES.find((emirate) => emirate.label.toLowerCase() === wanted)?.value;
}

/** Creates only the missing areas, so an admin's edits are never overwritten. */
export async function seedDeliveryAreas(prisma: PrismaClient) {
  if (!existsSync(AREAS_FILE)) {
    console.log(`  skipped — no file at ${path.relative(process.cwd(), AREAS_FILE)}`);
    return;
  }

  const rows = await readSheet(AREAS_FILE);
  const data = [];
  for (const [emirateCell, placeCell] of rows) {
    if (typeof emirateCell !== "string" || typeof placeCell !== "string") continue;
    const emirate = emirateOf(emirateCell);
    const area = placeCell.trim();
    if (emirate && area) data.push({ emirate, area });
  }

  const { count } = await prisma.deliveryArea.createMany({ data, skipDuplicates: true });
  console.log(`  ${count} created, ${data.length - count} already there`);
}
