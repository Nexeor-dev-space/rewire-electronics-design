"use client";

import { createContext, useContext, type ReactNode } from "react";
import { defaultNavigation, toPublishedNavigation } from "@/lib/navigation-config";
import type { PublishedNavigation } from "@/types/navigation";

const NavigationContext = createContext<PublishedNavigation>(
  toPublishedNavigation(defaultNavigation()),
);

export function NavigationProvider({
  navigation,
  children,
}: {
  navigation: PublishedNavigation;
  children: ReactNode;
}) {
  return <NavigationContext.Provider value={navigation}>{children}</NavigationContext.Provider>;
}

/** The published header, footer and mobile bar navigation. */
export function useNavigation(): PublishedNavigation {
  return useContext(NavigationContext);
}
