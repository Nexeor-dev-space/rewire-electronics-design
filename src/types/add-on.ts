import type { z } from "zod";
import type { AddOnKind, addOnSchema } from "@/validators/add-on.validator";
import type { NamedRef } from "./product";

export interface AddOnItem {
  id: string;
  name: string;
  note: string;
  kind: AddOnKind;
  price: number;
  popular: boolean;
  active: boolean;
  appliesToAll: boolean;
  categories: NamedRef[];
  updatedAt: string;
}

export type AddOnFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  kind?: AddOnKind;
  active?: "true" | "false";
};

export type AddOnInput = z.input<typeof addOnSchema>;
