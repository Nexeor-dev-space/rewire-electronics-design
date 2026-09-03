import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage, AdminEmptyState } from "@/components/admin/admin-page";
import { ADMIN_ROOT, flattenAdminNav, matchAdminRoute } from "@/lib/admin-nav";

/**
 * Placeholder for every admin module that has not been built yet.
 *
 * One route resolves them all: the path is matched against the
 * navigation config, and the module it belongs to supplies the title and
 * the description. A module declared in `@/lib/admin-nav` therefore has
 * a working route the moment it is declared, with no file to add here.
 *
 * Because a static segment beats a catch-all in the App Router, building
 * a real module is purely additive: create
 * `src/app/admin/products/page.tsx` and it takes over `/admin/products`
 * from this file, with nothing here to unpick.
 *
 * A module owns its descendants, so the screens each module will grow
 * later — `/admin/products/add`, `/admin/orders/1042` — resolve today
 * under their parent, with the parent's navigation row active and the
 * breadcrumb trail correct, which is what lets that behaviour be
 * verified before a single module exists.
 *
 * Known quirk: Next 15.5 does not set a 404 status for `notFound()`
 * raised inside a catch-all route. A path no module owns renders the
 * admin not-found screen, correctly, but answers 200. It resolves itself
 * as modules land and claim their own static segments; see
 * docs/ADMIN-PANEL.md.
 */

interface Props {
  params: Promise<{ slug: string[] }>;
}

function pathFrom(slug: string[]): string {
  return [ADMIN_ROOT, ...slug].join("/");
}

/**
 * Every declared module route, prerendered.
 *
 * The modules are then static rather than rendered per request, and the
 * build output lists them, so a route that stops resolving shows up in
 * CI rather than on someone's screen. Deeper paths are not enumerable
 * and stay on demand.
 */
export function generateStaticParams() {
  const routes = flattenAdminNav().flatMap(({ item }) => [
    item.href,
    ...(item.routes ?? []),
  ]);

  return routes
    .filter((route) => route !== ADMIN_ROOT)
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
