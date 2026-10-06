import { redirect } from "next/navigation";

/** Trash has no screen of its own — the two lists beneath it do. */
export default function TrashPage() {
  redirect("/admin/trash/products");
}
