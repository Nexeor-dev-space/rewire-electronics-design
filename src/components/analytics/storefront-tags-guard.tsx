"use client";

import { useEffect } from "react";
import { reloadIfStorefrontTagsRunning } from "@/lib/analytics";

export function StorefrontTagsGuard() {
  useEffect(() => {
    reloadIfStorefrontTagsRunning();
  }, []);

  return null;
}
