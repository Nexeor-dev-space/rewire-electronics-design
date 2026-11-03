import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ADMIN_ROOT } from "@/lib/admin-nav";
import { RELEASE_STATUS_LABELS, type ReleaseStatus } from "@/lib/releases";

const BADGE_CLASS = "px-2 py-1 text-[0.625rem]";

const STATUS_VARIANTS: Record<ReleaseStatus, BadgeProps["variant"]> = {
  DRAFT: "default",
  UPCOMING: "outline",
  LIVE: "live",
  SOLD_OUT: "warn",
  COMPLETED: "soldOut",
};

export const RELEASES_ADMIN_PATH = `${ADMIN_ROOT}/releases`;

export function releaseAdminHref(id: string): string {
  return `${RELEASES_ADMIN_PATH}/${encodeURIComponent(id)}`;
}

export function ReleaseBadges({ status, hidden }: { status: ReleaseStatus; hidden: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={STATUS_VARIANTS[status]} className={BADGE_CLASS}>
        {RELEASE_STATUS_LABELS[status]}
      </Badge>
      {hidden && (
        <Badge variant="outline" className={BADGE_CLASS}>
          Hidden
        </Badge>
      )}
    </div>
  );
}
