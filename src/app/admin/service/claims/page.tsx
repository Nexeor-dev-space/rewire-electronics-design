import { redirect } from "next/navigation";
import { ADMIN_WARRANTY_PATH } from "@/lib/constants";

/** Claims are reached from their device, so the bare claims path opens the warranty table. */
export default function ClaimsPage() {
  redirect(ADMIN_WARRANTY_PATH);
}
