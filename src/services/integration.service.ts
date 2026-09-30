import "server-only";

import type { IntegrationKey as PrismaIntegrationKey } from "@/generated/prisma/client";
import { readAuthSecret } from "@/lib/auth/auth-secret";
import { openSecret, sealSecret } from "@/lib/crypto/secret-box";
import { prisma } from "@/lib/db";
import {
  hintOf,
  integrationFeatures,
  resolveIntegrationConfig,
  type IntegrationConfig,
  type IntegrationValues,
} from "@/lib/integration-config";
import { INTEGRATION_KEYS, isIntegrationKey } from "@/lib/integration-keys";
import type { IntegrationKey, IntegrationMode, IntegrationStatus } from "@/types/integration";

const SETTINGS_ID = 1;
const DEFAULT_MODE: IntegrationMode = "DEV";
const KEYS = INTEGRATION_KEYS satisfies readonly PrismaIntegrationKey[];

const globalForIntegrations = globalThis as unknown as {
  integrationConfig: Promise<IntegrationConfig> | undefined;
};

interface StoredCredential {
  key: IntegrationKey;
  value: string | null;
  hint: string | null;
  updatedAt: Date;
}

function openOrNull(key: IntegrationKey, sealed: string): string | null {
  try {
    return openSecret(sealed, key);
  } catch {
    console.warn(`integration credential ${key} unreadable; re-enter it (AUTH_SECRET changed?)`);
    return null;
  }
}

async function readStored() {
  readAuthSecret();
  const [settings, rows] = await Promise.all([
    prisma.integrationSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { mode: true, updatedAt: true },
    }),
    prisma.integrationCredential.findMany({
      select: { key: true, valueEncrypted: true, hint: true, updatedAt: true },
    }),
  ]);
  const credentials: StoredCredential[] = rows.flatMap(({ key, valueEncrypted, hint, updatedAt }) =>
    isIntegrationKey(key) ? [{ key, value: openOrNull(key, valueEncrypted), hint, updatedAt }] : [],
  );
  return { settings, credentials };
}

function valuesOf(credentials: StoredCredential[]): IntegrationValues {
  const values: IntegrationValues = {};
  for (const credential of credentials) {
    if (credential.value !== null) values[credential.key] = credential.value;
  }
  return values;
}

async function loadIntegrationConfig(): Promise<IntegrationConfig> {
  const { settings, credentials } = await readStored();
  return resolveIntegrationConfig(settings?.mode ?? DEFAULT_MODE, valuesOf(credentials));
}

function clearIntegrationCache() {
  globalForIntegrations.integrationConfig = undefined;
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const { settings, credentials } = await readStored();
  const mode = settings?.mode ?? DEFAULT_MODE;
  const byKey = new Map(credentials.map((credential) => [credential.key, credential]));

  return {
    mode,
    modeUpdatedAt: settings?.updatedAt.toISOString() ?? null,
    credentials: KEYS.map((key) => {
      const stored = byKey.get(key);
      return {
        key,
        isSet: stored !== undefined,
        readable: stored !== undefined && stored.value !== null,
        hint: stored?.hint ?? null,
        updatedAt: stored?.updatedAt.toISOString() ?? null,
      };
    }),
    features: integrationFeatures(resolveIntegrationConfig(mode, valuesOf(credentials))),
  };
}

export async function setIntegrationMode(
  mode: IntegrationMode,
  actorId: string,
): Promise<IntegrationStatus> {
  await prisma.integrationSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, mode, updatedById: actorId },
    update: { mode, updatedById: actorId },
  });
  clearIntegrationCache();
  return getIntegrationStatus();
}

export async function setIntegrationCredential(
  key: IntegrationKey,
  value: string,
  actorId: string,
): Promise<IntegrationStatus> {
  const data = { valueEncrypted: sealSecret(value, key), hint: hintOf(value), updatedById: actorId };
  await prisma.integrationCredential.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
  });
  clearIntegrationCache();
  return getIntegrationStatus();
}

export async function deleteIntegrationCredential(key: IntegrationKey): Promise<IntegrationStatus> {
  await prisma.integrationCredential.deleteMany({ where: { key } });
  clearIntegrationCache();
  return getIntegrationStatus();
}

export function getIntegrationConfig(): Promise<IntegrationConfig> {
  const cached = globalForIntegrations.integrationConfig;
  if (cached) return cached;

  const pending: Promise<IntegrationConfig> = loadIntegrationConfig().catch((error: unknown) => {
    if (globalForIntegrations.integrationConfig === pending) clearIntegrationCache();
    throw error;
  });
  globalForIntegrations.integrationConfig = pending;
  return pending;
}
