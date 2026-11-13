import "dotenv/config";
import { parseArgs } from "node:util";
import { readSheet } from "read-excel-file/node";
import { prisma } from "../src/lib/db";
import { sheetCatalogue, type StoredProduct } from "../src/lib/dummy-cleanup";
import { databaseEnv } from "../src/lib/env";
import { TEMPLATE_SHEET_NAME, parseTemplateSheet } from "../src/lib/product-import-template";
import {
  applyCleanup,
  loadCleanupSnapshot,
  verifyCleanup,
  type CleanupSnapshot,
} from "../src/services/dummy-cleanup.service";

function databaseTarget() {
  const url = new URL(databaseEnv().DATABASE_URL);
  return `${url.hostname}${url.port ? `:${url.port}` : ""}/${url.pathname.slice(1)}`;
}

const label = (product: StoredProduct) =>
  `${product.name} (${product.slug})${product.deletedAt ? " [in Trash]" : ""}`;

function printList(title: string, lines: string[]) {
  console.log(`${title}: ${lines.length}`);
  for (const line of lines) console.log(`  ${line}`);
}

function printSnapshot({ plan, addresses, links, untouched }: CleanupSnapshot) {
  printList("Products to delete", plan.remove.map(label));
  printList("Products kept (in the sheet)", plan.keep.map(label));
  printList("Sheet products not found", plan.missing.map((product) => `${product.name} (${product.slug})`));
  console.log(`Sheet SKUs not found: ${plan.missingSkus.length}${plan.missingSkus.length ? ` (${plan.missingSkus.join(", ")})` : ""}`);
  printList(
    "Kept products with variants not in the sheet (left alone)",
    plan.extraVariants.map(({ product, skus }) => `${product.slug}: ${skus.join(", ")}`),
  );
  console.log(`Saved addresses to delete: ${addresses}`);
  console.log("Linked to the products being deleted:");
  for (const [name, count] of Object.entries(links)) console.log(`  ${name}: ${count}`);
  console.log("Tables that must not change:");
  for (const [name, count] of Object.entries(untouched)) console.log(`  ${name}: ${count}`);
  printList("Blockers", plan.blockers);
}

async function main() {
  const { values } = parseArgs({
    options: { sheet: { type: "string" }, apply: { type: "boolean", default: false } },
  });
  if (!values.sheet) throw new Error("Pass the product sheet: --sheet <path to xlsx>.");

  const sheet = sheetCatalogue(parseTemplateSheet(await readSheet(values.sheet, TEMPLATE_SHEET_NAME)).rows);
  console.log(`Database: ${databaseTarget()}`);
  console.log(`Sheet: ${sheet.length} products, ${sheet.reduce((sum, product) => sum + product.skus.length, 0)} SKUs`);
  console.log(values.apply ? "Mode: APPLY" : "Mode: dry run (nothing is written)");

  const before = await loadCleanupSnapshot(sheet);
  printSnapshot(before);
  if (before.plan.blockers.length > 0) {
    process.exitCode = 1;
    return;
  }
  if (!values.apply) return;

  const result = await applyCleanup(before);
  printList("Deleted permanently", result.purged.map(label));
  printList("Skipped (left in Trash)", result.skipped.map(({ product, reason }) => `${label(product)}: ${reason}`));
  console.log(`Saved addresses deleted: ${result.addressesDeleted}`);

  const problems = await verifyCleanup(sheet, before, result);
  printList("Verification problems", problems);
  if (problems.length > 0) process.exitCode = 1;
  else console.log("Verified: only sheet products remain, no saved addresses, other tables unchanged.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
