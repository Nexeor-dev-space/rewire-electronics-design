import "server-only";

import { notConfiguredError } from "@/lib/email/send-email";
import { getIntegrationConfig } from "@/services/integration.service";

export async function appUrl(path: string): Promise<string> {
  const { appUrl: base } = await getIntegrationConfig();
  if (!base) throw notConfiguredError();
  return new URL(path, base).toString();
}
