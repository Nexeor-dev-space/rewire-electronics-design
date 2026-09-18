import { redirect } from "next/navigation";

/** Users has no screen of its own — the two lists beneath it do. */
export default function UsersPage() {
  redirect("/admin/users/customers");
}
