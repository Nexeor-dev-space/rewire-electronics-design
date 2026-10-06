import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { auditDiff, auditSnapshot, type AuditAction } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import type { auditListQuerySchema } from "@/validators/audit.validator";

/**
 * The admin change log. Routes call `recordAudit` after a change succeeds:
 *
 *   recordAudit(auth.session.user, {
 *     action: "UPDATE", module: PERMISSIONS.brands,
 *     recordId: id, recordLabel: after.name, before, after,
 *   });
 *
 * It never throws and never blocks the response for long: a failed write is
 * logged to the server console and the change stands. Secrets must not be
 * passed in; `auditSnapshot` also drops password fields.
 */

export interface AuditEntry {
  action: AuditAction;
  module: string;
  recordId?: string | null;
  recordLabel: string;
  before?: object | null;
  after?: object | null;
}

export async function recordAudit(actor: SessionUser, entry: AuditEntry): Promise<void> {
  let before = auditSnapshot(entry.before);
  let after = auditSnapshot(entry.after);

  // An update stores only what changed, and a save that changed nothing is not logged.
  if (entry.action === "UPDATE" && before && after) {
    const diff = auditDiff(before, after);
    if (!diff) return;
    ({ before, after } = diff);
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        action: entry.action,
        module: entry.module,
        recordId: entry.recordId ?? null,
        recordLabel: entry.recordLabel,
        before: (before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (after ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error(`recordAudit(${entry.module} ${entry.action}) failed`, error);
  }
}

type AuditQuery = z.output<typeof auditListQuerySchema>;

export async function listAuditLogs({ page, pageSize, module, action, search }: AuditQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(module ? { module } : {}),
    ...(action ? { action } : {}),
    ...(search
      ? {
          OR: [
            { recordLabel: { contains: search, mode: "insensitive" } },
            { actorName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        actorName: true,
        actorRole: true,
        action: true,
        module: true,
        recordId: true,
        recordLabel: true,
        before: true,
        after: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items: rows, page, pageSize, total };
}
