import { redirect } from "next/navigation";
import { HOMEPAGE_BUILDER_PATH, HOMEPAGE_SECTION_PARAM } from "@/lib/constants";

export default function Page() {
  redirect(`${HOMEPAGE_BUILDER_PATH}?${HOMEPAGE_SECTION_PARAM}=BEST_DEALS`);
}
