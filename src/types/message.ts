import type { MessageChannel, MessageStatus, MessageTrigger } from "@/lib/messaging";

/** One row of `GET /api/v1/admin/messages`. */
export interface MessageLogEntry {
  id: string;
  trigger: MessageTrigger;
  channel: MessageChannel;
  status: MessageStatus;
  recipient: string;
  subject: string;
  /** Why it was skipped or failed; empty for a normal send. */
  reason: string;
  /** What it was about, for example "Order RW-1234". */
  refLabel: string;
  attempts: number;
  /** The account it went to, when the recipient has one. */
  customerName: string | null;
  createdAt: string;
  sentAt: string | null;
}

/** A `type`, not `z.input` of the query schema, since `z.coerce` inputs are `unknown`. */
export type MessageFilters = {
  page?: number;
  pageSize?: number;
  userId?: string;
  status?: MessageStatus;
  channel?: MessageChannel;
  trigger?: MessageTrigger;
  search?: string;
};
