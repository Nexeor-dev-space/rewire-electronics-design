import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage, AdminEmptyState } from "@/components/admin/admin-page";
import { ADMIN_ROOT, flattenAdminNav, matchAdminRoute } from "@/lib/admin-nav";

interface Props {
  params: Promise<{ slug: string[] }>;
}

function pathFrom(slug: string[]): string {
  return [ADMIN_ROOT, ...slug].join("/");
}

const BUILT_ROUTES = new Set(["/admin/storefront/content"]);

export function generateStaticParams() {
  const routes = flattenAdminNav().flatMap(({ item }) => [
    item.href,
    ...(item.routes ?? []),
  ]);

  return routes
    .filter((route) => route !== ADMIN_ROOT && !BUILT_ROUTES.has(route))
    .map((route) => ({
      slug: route.slice(`${ADMIN_ROOT}/`.length).split("/"),
    }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const match = matchAdminRoute(pathFrom(slug));
  return { title: match?.item.label ?? "Not found" };
}

export default async function AdminModulePage({ params }: Props) {
  const { slug } = await params;
  const match = matchAdminRoute(pathFrom(slug));

  if (!match) notFound();

  const { item, rest } = match;

  return (
    <AdminPage title={item.label} description={item.description}>
      <AdminEmptyState
        description={
          rest.length > 0
            ? `${item.label} does not have this screen yet. The route resolves so the navigation and the breadcrumbs are correct; the screen itself arrives with the module.`
            : `${item.label} is scaffolded but not built. This issue establishes the route, the navigation and the shell only.`
        }
      />
    </AdminPage>
  );
}
