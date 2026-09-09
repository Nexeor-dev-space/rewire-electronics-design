import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { listPolicies } from "@/lib/policies";
import { POLICY_ROUTES } from "@/lib/policy-types";

export const metadata: Metadata = { title: "Content & Policies" };

export default async function ContentPoliciesPage() {
  const policies = await listPolicies();

  return (
    <AdminPage
      title="Content & Policies"
      description="The six policy pages published on the storefront. Editing one updates its page immediately — no deployment."
    >
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="hidden grid-cols-12 gap-4 border-b border-line bg-surface-2 px-5 py-3 md:grid">
          <p className="col-span-5 eyebrow">Policy</p>
          <p className="col-span-3 eyebrow">Sections</p>
          <p className="col-span-4 eyebrow">Last updated</p>
        </div>

        <ul>
          {policies.map((policy) => (
            <li key={policy.slug} className="border-b border-line last:border-b-0">
              <div className="grid gap-2 px-5 py-4 md:grid-cols-12 md:items-center md:gap-4">
                <div className="md:col-span-5">
                  <Link
                    href={`/admin/storefront/content/${policy.slug}`}
                    className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {policy.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-muted">
                    {policy.slug}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:col-span-3">
                  <span className="text-sm text-ink-secondary">
                    {policy.blockCount}
                  </span>
                  {policy.draft && <Badge variant="warn">Draft</Badge>}
                  {!policy.published && <Badge variant="outline">Unpublished</Badge>}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-4">
                  <time
                    dateTime={policy.updatedAt}
                    className="text-sm text-ink-secondary"
                  >
                    {new Date(policy.updatedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>

                  <Link
                    href={POLICY_ROUTES[policy.slug]}
                    target="_blank"
                    rel="noopener"
                    className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                  >
                    View page
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {policies.length === 0 && (
        <p className="mt-4 text-sm text-ink-secondary">
          No policies found. Run <code className="text-ink">npm run db:seed</code>{" "}
          to create them.
        </p>
      )}
    </AdminPage>
  );
}
