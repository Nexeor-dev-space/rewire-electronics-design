import { z } from "zod";
import { MESSAGE_SEARCH_MAX_LENGTH } from "@/lib/constants";
import { MESSAGE_CHANNELS, MESSAGE_STATUSES, MESSAGE_TRIGGERS } from "@/lib/messaging";
import { idValidator, paginationQueryValidator } from "./common/primitives.validator";

export const messageListQuerySchema = paginationQueryValidator.extend({
  userId: idValidator.optional(),
  status: z.enum(MESSAGE_STATUSES).optional(),
  channel: z.enum(MESSAGE_CHANNELS).optional(),
  trigger: z.enum(MESSAGE_TRIGGERS).optional(),
  /** Matches the recipient, the subject or the record the message was about. */
  search: z.string().trim().max(MESSAGE_SEARCH_MAX_LENGTH).optional(),
});
