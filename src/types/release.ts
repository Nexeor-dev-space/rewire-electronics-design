import type { z } from "zod";
import type { ReleaseStatus } from "@/lib/releases";
import type { releaseSchema } from "@/validators/release.validator";
import type { NamedRef } from "./product";

export interface AdminRelease {
  id: string;
  title: string;
  product: NamedRef;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  status: ReleaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LiveRelease {
  id: string;
  title: string;
  productName: string;
  startsAt: string;
  endsAt: string | null;
}

export type ReleaseFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type ReleaseInput = z.input<typeof releaseSchema>;
