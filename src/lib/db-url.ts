export function optionalDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

export function databaseUrl(): string {
  const url = optionalDatabaseUrl();

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env — see docs/POLICY-CMS.md.",
    );
  }

  return url;
}
