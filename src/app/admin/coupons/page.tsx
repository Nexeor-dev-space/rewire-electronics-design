import { redirect } from "next/navigation";

/** Alias for Discount Codes — the module lives at its Marketing route. */
export default function CouponsAliasPage() {
  redirect("/admin/marketing/coupons");
}
