import "server-only";

import { notConfiguredError } from "@/lib/email/send-email";
import { getIntegrationConfig } from "@/lib/integration-config";

export async function appUrl(path: string): Promise<string> {
  const { appUrl: base } = getIntegrationConfig();
  if (!base) throw notConfiguredError();
  return new URL(path, base).toString();
}
