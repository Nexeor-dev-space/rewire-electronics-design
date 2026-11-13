"use client";

import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetIntegrations } from "@/hooks/use-integrations";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { INTEGRATIONS } from "@/lib/integrations";
import { IntegrationRow, INTEGRATION_CARD } from "./integration-row";

export function IntegrationsScreen() {
  const { edit: canEdit } = useModuleAccess(PERMISSIONS.integrations);
  const integrations = useGetIntegrations();

  return (
    <AdminPage
      title="API Keys"
      description="Analytics and site verification IDs for the storefront, and the status and tests of email and Stripe."
    >
      {integrations.isPending ? (
        <div aria-busy className="max-w-2xl space-y-6">
          {INTEGRATIONS.map((definition) => (
            <div key={definition.key} className={INTEGRATION_CARD}>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-5 h-11 w-full" />
              <Skeleton className="mt-5 h-9 w-20" />
            </div>
          ))}
        </div>
      ) : integrations.isError ? (
        <div role="alert" className="max-w-2xl rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
          <p className="text-sm text-ink-secondary">{integrations.error.message}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => integrations.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {!canEdit && (
            <p className="mb-4 text-xs text-ink-muted">
              Your role can view these integrations but not change or test them.
            </p>
          )}
          <ul className="max-w-2xl space-y-6">
            {integrations.data.map((integration) => (
              <li key={integration.key}>
                <IntegrationRow integration={integration} canEdit={canEdit} />
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminPage>
  );
}
